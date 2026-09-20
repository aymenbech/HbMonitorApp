import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {spacing} from '../../theme/spacing';

type StatusType = 'normal' | 'mild' | 'moderate' | 'severe';

type StatusBadgeProps = {
  status: StatusType;
};

const STATUS_MAP = {
  normal: {
    label: 'Normal',
    textColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  mild: {
    label: 'Mild',
    textColor: '#FACC15',
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
  },
  moderate: {
    label: 'Moderate',
    textColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  severe: {
    label: 'Severe',
    textColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
};

export function StatusBadge({status}: StatusBadgeProps) {
  const current = STATUS_MAP[status];

  return (
    <View style={[styles.badge, {backgroundColor: current.backgroundColor}]}>
      <Text style={[styles.text, {color: current.textColor}]}>{current.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});