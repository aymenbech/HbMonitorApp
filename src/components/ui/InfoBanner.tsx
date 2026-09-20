import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

type InfoBannerProps = {
  title: string;
  description: string;
};

export function InfoBanner({title, description}: InfoBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 77, 125, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 125, 0.18)',
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});