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
import {useLanguage} from '../../../app/LanguageContext';
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
import {
  resolveDemographicGroup,
  getDemographicLabel,
  type UserMedicalProfile,
} from '../../../analysis/interpretation/demographicResolver';

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

type RedPresenceCheckResult = {
  redPixelRatio: number;
  rednessScore: number;
  passes: boolean;
  roiPixelCount: number;
};

const toDebugText = (lines: string[]): string => lines.join('\n');

function stepLabel(
  step: CaptureStep,
  t: (section: string, key: string) => string,
): string {
  switch (step) {
    case 'capturing':
      return t('scan', 'capture');
    case 'analyzing':
      return t('scan', 'checkingQuality');
    case 'processing':
      return t('scan', 'processingColor');
    case 'finalizing':
      return t('scan', 'preparingResult');
    default:
      return '';
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

  return {
    redPixelRatio,
    rednessScore,
    passes: redPixelRatio >= 0.18 && rednessScore >= 24,
    roiPixelCount,
  };
}

export function ScanScreen({navigation}: Props) {
  const {user} = useAuth();
  const {t} = useLanguage();
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
      requestPermission().catch(error => {
        console.warn('Camera permission request failed:', error);
      });
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (hasPermission && device && photoOutput) {
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
  }, [hasPermission, device, photoOutput]);

  useEffect(() => {
    let mounted = true;

    async function fetchMedicalProfile() {
      if (!user?.id) {
        if (mounted) {
          setMedicalProfile(null);
          setIsLoadingMedicalProfile(false);
        }
        return;
      }

      setIsLoadingMedicalProfile(true);

      try {
        const {data, error} = await supabase
          .from('patient_medical_profiles')
          .select('sex, pregnancy_status, date_of_birth')
          .eq('user_id', user.id)
          .maybeSingle();

        if (mounted) {
          if (error) {
            console.warn('Medical profile load failed:', error.message);
            setMedicalProfile(null);
          } else {
            setMedicalProfile(data ?? null);
          }
        }
      } catch (error) {
        console.warn('Medical profile exception:', error);
        if (mounted) {
          setMedicalProfile(null);
        }
      } finally {
        if (mounted) {
          setIsLoadingMedicalProfile(false);
        }
      }
    }

    fetchMedicalProfile();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const demographicGroup = resolveDemographicGroup(medicalProfile);
    setDebugMessage(
      toDebugText([
        'Engine: colorimetric-regression',
        `Demographic group: ${getDemographicLabel(demographicGroup)}`,
      ]),
    );
  }, [medicalProfile]);

  const lightScore = 85;
  const focusScore = 88;
  const stabilityScore = 82;

  const scanQualityScore = useMemo(
    () => Math.round(lightScore * 0.35 + focusScore * 0.35 + stabilityScore * 0.3),
    [lightScore, focusScore, stabilityScore],
  );

  const handleCapture = async () => {
    if (!hasPermission) {
      await requestPermission();
      return;
    }

    if (!device || !photoOutput || !cameraActive) {
      Alert.alert(t('scan', 'cameraUnavailable'), t('scan', 'cameraWait'));
      return;
    }

    if (isLoadingMedicalProfile) {
      Alert.alert('Profile loading', 'Please wait while your medical profile is being loaded.');
      return;
    }

    if (isCapturing) {
      return;
    }

    try {
      setDebugMessage(null);
      setCaptureStep('capturing');

      const photo = await photoOutput.capturePhotoToFile({}, {});
      if (!photo?.filePath) {
        throw new Error('Camera returned an empty photo path.');
      }

      const localPath = `file://${photo.filePath}`;
      setCaptureStep('analyzing');
      const analysis = await analyzeImageQuality(localPath);

      setCaptureStep('processing');
      const targetSize = 224;
      const expectedRgbaLength = targetSize * targetSize * 4;
      const rgba = await getRgbaFromImage(photo.filePath, targetSize, targetSize);

      if (!(rgba instanceof Uint8ClampedArray) || rgba.length !== expectedRgbaLength) {
        throw new Error(
          `Invalid RGBA buffer. Expected ${expectedRgbaLength}, got ${rgba?.length ?? 0}.`,
        );
      }

      const redPresence = checkRedPresenceInCenterROI(rgba, targetSize, targetSize);
      const demographicGroup = resolveDemographicGroup(medicalProfile);

      if (!redPresence.passes) {
        setDebugMessage(
          toDebugText([
            'Engine: colorimetric-regression',
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
          'Please place the sample inside the guide, use bright indirect light, and retake the photo.',
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
      const severity = categorizeHb(calibration.hb, demographicGroup);
      const mappedSeverity = mapSeverityToResultSeverity(severity);

      setCaptureStep('finalizing');
      setDebugMessage(
        toDebugText([
          'Engine: colorimetric-regression',
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
      console.error('Scan failed:', error);
      const rawMessage = error?.message ?? 'Unknown error';
      setDebugMessage(`Scan error: ${rawMessage}`);

      let message = 'Unable to complete scan. Please try again.';
      if (rawMessage.includes('Invalid RGBA') || rawMessage.includes('decode image')) {
        message = 'Image processing failed. Please retake the photo with the sample centered in the guide.';
      } else if (rawMessage.toLowerCase().includes('camera')) {
        message = 'Camera error. Please close and reopen the app, then try again.';
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
        title={t('scan', 'title')}
        subtitle={t('scan', 'subtitle')}
      />

      <InfoBanner
        title={t('scan', 'captureGuidance')}
        description={t('scan', 'captureGuidanceDescription')}
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
                  ? t('scan', 'cameraUnavailable')
                  : t('scan', 'cameraPermissionRequired')}
              </Text>
              <Text style={styles.fallbackText}>
                {hasPermission ? t('scan', 'cameraUnavailable') : t('scan', 'cameraWait')}
              </Text>
            </View>
          )}

          <View style={styles.previewGlow} pointerEvents="none" />
          <CameraGuideOverlay />
        </View>
      </AppCard>

      {!hasPermission ? (
        <PrimaryButton title={t('scan', 'cameraAccess')} onPress={requestPermission} />
      ) : null}

      <View style={styles.qualityRow}>
        <QualityChip label={t('scan', 'light')} value={t('scan', 'good')} tone="good" />
        <QualityChip label={t('scan', 'focus')} value={t('scan', 'excellent')} tone="good" />
        <QualityChip label={t('scan', 'stability')} value={t('scan', 'good')} tone="good" />
      </View>

      <ScanQualityBar score={scanQualityScore} />

      <PrimaryButton
        title={
          isCapturing
            ? stepLabel(captureStep, t)
            : isLoadingMedicalProfile
            ? t('scan', 'loadingProfile')
            : t('scan', 'captureAnalyze')
        }
        onPress={handleCapture}
        disabled={!showCamera || !cameraActive || isCapturing || isLoadingMedicalProfile}
      />

      {isCapturing ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{stepLabel(captureStep, t)}</Text>
        </View>
      ) : null}

      {isLoadingMedicalProfile ? (
        <Text style={styles.debugText}>{t('scan', 'loadingProfile')}</Text>
      ) : null}

      {debugMessage ? <Text style={styles.debugText}>{debugMessage}</Text> : null}

      <Text style={styles.disclaimer}>{t('scan', 'localProcessing')}</Text>
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
