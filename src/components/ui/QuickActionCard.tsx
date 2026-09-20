import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {AppCard} from './AppCard';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

type QuickActionCardProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
};

export function QuickActionCard({
  title,
  subtitle,
  onPress,
}: QuickActionCardProps) {
  return (
    <Pressable onPress={onPress} style={({pressed}) => pressed && styles.pressed}>
      <AppCard style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
  },
  card: {
    minHeight: 110,
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});