import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

type InfoListItemProps = {
  label: string;
  value: string;
};

export function InfoListItem({label, value}: InfoListItemProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
});