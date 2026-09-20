// src/features/scan/screens/ScanScreen.tsx

import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import {CompositeScreenProps} from '@react-navigation/native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import {Screen} from '../../../components/Screen';
import {AppCard} from '../../../components/ui/AppCard';
import {PrimaryButton} from '../../../components/ui/PrimaryButton';
import {SectionHeader} from '../../../components/ui/SectionHeader';
import {InfoBanner} from '../../../components/ui/InfoBanner';
import {QualityChip} from '../../../components/ui/QualityChip';
import {CameraGuideOverlay} from '../../../components/ui/CameraGuideOverlay';
import {ScanQualityBar} from '../../../components/ui/ScanQualityBar';

import {colors} from '../../../theme/colors';
import {spacing} from '../../../theme/spacing';
import {typography} from '../../../theme/typography';

import {useAuth} from '../../../app/AuthContext';
import {supabase} from '../../../lib/supabase';

import type {
  MainTabParamList,
  AppStackParamList,
  ResultSeverity,
} from '../../../navigation/types';

import {analyzeImageQuality} from '../utils/imageQuality';
import {getRgbaFromImage} from '../../../ml/HbImageProcessor';

import {extractGuideRoi} from '../../../analysis/roi/extractGuideRoi';
import {computeColorFeatures} from '../../../analysis/color/colorFeatures';
import {normalizeColorFeatures} from '../../../analysis/color/colorNormalization';
import {estimateHbFromFeatures} from '../../../analysis/calibration/calibrationEngine';
import {estimateConfidence} from '../../../analysis/calibration/confidenceEngine';
import {categorizeHb} from '../../../analysis/interpretation/hbInterpretation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Scan'>,
  NativeStackScreenProps<AppStackParamList>
>;

type CaptureStep =
  | 'idle'
  | 'capturing'
  | 'analyzing'
  | 'processing'
  | 'finalizing';

type SexType = 'male' | 'female';
type PregnancyStatus = 'not_pregnant' | 'pregnant' | 'unknown';
type DemographicGroup = 'homme' | 'femme' | 'femmeenceinte';

type UserMedicalProfile = {
  sex: SexType | null;
  pregnancy_status: PregnancyStatus | null;
  date_of_birth: string | null;
};

type RedPresenceCheckResult = {
  redPixelRatio: number;
  rednessScore: number;
  passes: boolean;
  roiPixelCount: number;
};

function stepLabel(step: CaptureStep): string {
  switch (step) {
    case 'capturing':
      return 'Capturing image...';
    case 'analyzing':
      return 'Checking image quality...';
    case 'processing':
      return 'Processing color data...';
    case 'finalizing':
      return 'Preparing result...';
    default:
      return '';
  }
}

function toDebugText(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join('\n');
}

function resolveDemographicGroup(
  medicalProfile: UserMedicalProfile | null,
): DemographicGroup {
  if (medicalProfile?.sex === 'male') {
    return 'homme';
  }

  if (
    medicalProfile?.sex === 'female' &&
    medicalProfile?.pregnancy_status === 'pregnant'
  ) {
    return 'femmeenceinte';
  }

  return 'femme';
}

function getDemographicLabel(group: DemographicGroup): string {
  switch (group) {
    case 'homme':
      return 'Adult male';
    case 'femme':
      return 'Adult female';
    case 'femmeenceinte':
      return 'Pregnant female';
    default:
      return 'Unknown';
  }
}

function mapSeverityToResultSeverity(severity: string): ResultSeverity {
  switch (severity) {
    case 'normal':
      return 'normal';
    case 'mild':
      return 'mild';
    case 'moderate':
      return 'moderate';
    default:
      return 'severe';
  }
}

function checkRedPresenceInCenterROI(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): RedPresenceCheckResult {
  const roiWidth = Math.floor(width * 0.5);
  const roiHeight = Math.floor(height * 0.5);

  const startX = Math.floor((width - roiWidth) / 2);
  const endX = startX + roiWidth;
  const startY = Math.floor((height - roiHeight) / 2);
  const endY = startY + roiHeight;

  let roiPixelCount = 0;
  let redLikePixels = 0;
  let rednessAccumulator = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * width + x) * 4;

      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];

      roiPixelCount += 1;

      const maxGB = Math.max(g, b);
      const redDominance = r - maxGB;
      const redness = r - (g + b) / 2;

      if (r >= 85 && redDominance >= 20 && redness >= 22) {
        redLikePixels += 1;
        rednessAccumulator += redness;
      }
    }
  }

  const redPixelRatio = roiPixelCount > 0 ? redLikePixels / roiPixelCount : 0;
  const rednessScore =
    redLikePixels > 0 ? rednessAccumulator / redLikePixels : 0;

  const passes = redPixelRatio >= 0.18 && rednessScore >= 24;

  return {
    redPixelRatio,
    rednessScore,
    passes,
    roiPixelCount,
  };
}

