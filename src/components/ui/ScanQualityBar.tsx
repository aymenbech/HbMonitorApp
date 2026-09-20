import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {AppCard} from './AppCard';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

type ScanQualityBarProps = {
  score: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getQuality(score: number) {
  if (score >= 80) {
    return {label: 'Excellent', color: '#22C55E'};
  }
  if (score >= 60) {
    return {label: 'Good', color: '#84CC16'};
  }
  if (score >= 40) {
    return {label: 'Fair', color: '#F59E0B'};
  }
  return {label: 'Poor', color: '#EF4444'};
}

export function ScanQualityBar({score}: ScanQualityBarProps) {
  const normalizedScore = clamp(score, 0, 100);
  const quality = getQuality(normalizedScore);

  return (
    <AppCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Scan Quality</Text>
        <Text style={[styles.qualityLabel, {color: quality.color}]}>
          {quality.label}
        </Text>
      </View>

      <View style={styles.barWrapper}>
        <LinearGradient
          colors={['#FF5C8A', '#F59E0B', '#84CC16', '#22C55E']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.gradientTrack}
        />
        <View
          style={[
            styles.mask,
            {
              width: `${100 - normalizedScore}%`,
            },
          ]}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  qualityLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  barWrapper: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#2C3444',
    position: 'relative',
  },
  gradientTrack: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
  },
  mask: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#2C3444',
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
});