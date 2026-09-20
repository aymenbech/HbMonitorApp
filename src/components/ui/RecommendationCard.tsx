import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {AppCard} from './AppCard';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

type RecommendationTone = 'neutral' | 'good' | 'warning' | 'danger';

type RecommendationCardProps = {
  title: string;
  message: string;
  tone?: RecommendationTone;
};

const toneStyles = {
  neutral: {
    borderColor: colors.border,
    accent: colors.primary,
    backgroundColor: colors.surface,
  },
  good: {
    borderColor: 'rgba(34, 197, 94, 0.25)',
    accent: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
  },
  warning: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
    accent: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  danger: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
    accent: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
};

export function RecommendationCard({
  title,
  message,
  tone = 'neutral',
}: RecommendationCardProps) {
  const currentTone = toneStyles[tone];

  return (
    <AppCard
      style={[
        styles.card,
        {
          borderColor: currentTone.borderColor,
          backgroundColor: currentTone.backgroundColor,
        },
      ]}>
      <View style={[styles.accent, {backgroundColor: currentTone.accent}]} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  accent: {
    width: 42,
    height: 6,
    borderRadius: 999,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});