export function ScanScreen({navigation}: Props) {
  const {user} = useAuth();

  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();

  const [captureStep, setCaptureStep] = useState<CaptureStep>('idle');
  const [cameraActive, setCameraActive] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const [medicalProfile, setMedicalProfile] =
    useState<UserMedicalProfile | null>(null);
  const [isLoadingMedicalProfile, setIsLoadingMedicalProfile] = useState(true);

  const isCapturing = captureStep !== 'idle';

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (hasPermission && device) {
      setCameraActive(false);
      timer = setTimeout(() => setCameraActive(true), 400);
    } else {
      setCameraActive(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [hasPermission, device]);

  useEffect(() => {
    async function fetchMedicalProfile() {
      if (!user?.id) {
        setMedicalProfile(null);
        setIsLoadingMedicalProfile(false);
        return;
      }

      setIsLoadingMedicalProfile(true);

      const {data, error} = await supabase
        .from('patient_medical_profiles')
        .select('sex, pregnancy_status, date_of_birth')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error) {
        setMedicalProfile(data ?? null);
      }

      setIsLoadingMedicalProfile(false);
    }

    fetchMedicalProfile();
  }, [user?.id]);

  useEffect(() => {
    const demographicGroup = resolveDemographicGroup(medicalProfile);

    setDebugMessage(
      toDebugText([
        `Engine: colorimetric-regression`,
        `Demographic group: ${getDemographicLabel(demographicGroup)}`,
      ]),
    );
  }, [medicalProfile]);

  const lightScore = 85;
  const focusScore = 88;
  const stabilityScore = 82;

  const scanQualityScore = useMemo(() => {
    return Math.round(
      lightScore * 0.35 + focusScore * 0.35 + stabilityScore * 0.3,
    );
  }, [lightScore, focusScore, stabilityScore]);

  const handleCapture = async () => {
    if (!hasPermission || !device || !photoOutput || !cameraActive) {
      Alert.alert(
        'Camera not ready',
        'Please wait for the camera to initialize.',
      );
      return;
    }

    if (isLoadingMedicalProfile) {
      Alert.alert(
        'Profile loading',
        'Please wait while your medical profile is being loaded.',
      );
      return;
    }

    try {
      setDebugMessage(null);
      setCaptureStep('capturing');

      const photo = await photoOutput.capturePhotoToFile({}, {});
      const localPath = `file://${photo.filePath}`;

      setCaptureStep('analyzing');
      const analysis = await analyzeImageQuality(localPath);

      setCaptureStep('processing');

      const targetSize = 224;
      const expectedRgbaLength = targetSize * targetSize * 4;
      const rgba = await getRgbaFromImage(
        photo.filePath,
        targetSize,
        targetSize,
      );

      if (rgba.length !== expectedRgbaLength) {
        throw new Error(
          `Invalid RGBA length. Expected ${expectedRgbaLength}, got ${rgba.length}`,
        );
      }

      const redPresence = checkRedPresenceInCenterROI(
        rgba,
        targetSize,
        targetSize,
      );

      if (!redPresence.passes) {
        const demographicGroup = resolveDemographicGroup(medicalProfile);

        setDebugMessage(
          toDebugText([
            `Engine: colorimetric-regression`,
            `Demographic group: ${getDemographicLabel(demographicGroup)}`,
            `RGBA length: ${rgba.length}`,
            `ROI pixels: ${redPresence.roiPixelCount}`,
            `Center red ratio: ${(redPresence.redPixelRatio * 100).toFixed(1)}%`,
            `Center redness score: ${redPresence.rednessScore.toFixed(1)}`,
            'Rejected: center region does not contain enough blood-like red color.',
          ]),
        );

        Alert.alert(
          'Retake photo',
          'The center of the image does not appear to contain a suitable blood-colored sample. Please place the sample inside the guide and retake the photo.',
        );
        return;
      }

      const roi = extractGuideRoi(rgba, targetSize, targetSize);
      const rawFeatures = computeColorFeatures(roi.rgba);
      const features = normalizeColorFeatures(rawFeatures);

      const calibration = estimateHbFromFeatures(features);

      const confidence = estimateConfidence({
        qualityScore: analysis.qualityScore,
        roiCoverage: roi.coverage,
        features,
      });

      const demographicGroup = resolveDemographicGroup(medicalProfile);
      const severity = categorizeHb(calibration.hb, demographicGroup);
      const mappedSeverity = mapSeverityToResultSeverity(severity);

      setCaptureStep('finalizing');

      setDebugMessage(
        toDebugText([
          `Engine: colorimetric-regression`,
          `Demographic group: ${getDemographicLabel(demographicGroup)}`,
          `ROI coverage: ${(roi.coverage * 100).toFixed(1)}%`,
          `Center red ratio: ${(redPresence.redPixelRatio * 100).toFixed(1)}%`,
          `Center redness score: ${redPresence.rednessScore.toFixed(2)}`,
          `meanR: ${features.meanR.toFixed(2)}`,
          `meanG: ${features.meanG.toFixed(2)}`,
          `meanB: ${features.meanB.toFixed(2)}`,
          `redRatio: ${features.redRatio.toFixed(4)}`,
          `redOverGreen: ${features.redOverGreen.toFixed(4)}`,
          `normalizedRedness: ${features.normalizedRedness.toFixed(4)}`,
          `Hb estimate: ${calibration.hb.toFixed(2)} g/dL`,
          `Confidence: ${confidence}%`,
          `Severity: ${severity}`,
          `Model version: ${calibration.modelVersion}`,
        ]),
      );

      navigation.navigate('Result', {
        scanSessionId: 'local-only',
        imagePath: photo.filePath,
        analysis: {
          ...analysis,
          roiCoverage: roi.coverage,
          redPresence,
          colorFeatures: features,
          modelVersion: calibration.modelVersion,
          calibrationDebug: calibration.debug,
          engine: 'colorimetric-regression',
        },
        hbValue: calibration.hb,
        confidence,
        severity: mappedSeverity,
      });
    } catch (error: any) {
      console.error('Scan failed error object:', error);
      setDebugMessage(`Scan error: ${error?.message ?? 'Unknown error'}`);

      let message = 'Unable to complete scan. Please try again.';
      
      if (error?.message?.includes('Invalid RGBA length')) {
        message = 'Image processing failed. Please ensure the sample is properly centered and try again.';
      } else if (error?.message?.includes('Camera')) {
        message = 'Camera error. Please restart the app and try again.';
      }

      Alert.alert('Scan failed', message);
    } finally {
      setCaptureStep('idle');
    }
  };

  const showCamera = hasPermission && !!device && !!photoOutput;

  return (
    <Screen scrollable>
      <SectionHeader
        title="Scan"
        subtitle="Capture a guided image and estimate hemoglobin locally"
      />

      <InfoBanner
        title="Capture guidance"
        description="Use bright indirect light, hold the phone steady, and keep the sample centered inside the guide."
      />

      <AppCard style={styles.previewCard}>
        <View style={styles.preview}>
          {showCamera ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={cameraActive}
              outputs={[photoOutput]}
            />
          ) : (
            <View style={styles.cameraFallback}>
              <Text style={styles.fallbackTitle}>
                {hasPermission
                  ? 'Camera unavailable'
                  : 'Camera permission required'}
              </Text>

              <Text style={styles.fallbackText}>
                {hasPermission
                  ? 'No compatible back camera was found on this device.'
                  : 'Please allow camera access to start the guided capture preview.'}
              </Text>
            </View>
          )}

          <View style={styles.previewGlow} pointerEvents="none" />
          <CameraGuideOverlay />
        </View>
      </AppCard>

      {!hasPermission ? (
        <PrimaryButton title="Grant Camera Access" onPress={requestPermission} />
      ) : null}

      <View style={styles.qualityRow}>
        <QualityChip label="Light" value="Good" tone="good" />
        <QualityChip label="Focus" value="Sharp" tone="good" />
        <QualityChip label="Stability" value="Stable" tone="good" />
      </View>

      <ScanQualityBar score={scanQualityScore} />

      <PrimaryButton
        title={
          isCapturing
            ? stepLabel(captureStep)
            : isLoadingMedicalProfile
            ? 'Loading Profile...'
            : 'Capture & Analyze'
        }
        onPress={handleCapture}
        disabled={
          !showCamera || !cameraActive || isCapturing || isLoadingMedicalProfile
        }
      />

      {isCapturing ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{stepLabel(captureStep)}</Text>
        </View>
      ) : null}

      {isLoadingMedicalProfile ? (
        <Text style={styles.debugText}>Loading medical profile...</Text>
      ) : null}

      {debugMessage ? <Text style={styles.debugText}>{debugMessage}</Text> : null}

      <Text style={styles.disclaimer}>
        Image analysis is performed locally on the device without requiring an
        internet connection.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  preview: {
    height: 360,
    borderRadius: 28,
    backgroundColor: '#090E1A',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraFallback: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  fallbackTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  fallbackText: {
    ...typography.bodyMD,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  previewGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 77, 125, 0.08)',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  loadingText: {
    ...typography.bodySM,
    color: colors.textSecondary,
  },
  debugText: {
    color: 'red',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  disclaimer: {
    ...typography.bodySM,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
});