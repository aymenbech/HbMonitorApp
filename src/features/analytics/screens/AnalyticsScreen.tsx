// src/features/analytics/screens/AnalyticsScreen.tsx

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import {Screen} from '../../../components/Screen';
import {SectionHeader} from '../../../components/ui/SectionHeader';
import {AppCard} from '../../../components/ui/AppCard';
import {MetricCard} from '../../../components/ui/MetricCard';
import {InsightRow} from '../../../components/ui/InsightRow';

import {useAuth} from '../../../app/AuthContext';
import {useLanguage} from '../../../app/LanguageContext';
import {calculateAgeInfo} from '../../../analysis/interpretation/demographicResolver';
import {supabase} from '../../../lib/supabase';
import {colors} from '../../../theme/colors';
import {spacing} from '../../../theme/spacing';
import {typography} from '../../../theme/typography';

type SexType = 'male' | 'female';
type PregnancyStatus = 'not_pregnant' | 'pregnant' | 'unknown';

type HbResult = {
  hb_value: number;
  anemia_severity: string;
  result_at: string;
};

type MedicalProfile = {
  sex: SexType | null;
  pregnancy_status: PregnancyStatus | null;
  date_of_birth: string | null;
};

type AnalyticsData = {
  totalScans: number;
  weeklyAvg: number | null;
  highestHb: number | null;
  lowestHb: number | null;
  avgQualityScore: number | null;
  avgConfidenceScore: number | null;
  recentResults: HbResult[];
  prevWeekAvg: number | null;
  medicalProfile: MedicalProfile | null;
  latestSeverity: string | null;
};

function formatHb(val: number | null): string {
  if (val === null) return '—';
  return `${Number(val).toFixed(1)}`;
}

function getTrend(current: number | null, previous: number | null): string {
  if (current === null || previous === null) return 'No comparison yet';
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return 'Stable compared to last week';
  const direction = diff > 0 ? '↑' : '↓';
  return `${direction} ${Math.abs(diff).toFixed(1)} g/dL vs last week`;
}

function getQualityLabel(score: number | null): string {
  if (score === null) return '—';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Poor';
}

function getQualityTone(
  score: number | null,
): 'good' | 'warning' | 'neutral' {
  if (score === null) return 'neutral';
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'warning';
}

