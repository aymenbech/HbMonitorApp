// src/navigation/types.ts

// ─────────────────────────────────────────────────────────────
// Quality Analysis Types
// ─────────────────────────────────────────────────────────────

export type QualityLabel = 'Poor' | 'Fair' | 'Good' | 'Excellent';

export type ImageQualityResult = {
  averageHex: string;
  brightness: number;
  contrast: number | null;
  sharpness: number | null;
  redness: number;
  qualityScore: number;
  qualityLabel: QualityLabel;
  issues: string[];
};

// ─────────────────────────────────────────────────────────────
// Navigation Types
// ─────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Scan: undefined;
  Analytics: undefined;
  Profile: undefined;
};

export type ResultSeverity = 'normal' | 'mild' | 'moderate' | 'severe';

export type ResultAnalysisColorFeatures = {
  meanR?: number;
  meanG?: number;
  meanB?: number;
  redRatio?: number;
  redOverGreen?: number;
  redOverBlue?: number;
  redness?: number;
  brightness?: number;
  saturation?: number;
  hue?: number;
  normalizedRedness?: number;
  normalizedBrightness?: number;
};

export type ResultAnalysisRedPresence = {
  redPixelRatio?: number;
  rednessScore?: number;
  passes?: boolean;
  roiPixelCount?: number;
};

export type ResultAnalysis = ImageQualityResult & {
  roiCoverage?: number;
  engine?: 'colorimetric-regression' | string;
  modelVersion?: string;
  colorFeatures?: ResultAnalysisColorFeatures;
  redPresence?: ResultAnalysisRedPresence;
  calibrationDebug?: Record<string, number>;
};

export type ResultScreenParams = {
  scanSessionId?: string;
  hbValue?: number | null;
  confidence?: number | null;
  severity?: ResultSeverity | null;
  imagePath?: string;
  analysis: ResultAnalysis;
};

export type AppStackParamList = {
  MainTabs: undefined;
  Result: ResultScreenParams;
};