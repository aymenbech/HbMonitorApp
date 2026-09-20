// src/analysis/color/colorNormalization.ts

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
  normalizedRedness?: number;
  normalizedBrightness?: number;
};

export type NormalizedColorFeatures = ColorFeatures & {
  normalizedRedness: number;
  normalizedBrightness: number;
};

export function normalizeColorFeatures(
  features: ColorFeatures,
): NormalizedColorFeatures {
  const normalizedBrightness = features.brightness / 255;
  const normalizedRedness =
    features.redness / Math.max(1, features.brightness);

  return {
    ...features,
    normalizedRedness,
    normalizedBrightness,
  };
}