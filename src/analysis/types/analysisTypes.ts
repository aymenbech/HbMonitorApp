export type QualityResult = {
  passes: boolean;
  brightnessScore: number;
  blurScore: number;
  redPresenceScore: number;
  message?: string;
};

export type RoiResult = {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  coverage: number;
};

export type ColorFeatures = {
  meanR: number;
  meanG: number;
  meanB: number;
  redRatio: number;
  redOverGreen: number;
  redOverBlue: number;
  redness: number;
  brightness: number;
  saturation: number;
  hue: number;
};

export type NormalizedColorFeatures = ColorFeatures & {
  normalizedRedness: number;
  normalizedBrightness: number;
};

export type CalibrationOutput = {
  hb: number;
  confidence: number;
  modelVersion: string;
  debug: Record<string, number>;
};

export type HbSeverity = 'normal' | 'mild' | 'moderate' | 'severe';