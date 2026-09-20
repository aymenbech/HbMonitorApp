import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

type InsightTone = 'neutral' | 'good' | 'warning';

type InsightRowProps = {
  label: string;
  value: string;
  tone?: InsightTone;
};

const toneMap = {
  neutral: colors.textPrimary,
  good: '#22C55E',
  warning: '#F59E0B',
};

export function InsightRow({
  label,
  value,
  tone = 'neutral',
}: InsightRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, {color: toneMap[tone]}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
    paddingRight: spacing.md,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
  },
});