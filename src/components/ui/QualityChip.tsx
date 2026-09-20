import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

type QualityTone = 'good' | 'warning' | 'neutral';

type QualityChipProps = {
  label: string;
  value: string;
  tone?: QualityTone;
};

const toneStyles = {
  good: {
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
    borderColor: 'rgba(34, 197, 94, 0.20)',
    valueColor: '#22C55E',
  },
  warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.20)',
    valueColor: '#F59E0B',
  },
  neutral: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    valueColor: colors.textPrimary,
  },
};

export function QualityChip({label, value, tone = 'neutral'}: QualityChipProps) {
  const currentTone = toneStyles[tone];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: currentTone.backgroundColor,
          borderColor: currentTone.borderColor,
        },
      ]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, {color: currentTone.valueColor}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});