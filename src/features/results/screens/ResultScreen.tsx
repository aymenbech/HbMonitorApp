// src/features/results/screens/ResultScreen.tsx

import React, {useMemo} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {useLanguage} from '../../../app/LanguageContext';
import {Screen} from '../../../components/Screen';
import {SectionHeader} from '../../../components/ui/SectionHeader';
import {AppCard} from '../../../components/ui/AppCard';
import {PrimaryButton} from '../../../components/ui/PrimaryButton';

import {colors} from '../../../theme/colors';
import {spacing} from '../../../theme/spacing';
import {typography} from '../../../theme/typography';

import type {
  AppStackParamList,
  ResultSeverity,
} from '../../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Result'>;

function formatHb(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(1)} g/dL`;
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value)}%`;
}

function getSeverityMeta(severity: ResultSeverity | null | undefined, t: (section: any, key: any) => string) {
  switch (severity) {
    case 'normal':
      return {
        title: t('result', 'normal'),
        color: '#1F8A4D',
        bg: '#EAF8F0',
        description: t('result', 'disclaimer'),
      };
    case 'mild':
      return {
        title: `${t('result', 'mild')} — ${t('result', 'status')}`,
        color: '#B7791F',
        bg: '#FFF7E8',
        description: t('result', 'disclaimer'),
      };
    case 'moderate':
      return {
        title: `${t('result', 'moderate')} — ${t('result', 'status')}`,
        color: '#C05621',
        bg: '#FFF1EC',
        description: t('result', 'disclaimer'),
      };
    case 'severe':
      return {
        title: `${t('result', 'severe')} — ${t('result', 'status')}`,
        color: '#C53030',
        bg: '#FFF0F0',
        description: t('result', 'disclaimer'),
      };
    default:
      return {
        title: t('common', 'error'),
        color: colors.textPrimary,
        bg: colors.surface,
        description: t('result', 'disclaimer'),
      };
  }
}

function getConfidenceLabel(confidence?: number | null) {
  if (typeof confidence !== 'number') return 'Unknown';
  if (confidence >= 85) return 'High';
  if (confidence >= 70) return 'Moderate';
  if (confidence >= 50) return 'Limited';
  return 'Low';
}

function getQualityLabel(score?: number | null) {
  if (typeof score !== 'number') return 'Unknown';
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export function ResultScreen({route, navigation}: Props) {
  const {imagePath, hbValue, confidence, severity, analysis} = route.params;

  const severityMeta = useMemo(() => getSeverityMeta(severity, t), [severity, t]);

  const engineLabel =
    analysis?.engine === 'colorimetric-regression'
      ? 'Colorimetric Regression'
      : 'Analysis Engine';

  const modelVersion = analysis?.modelVersion ?? '—';
  const qualityScore = analysis?.qualityScore ?? null;

  const roiCoverage =
    typeof analysis?.roiCoverage === 'number'
      ? `${(analysis.roiCoverage * 100).toFixed(1)}%`
      : '—';

  const meanR =
    typeof analysis?.colorFeatures?.meanR === 'number'
      ? analysis.colorFeatures.meanR.toFixed(2)
      : '—';

  const meanG =
    typeof analysis?.colorFeatures?.meanG === 'number'
      ? analysis.colorFeatures.meanG.toFixed(2)
      : '—';

  const meanB =
    typeof analysis?.colorFeatures?.meanB === 'number'
      ? analysis.colorFeatures.meanB.toFixed(2)
      : '—';

  const redRatio =
    typeof analysis?.colorFeatures?.redRatio === 'number'
      ? analysis.colorFeatures.redRatio.toFixed(4)
      : '—';

  const normalizedRedness =
    typeof analysis?.colorFeatures?.normalizedRedness === 'number'
      ? analysis.colorFeatures.normalizedRedness.toFixed(4)
      : '—';

  const confidenceLabel = getConfidenceLabel(confidence, t);
  const qualityLabel = getQualityLabel(qualityScore, t);

  return (
    <Screen scrollable>
      <SectionHeader
        title={t('result', 'title')}
        subtitle={t('scan', 'localProcessing')}
      />

      {imagePath ? (
        <AppCard style={styles.imageCard}>
          <Image
            source={{uri: `file://${imagePath}`}}
            style={styles.previewImage}
            resizeMode="cover"
          />
        </AppCard>
      ) : null}

      <AppCard style={[styles.heroCard, {backgroundColor: severityMeta.bg}]}>
        <Text style={[styles.heroLabel, {color: severityMeta.color}]}>
          {severityMeta.title}
        </Text>
        <Text style={styles.hbValue}>{formatHb(hbValue)}</Text>
        <Text style={styles.heroDescription}>{severityMeta.description}</Text>
      </AppCard>

      <AppCard style={styles.metricsCard}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{formatPercent(confidence)}</Text>
          <Text style={styles.metricLabel}>{t('result', 'confidence')}</Text>
          <Text style={styles.metricHint}>{confidenceLabel}</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {typeof qualityScore === 'number' ? qualityScore : '—'}
          </Text>
          <Text style={styles.metricLabel}>{t('scan', 'scanQuality')}</Text>
          <Text style={styles.metricHint}>{qualityLabel}</Text>
        </View>
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>{t('result', 'status')}</Text>
        <View style={styles.divider} />
        <InfoRow label={t('result', 'hemoglobin')} value={formatHb(hbValue)} />
        <InfoRow label={t('result', 'status')} value={severityMeta.title} />
        <InfoRow label={t('result', 'confidence')} value={formatPercent(confidence)} />
        <InfoRow label={t('scan', 'scanQuality')} value={qualityLabel} />
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>{t('scan', 'processing')}</Text>
        <View style={styles.divider} />
        <InfoRow label="Engine" value={engineLabel} />
        <InfoRow label="Model version" value={modelVersion} />
        <InfoRow label="ROI coverage" value={roiCoverage} />
        <InfoRow label="Mean R" value={meanR} />
        <InfoRow label="Mean G" value={meanG} />
        <InfoRow label="Mean B" value={meanB} />
        <InfoRow label="Red ratio" value={redRatio} />
        <InfoRow label="Normalized redness" value={normalizedRedness} />
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>{t('result', 'disclaimer')}</Text>
        <View style={styles.divider} />
        <Text style={styles.noteText}>
          {t('result', 'disclaimer')}
        </Text>
      </AppCard>

      <PrimaryButton
        title={t('result', 'newScan')}
        onPress={() => navigation.navigate('MainTabs')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  imageCard: {
    marginBottom: spacing.lg,
    padding: spacing.sm,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroLabel: {
    ...typography.bodySM,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  hbValue: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  heroDescription: {
    ...typography.bodySM,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  metricsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.border,
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    ...typography.bodySM,
    color: colors.textSecondary,
  },
  metricHint: {
    ...typography.bodySM,
    color: colors.primary,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs ?? 4,
  },
  infoLabel: {
    ...typography.bodySM,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyMD,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '55%',
    textAlign: 'right',
  },
  noteText: {
    ...typography.bodySM,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});