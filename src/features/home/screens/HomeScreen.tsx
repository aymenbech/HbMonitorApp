// src/features/home/screens/HomeScreen.tsx

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
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
import {useLanguage} from '../../../app/LanguageContext';
import {supabase} from '../../../lib/supabase';
import {calculateAgeInfo} from '../../../analysis/interpretation/demographicResolver';
import {loadLocalScanHistory, type LocalScanRecord} from '../../scan/services/localScanHistory';

import type {MainTabParamList, ResultSeverity} from '../../../navigation/types';

type SexType = 'male' | 'female';
type PregnancyStatus = 'not_pregnant' | 'pregnant' | 'unknown';

type MedicalProfile = {
  sex: SexType | null;
  pregnancy_status: PregnancyStatus | null;
  date_of_birth: string | null;
};

type HomeData = {
  fullName: string | null;
  latestResult: LocalScanRecord | null;
  totalScans: number;
  medicalProfile: MedicalProfile | null;
};

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

function formatDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getFirstName(fullName: string | null): string {
  return fullName?.trim().split(/\s+/)[0] || 'there';
}

function getMedicalProfileStatus(profile: MedicalProfile | null) {
  if (!profile?.sex) {
    return {isComplete: false, message: 'Add biological sex to your profile.'};
  }
  if (!profile.date_of_birth) {
    return {isComplete: false, message: 'Add your date of birth to your profile.'};
  }

  const ageYears = calculateAgeInfo(profile.date_of_birth)?.years ?? 0;
  if (profile.sex === 'female' && ageYears >= 15 && !profile.pregnancy_status) {
    return {isComplete: false, message: 'Add pregnancy status to your profile.'};
  }

  return {isComplete: true, message: 'Your health profile is complete.'};
}

function getDemographicSummary(profile: MedicalProfile | null): string {
  if (!profile?.sex) return 'Not set';
  if (profile.sex === 'male') return 'Adult male';
  if (profile.pregnancy_status === 'pregnant') return 'Pregnant female';
  return 'Adult female';
}

type Translate = ReturnType<typeof useLanguage>['t'];

function severityLabel(
  severity: ResultSeverity | null | undefined,
  t: Translate,
) {
  if (!severity) return t('home', 'noResults');
  return t('result', severity);
}

export function HomeScreen({navigation}: Props) {
  const {user} = useAuth();
  const {language, t} = useLanguage();
  const locale = language === 'ar' ? 'ar-DZ' : 'en-US';

  const [fullName, setFullName] = useState<string | null>(null);
  const [medicalProfile, setMedicalProfile] = useState<MedicalProfile | null>(null);
  const [history, setHistory] = useState<LocalScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setFullName(null);
      setMedicalProfile(null);
      setHistory([]);
      setIsLoading(false);
      return;
    }

    try {
      const [profileRes, medicalRes, localHistory] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase
          .from('patient_medical_profiles')
          .select('sex,pregnancy_status,date_of_birth')
          .eq('user_id', user.id)
          .maybeSingle(),
        loadLocalScanHistory(user.id),
      ]);

      if (profileRes.error) {
        console.warn('Home profile load failed:', profileRes.error.message);
      }
      if (medicalRes.error) {
        console.warn('Home medical profile load failed:', medicalRes.error.message);
      }

      setFullName(profileRes.data?.full_name ?? null);
      setMedicalProfile(medicalRes.data ?? null);
      setHistory(localHistory);
    } catch (error) {
      console.error('Home load error:', error);
      setHistory(await loadLocalScanHistory(user.id).catch(() => []));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const medicalStatus = useMemo(
    () => getMedicalProfileStatus(medicalProfile),
    [medicalProfile],
  );
  const demographic = useMemo(
    () => getDemographicSummary(medicalProfile),
    [medicalProfile],
  );

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const latestResult = history[0] ?? null;
  const severity = latestResult?.severity ?? null;
  const hbDisplay = latestResult ? latestResult.hbValue.toFixed(1) : '—';
  const confidenceDisplay = latestResult ? `${latestResult.confidence}%` : '—';

  return (
    <Screen scrollable refreshing={false} onRefresh={load}>
      <SectionHeader
        title={`Welcome back, ${getFirstName(fullName)}`}
        subtitle={t('home', 'subtitle')}
      />

      {!medicalStatus.isComplete ? (
        <AppCard style={styles.alertCard}>
          <Text style={styles.alertTitle}>{t('profile', 'medicalProfile')}</Text>
          <Text style={styles.alertText}>{medicalStatus.message}</Text>
          <QuickActionCard
            title={t('profile', 'settings')}
            subtitle={t('profile', 'medicalProfile')}
            onPress={() => navigation.navigate('Profile')}
          />
        </AppCard>
      ) : null}

      <View style={styles.metricRow}>
        <MetricCard
          label={t('result', 'hemoglobin')}
          value={hbDisplay}
          helper={t('result', 'unit')}
          accentColor={colors.primary}
        />
        <MetricCard
          label={t('result', 'confidence')}
          value={confidenceDisplay}
          helper={t('result', 'confidence')}
          accentColor="#22C55E"
        />
      </View>

      <AppCard style={styles.highlightCard}>
        <StatusBadge status={severity ?? 'normal'} />
        <Text style={styles.highlightLabel}>{t('home', 'latestResult')}</Text>
        <Text style={styles.highlightValue}>
          {latestResult ? `${hbDisplay} ${t('result', 'unit')}` : t('home', 'noResults')}
        </Text>
        <Text style={styles.highlightMeta}>
          {latestResult
            ? `${severityLabel(severity, t)} • ${formatDate(latestResult.takenAt, locale)}`
            : t('home', 'startScan')}
        </Text>
      </AppCard>

      <Text style={styles.sectionTitle}>{t('home', 'startScan')}</Text>
      <View style={styles.quickActions}>
        <QuickActionCard
          title={t('home', 'startScan')}
          subtitle={t('scan', 'subtitle')}
          onPress={() => navigation.navigate('Scan')}
        />
        <QuickActionCard
          title={t('analytics', 'title')}
          subtitle={t('analytics', 'history')}
          onPress={() => navigation.navigate('Analytics')}
        />
        <QuickActionCard
          title={t('profile', 'title')}
          subtitle={t('profile', 'medicalProfile')}
          onPress={() => navigation.navigate('Profile')}
        />
      </View>

      <AppCard>
        <Text style={styles.sectionTitle}>{t('analytics', 'title')}</Text>
        <InsightRow
          label={t('result', 'status')}
          value={severityLabel(severity, t)}
          tone={severity === 'normal' ? 'good' : 'neutral'}
        />
        <InsightRow
          label={t('profile', 'patientType')}
          value={demographic}
        />
        <InsightRow
          label={t('analytics', 'totalScans')}
          value={String(history.length)}
        />
        {latestResult ? (
          <InsightRow
            label={t('result', 'confidence')}
            value={`${latestResult.confidence}%`}
          />
        ) : null}
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
