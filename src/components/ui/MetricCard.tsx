import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {AppCard} from './AppCard';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  accentColor?: string;
};

export function MetricCard({
  label,
  value,
  helper,
  accentColor = colors.primary,
}: MetricCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={[styles.accent, {backgroundColor: accentColor}]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  accent: {
    width: 34,
    height: 6,
    borderRadius: 999,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});