import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';

type CameraGuideOverlayProps = {
  title?: string;
  subtitle?: string;
};

export function CameraGuideOverlay({
  title = 'Align the sample inside the frame',
  subtitle = 'Keep the camera steady and avoid shadows',
}: CameraGuideOverlayProps) {
  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.frameWrapper}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          <View style={styles.centerContent}>
            <View style={styles.innerMarker} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const STROKE = 3;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  frameWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  frame: {
    width: '100%',
    maxWidth: 300,
    height: 230,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  innerMarker: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 14,
    left: 14,
    borderTopWidth: STROKE,
    borderLeftWidth: STROKE,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 14,
    right: 14,
    borderTopWidth: STROKE,
    borderRightWidth: STROKE,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 14,
    left: 14,
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 14,
    right: 14,
    borderBottomWidth: STROKE,
    borderRightWidth: STROKE,
    borderBottomRightRadius: 12,
  },
});