function getWeekStart(weeksAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeksAgo * 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getDemographicSummary(profile: MedicalProfile | null, t: (section: any, key: any) => string): string {
  if (!profile?.sex) return t('profile', 'unknown');
  if (profile.sex === 'male') return t('profile', 'male');
  if (profile.pregnancy_status === 'pregnant') return `${t('profile', 'pregnant')} ${t('profile', 'female')}`;
  return t('profile', 'female');
}

function getMedicalProfileStatus(profile: MedicalProfile | null): {
  isComplete: boolean;
  label: string;
  message: string;
} {
  if (!profile?.sex) {
    return {
      isComplete: false,
      label: 'Incomplete',
      message: 'Biological sex is missing.',
    };
  }

  if (!profile?.date_of_birth) {
    return {
      isComplete: false,
      label: 'Incomplete',
      message: 'Date of birth is missing.',
    };
  }

  if (profile.sex === 'female' && !profile.pregnancy_status) {
    return {
      isComplete: false,
      label: 'Incomplete',
      message: 'Pregnancy status is missing.',
    };
  }

  return {
    isComplete: true,
    label: 'Complete',
    message: 'Health profile is complete.',
  };
}

function getSeverityTone(
  severity: string | null,
): 'good' | 'warning' | 'neutral' {
  if (!severity) return 'neutral';
  if (severity === 'normal') return 'good';
  return 'warning';
}

function TrendBars({results}: {results: HbResult[]}) {
  if (results.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>{t('home', 'noResults')}</Text>
      </View>
    );
  }

  const values = results.map(r => Number(r.hb_value));
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const MAX_HEIGHT = 120;
  const MIN_HEIGHT = 16;

  return (
    <View style={styles.chartPlaceholder}>
      {results.slice(-8).map((r, i) => {
        const normalized = (Number(r.hb_value) - min) / range;
        const barHeight = MIN_HEIGHT + normalized * (MAX_HEIGHT - MIN_HEIGHT);
        const severity = r.anemia_severity;
        const barColor =
          severity === 'normal'
            ? '#22C55E'
            : severity === 'mild'
            ? colors.primary
            : severity === 'moderate'
            ? '#F59E0B'
            : '#EF4444';

        return (
          <View key={`${r.result_at}-${i}`} style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                {height: barHeight, backgroundColor: barColor},
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

export function AnalyticsScreen() {
  const {user} = useAuth();

  const [data, setData] = useState<AnalyticsData>({
    totalScans: 0,
    weeklyAvg: null,
    highestHb: null,
    lowestHb: null,
    avgQualityScore: null,
    avgConfidenceScore: null,
    recentResults: [],
    prevWeekAvg: null,
    medicalProfile: null,
    latestSeverity: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);

      const thisWeekStart = getWeekStart(0);
      const lastWeekStart = getWeekStart(1);

      const [
        totalRes,
        weeklyRes,
        lastWeekRes,
        allTimeRes,
        qualityRes,
        recentRes,
        medicalRes,
        confidenceRes,
        latestResultRes,
      ] = await Promise.all([
        supabase
          .from('scan_sessions')
          .select('id', {count: 'exact', head: true})
          .eq('user_id', user.id),

        supabase
          .from('hemoglobin_results')
          .select('hb_value')
          .eq('user_id', user.id)
          .gte('result_at', thisWeekStart),

        supabase
          .from('hemoglobin_results')
          .select('hb_value')
          .eq('user_id', user.id)
          .gte('result_at', lastWeekStart)
          .lt('result_at', thisWeekStart),

        supabase
          .from('hemoglobin_results')
          .select('hb_value')
          .eq('user_id', user.id),

        supabase
          .from('image_quality_assessments')
          .select('overall_score')
          .eq('user_id', user.id),

        supabase
          .from('hemoglobin_results')
          .select('hb_value, anemia_severity, result_at')
          .eq('user_id', user.id)
          .order('result_at', {ascending: true})
          .limit(8),

        supabase
          .from('patient_medical_profiles')
          .select('sex, pregnancy_status, date_of_birth')
          .eq('user_id', user.id)
          .maybeSingle(),

        supabase
          .from('model_inferences')
          .select('confidence_score')
          .eq('user_id', user.id),

        supabase
          .from('hemoglobin_results')
          .select('anemia_severity')
          .eq('user_id', user.id)
          .order('result_at', {ascending: false})
          .limit(1),
      ]);

      const weeklyValues = (weeklyRes.data ?? []).map(r => Number(r.hb_value));
      const weeklyAvg =
        weeklyValues.length > 0
          ? weeklyValues.reduce((a, b) => a + b, 0) / weeklyValues.length
          : null;

      const prevValues = (lastWeekRes.data ?? []).map(r => Number(r.hb_value));
      const prevWeekAvg =
        prevValues.length > 0
          ? prevValues.reduce((a, b) => a + b, 0) / prevValues.length
          : null;

      const allValues = (allTimeRes.data ?? []).map(r => Number(r.hb_value));
      const highestHb = allValues.length > 0 ? Math.max(...allValues) : null;
      const lowestHb = allValues.length > 0 ? Math.min(...allValues) : null;

      const qualityScores = (qualityRes.data ?? [])
        .map(r => Number(r.overall_score))
        .filter(v => Number.isFinite(v));
      const avgQualityScore =
        qualityScores.length > 0
          ? Math.round(
              qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length,
            )
          : null;

      const confidenceScores = (confidenceRes.data ?? [])
        .map(r => Number(r.confidence_score) * 100)
        .filter(v => Number.isFinite(v));
      const avgConfidenceScore =
        confidenceScores.length > 0
          ? Math.round(
              confidenceScores.reduce((a, b) => a + b, 0) /
                confidenceScores.length,
            )
          : null;

      setData({
        totalScans: totalRes.count ?? 0,
        weeklyAvg,
        highestHb,
        lowestHb,
        avgQualityScore,
        avgConfidenceScore,
        recentResults: recentRes.data ?? [],
        prevWeekAvg,
        medicalProfile: medicalRes.data ?? null,
        latestSeverity: latestResultRes.data?.[0]?.anemia_severity ?? null,
      });
    } catch (err: any) {
      console.error('AnalyticsScreen: fetchAnalytics error', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ✅ استدعاء الـ useMemo قبل أي return
  const ageInfo = useMemo(() => calculateAgeInfo(data.medicalProfile?.date_of_birth ?? null), [data.medicalProfile]);

  const demographicSummary = useMemo(
    () => getDemographicSummary(data.medicalProfile),
    [data.medicalProfile],
  );

  const medicalStatus = useMemo(
    () => getMedicalProfileStatus(data.medicalProfile),
    [data.medicalProfile],
  );

  // ✅ التحقق من التحميل بعد تشغيل جميع الـ Hooks
  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const {
    totalScans,
    weeklyAvg,
    highestHb,
    lowestHb,
    avgQualityScore,
    avgConfidenceScore,
    recentResults,
    prevWeekAvg,
    latestSeverity,
  } = data;

  const trend = getTrend(weeklyAvg, prevWeekAvg);

  return (
    <Screen scrollable refreshing={isRefreshing} onRefresh={onRefresh}>
      <SectionHeader
        title={t('analytics', 'title')}
        subtitle={t('analytics', 'history')}
      />

      {error ? (
        <AppCard style={styles.alertCard}>
          <Text style={styles.alertTitle}>⚠️ Data Load Error</Text>
          <Text style={styles.alertText}>{error}</Text>
        </AppCard>
      ) : null}

      <View style={styles.metricRow}>
        <MetricCard
          label={t('analytics', 'average')}
          value={formatHb(weeklyAvg)}
          helper={t('result', 'unit')}
          accentColor="#22C55E"
        />
        <MetricCard
          label={t('analytics', 'totalScans')}
          value={`${totalScans}`}
          helper="all recorded sessions"
          accentColor={colors.primary}
        />
      </View>

      <View style={styles.metricRow}>
        <MetricCard
          label={t('scan', 'scanQuality')}
          value={
            avgQualityScore !== null ? `${avgQualityScore}%` : '—'
          }
          helper={getQualityLabel(avgQualityScore)}
          accentColor="#F59E0B"
        />
        <MetricCard
          label={t('result', 'confidence')}
          value={
            avgConfidenceScore !== null ? `${avgConfidenceScore}%` : '—'
          }
          helper={t('result', 'confidence')}
          accentColor="#22C55E"
        />
      </View>

      <AppCard style={styles.chartCard}>
        <Text style={styles.cardTitle}>{t('analytics', 'history')}</Text>
        <TrendBars results={recentResults} />
        <Text style={styles.chartNote}>
          {recentResults.length > 0
            ? `${recentResults.length} — ${t('analytics', 'history')}`
            : t('home', 'noResults')}
        </Text>
      </AppCard>

      <AppCard style={styles.insightCard}>
        <Text style={styles.cardTitle}>{t('analytics', 'average')}</Text>

        <InsightRow
          label="Highest reading"
          value={highestHb !== null ? `${formatHb(highestHb)} g/dL` : 'No data'}
          tone={highestHb !== null ? 'good' : 'neutral'}
        />

        <InsightRow
          label="Lowest reading"
          value={lowestHb !== null ? `${formatHb(lowestHb)} g/dL` : 'No data'}
          tone={lowestHb !== null && lowestHb < 11 ? 'warning' : 'good'}
        />

        <InsightRow
          label="Image quality avg"
          value={
            avgQualityScore !== null
              ? `${getQualityLabel(avgQualityScore)} (${avgQualityScore}%)`
              : 'No data'
          }
          tone={getQualityTone(avgQualityScore)}
        />

        <InsightRow
          label="Weekly average"
          value={weeklyAvg !== null ? `${formatHb(weeklyAvg)} g/dL` : 'No data'}
          tone={weeklyAvg !== null && weeklyAvg >= 11 ? 'good' : 'warning'}
        />

        <InsightRow
          label="Latest severity"
          value={latestSeverity ?? 'No data'}
          tone={getSeverityTone(latestSeverity)}
        />
      </AppCard>

      <AppCard style={styles.insightCard}>
        <Text style={styles.cardTitle}>{t('profile', 'medicalProfile')}</Text>

        <InsightRow
          label={t('child', 'ageGroup')}
          value={demographicSummary}
        />
        <InsightRow
          label={t('child', 'age')}
          value={ageInfo ? `${ageInfo.years} ${t('child', 'years')} (${ageInfo.monthsTotal} ${t('child', 'months')})` : t('profile', 'unknown')}
        />

        <InsightRow
          label="Profile status"
          value={medicalStatus.label}
          tone={medicalStatus.isComplete ? 'good' : 'warning'}
        />

        <InsightRow
          label="Profile note"
          value={medicalStatus.message}
          tone={medicalStatus.isComplete ? 'good' : 'neutral'}
        />
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>{t('analytics', 'history')}</Text>
        <Text style={styles.paragraph}>{trend}</Text>

        {totalScans === 0 && (
          <Text style={[styles.paragraph, {marginTop: spacing.sm}]}>
            Start your first scan to begin tracking your hemoglobin trends over
            time.
          </Text>
        )}
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCard: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  alertTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  alertText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  chartCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  chartPlaceholder: {
    height: 160,
    borderRadius: 18,
    backgroundColor: '#0A0F1D',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  chartEmpty: {
    height: 160,
    borderRadius: 18,
    backgroundColor: '#0A0F1D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  chartEmptyText: {
    ...typography.bodySM,
    color: colors.textSecondary,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 3,
  },
  bar: {
    width: '100%',
    borderRadius: 999,
    opacity: 0.9,
  },
  chartNote: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  insightCard: {
    marginBottom: spacing.lg,
  },
  paragraph: {
    ...typography.bodyMD,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});