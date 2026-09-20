import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {AppCard} from './AppCard';
import {StatusBadge} from './StatusBadge';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

type ResultStatus = 'normal' | 'mild' | 'moderate' | 'severe';

type ResultHeroCardProps = {
  status: ResultStatus;
  value: number;
  unit?: string;
  confidence: number;
  summary: string;
};

export function ResultHeroCard({
  status,
  value,
  unit = 'g/dL',
  confidence,
  summary,
}: ResultHeroCardProps) {
  return (
    <AppCard style={styles.card}>
      <StatusBadge status={status} />
      <Text style={styles.label}>Estimated Hemoglobin</Text>
      <Text style={styles.value}>
        {value} <Text style={styles.unit}>{unit}</Text>
      </Text>
      <Text style={styles.confidence}>Model confidence: {confidence}%</Text>
      <Text style={styles.summary}>{summary}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 42,
    fontWeight: '800',
  },
  unit: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  confidence: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
});