// src/features/home/screens/HomeScreen.tsx

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';

import {Screen} from '../../../components/Screen';
import {SectionHeader} from '../../../components/ui/SectionHeader';
import {AppCard} from '../../../components/ui/AppCard';
import {StatusBadge} from '../../../components/ui/StatusBadge';
import {MetricCard} from '../../../components/ui/MetricCard';
import {QuickActionCard} from '../../../components/ui/QuickActionCard';
import {InsightRow} from '../../../components/ui/InsightRow';

import {colors} from '../../../theme/colors';
import {spacing} from '../../../theme/spacing';

import {useAuth} from '../../../app/AuthContext';
import {supabase} from '../../../lib/supabase';
import type {MainTabParamList, ResultSeverity} from '../../../navigation/types';

type SexType = 'male' | 'female';
type PregnancyStatus = 'not_pregnant' | 'pregnant' | 'unknown';

type LatestResult = {
  hb_value: number;
  anemia_severity: ResultSeverity;
  result_label_en: string | null;
  recommendation_en: string | null;
  result_at: string;
};

type MedicalProfile = {
  sex: SexType | null;
  pregnancy_status: PregnancyStatus | null;
  date_of_birth: string | null;
};

type HomeData = {
  fullName: string | null;
  latestResult: LatestResult | null;
  totalScans: number;
  latestConfidence: number | null;
  medicalProfile: MedicalProfile | null;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

function getFirstName(fullName: string | null): string {
  if (!fullName) return 'there';
  return fullName.trim().split(' ')[0] || 'there';
}

function getMedicalProfileStatus(profile: MedicalProfile | null): {
  isComplete: boolean;
  message: string;
} {
  if (!profile?.sex) {
    return {
      isComplete: false,
      message: 'Add biological sex to enable more accurate Hb interpretation.',
    };
  }

  if (!profile?.date_of_birth) {
    return {
      isComplete: false,
      message: 'Add date of birth to complete your health profile.',
    };
  }

  if (profile.sex === 'female' && !profile.pregnancy_status) {
    return {
      isComplete: false,
      message: 'Add pregnancy status to complete your health profile.',
    };
  }

  return {
    isComplete: true,
    message: 'Your health profile is complete.',
  };
}

function getDemographicSummary(profile: MedicalProfile | null): string {
  if (!profile?.sex) return 'Not set';

  if (profile.sex === 'male') {
    return 'Adult male';
  }

  if (profile.pregnancy_status === 'pregnant') {
    return 'Pregnant female';
  }

  return 'Adult female';
}

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const {user} = useAuth();

  const [data, setData] = useState<HomeData>({
    fullName: null,
    latestResult: null,
    totalScans: 0,
    latestConfidence: null,
    medicalProfile: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHomeData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);

      const [profileRes, latestResultsRes, latestInferenceRes, scansRes, medicalRes] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single(),

          supabase
            .from('hemoglobin_results')
            .select(
              'hb_value, anemia_severity, result_label_en, recommendation_en, result_at',
            )
            .eq('user_id', user.id)
            .order('result_at', {ascending: false})
            .limit(1),

          supabase
            .from('model_inferences')
            .select('confidence_score')
            .eq('user_id', user.id)
            .order('inferred_at', {ascending: false})
            .limit(1),

          supabase
            .from('scan_sessions')
            .select('id', {count: 'exact', head: true})
            .eq('user_id', user.id),

          supabase
            .from('patient_medical_profiles')
            .select('sex, pregnancy_status, date_of_birth')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

      const latestResult = latestResultsRes.data?.[0] ?? null;
      const latestConfidence =
        latestInferenceRes.data?.[0]?.confidence_score ?? null;

      setData({
        fullName: profileRes.data?.full_name ?? null,
        latestResult,
        totalScans: scansRes.count ?? 0,
        latestConfidence,
        medicalProfile: medicalRes.data ?? null,
      });
    } catch (err: any) {
      console.error('HomeScreen: fetchHomeData error', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchHomeData();
  }, [fetchHomeData]);

  // ✅ استدعاء الـ useMemo قبل أي return أو if statement
  const medicalStatus = useMemo(
    () => getMedicalProfileStatus(data.medicalProfile),
    [data.medicalProfile],
  );

  const demographicSummary = useMemo(
    () => getDemographicSummary(data.medicalProfile),
    [data.medicalProfile],
  );

  // ✅ الآن يمكن وضع شرط التحميل بأمان تام
  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const {fullName, latestResult, totalScans, latestConfidence} = data;

  const hbDisplay = latestResult
    ? `${Number(latestResult.hb_value).toFixed(1)}`
    : '—';

  const confidenceDisplay =
    latestConfidence !== null && latestConfidence !== undefined
      ? `${Math.round(Number(latestConfidence) * 100)}%`
      : '—';

  const severity = (latestResult?.anemia_severity ?? 'normal') as ResultSeverity;

  return (
    <Screen scrollable>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: spacing.xl}}>
        <SectionHeader
          title={`Welcome back, ${getFirstName(fullName)}`}
          subtitle="Monitor your latest hemoglobin activity at a glance"
        />

        {error ? (
          <AppCard style={styles.alertCard}>
            <Text style={styles.alertTitle}>⚠️ Data Load Error</Text>
            <Text style={styles.alertText}>{error}</Text>
          </AppCard>
        ) : null}

        {!medicalStatus.isComplete ? (
          <AppCard style={styles.alertCard}>
            <Text style={styles.alertTitle}>Complete your health profile</Text>
            <Text style={styles.alertText}>{medicalStatus.message}</Text>
            <View style={styles.alertActions}>
              <QuickActionCard
                title="Open Profile"
                subtitle="Add sex, age, and pregnancy details"
                onPress={() => navigation.navigate('Profile')}
              />
            </View>
          </AppCard>
        ) : null}

        <View style={styles.metricRow}>
          <MetricCard
            label="Latest Hb"
            value={hbDisplay}
            helper="g/dL current reading"
            accentColor={colors.primary}
          />
          <MetricCard
            label="Confidence"
            value={confidenceDisplay}
            helper="model confidence"
            accentColor="#22C55E"
          />
        </View>

        <AppCard style={styles.highlightCard}>
          <StatusBadge status={severity} />
          <Text style={styles.highlightLabel}>Latest Reading</Text>
          <Text style={styles.highlightValue}>
            {latestResult ? `${hbDisplay} g/dL` : 'No scans yet'}
          </Text>
          <Text style={styles.highlightMeta}>
            {latestResult
              ? latestResult.result_label_en ??
                `Recorded on ${formatDate(latestResult.result_at)}`
              : 'Start your first scan to see results here.'}
          </Text>
        </AppCard>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionCard
            title="Start New Scan"
            subtitle="Capture a guided sample image"
            onPress={() => navigation.navigate('Scan')}
          />
          <QuickActionCard
            title="View Trends"
            subtitle="Open analytics and weekly insights"
            onPress={() => navigation.navigate('Analytics')}
          />
          <QuickActionCard
            title="Update Profile"
            subtitle="Review age, sex, and pregnancy data"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>

        <AppCard>
          <Text style={styles.sectionTitle}>Summary</Text>

          <InsightRow
            label="Reading status"
            value={latestResult?.anemia_severity ?? 'No data'}
            tone={latestResult?.anemia_severity === 'normal' ? 'good' : 'neutral'}
          />

          <InsightRow
            label="Demographic profile"
            value={demographicSummary}
          />

          <InsightRow
            label="Profile status"
            value={medicalStatus.isComplete ? 'Complete' : 'Incomplete'}
            tone={medicalStatus.isComplete ? 'good' : 'neutral'}
          />

          <InsightRow
            label="Total scans"
            value={
              totalScans > 0
                ? `${totalScans} session${totalScans > 1 ? 's' : ''}`
                : 'None yet'
            }
          />

          {latestResult?.recommendation_en ? (
            <InsightRow
              label="Recommendation"
              value={latestResult.recommendation_en}
            />
          ) : null}

          {latestResult ? (
            <InsightRow
              label="Last scan date"
              value={formatDate(latestResult.result_at)}
            />
          ) : null}
        </AppCard>
      </ScrollView>
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
  alertActions: {
    marginTop: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  highlightCard: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  highlightLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  highlightValue: {
    color: colors.textPrimary,
    fontSize: 38,
    fontWeight: '800',
  },
  highlightMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  quickActions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
});