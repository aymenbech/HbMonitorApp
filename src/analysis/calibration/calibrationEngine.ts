// src/analysis/calibration/calibrationEngine.ts

import {calibrationConfig} from './calibrationConfig';

export type CalibrationOutput = {
  hb: number;
  confidence: number;
  modelVersion: string;
  debug: {
    hbRaw: number;
    normalizedRedness: number;
    redOverGreen: number;
    saturation: number;
    normalizedBrightness: number;
  };
};

export type NormalizedColorFeatures = {
  normalizedRedness: number;
  redOverGreen: number;
  saturation: number;
  normalizedBrightness: number;
  [key: string]: number | undefined;
};

export function estimateHbFromFeatures(
  features: NormalizedColorFeatures,
): CalibrationOutput {
  const c = calibrationConfig;

  const hbRaw =
    c.intercept +
    c.coefficients.normalizedRedness * (features.normalizedRedness ?? 0) +
    c.coefficients.redOverGreen * (features.redOverGreen ?? 0) +
    c.coefficients.saturation * (features.saturation ?? 0) +
    c.coefficients.normalizedBrightness * (features.normalizedBrightness ?? 0);

  const hb = Math.max(c.minHb, Math.min(c.maxHb, hbRaw));

  return {
    hb,
    confidence: 0,
    modelVersion: c.version,
    debug: {
      hbRaw,
      normalizedRedness: features.normalizedRedness ?? 0,
      redOverGreen: features.redOverGreen ?? 0,
      saturation: features.saturation ?? 0,
      normalizedBrightness: features.normalizedBrightness ?? 0,
    },
  };
}