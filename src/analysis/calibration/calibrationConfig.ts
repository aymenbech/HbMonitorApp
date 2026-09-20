// src/analysis/calibration/calibrationConfig.ts

export const calibrationConfig = {
  version: 'calib-v1',
  intercept: 5.2,
  coefficients: {
    normalizedRedness: 8.1,
    redOverGreen: 1.45,
    saturation: 0.018,
    normalizedBrightness: -1.1,
  },
  minHb: 3,
  maxHb: 20,
};