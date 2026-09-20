// src/analysis/calibration/confidenceEngine.ts

export type NormalizedColorFeatures = {
  normalizedRedness?: number;
  redOverGreen?: number;
  saturation?: number;
  normalizedBrightness?: number;
  [key: string]: number | undefined;
};

export type ConfidenceInputs = {
  qualityScore: number;
  roiCoverage: number;
  features: NormalizedColorFeatures;
};

export function estimateConfidence({
  qualityScore,
  roiCoverage,
  features,
}: ConfidenceInputs): number {
  let score = qualityScore;

  if (roiCoverage < 0.15) score -= 15;
  if ((features.saturation ?? 0) < 15) score -= 15;
  if ((features.normalizedBrightness ?? 0) < 0.2) score -= 10;
  if ((features.redOverGreen ?? 0) < 1.05) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}