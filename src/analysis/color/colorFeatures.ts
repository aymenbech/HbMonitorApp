// src/analysis/color/colorFeatures.ts

import {rgbToHsv} from './colorSpaces';

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

export function computeColorFeatures(
  rgba: Uint8ClampedArray,
): ColorFeatures {
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumHue = 0;
  let sumSat = 0;
  let sumVal = 0;

  const totalPixels = rgba.length / 4;

  if (totalPixels === 0) {
    // Fallback for empty arrays
    return {
      meanR: 0,
      meanG: 0,
      meanB: 0,
      redRatio: 0,
      redOverGreen: 0,
      redOverBlue: 0,
      redness: 0,
      brightness: 0,
      saturation: 0,
      hue: 0,
    };
  }

  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];

    sumR += r;
    sumG += g;
    sumB += b;

    const hsv = rgbToHsv(r, g, b);
    sumHue += hsv.h;
    sumSat += hsv.s;
    sumVal += hsv.v;
  }

  const meanR = sumR / totalPixels;
  const meanG = sumG / totalPixels;
  const meanB = sumB / totalPixels;

  const sumMean = meanR + meanG + meanB;
  const redRatio = meanR / Math.max(1, sumMean);
  const redOverGreen = meanR / Math.max(1, meanG);
  const redOverBlue = meanR / Math.max(1, meanB);
  const redness = meanR - (meanG + meanB) / 2;
  const brightness = sumMean / 3;
  const saturation = (sumSat / totalPixels) * 100;
  const hue = sumHue / totalPixels;

  // Normalized values (0-1 scale)
  const normalizedRedness = redness / 255;
  const normalizedBrightness = brightness / 255;

  return {
    meanR,
    meanG,
    meanB,
    redRatio,
    redOverGreen,
    redOverBlue,
    redness,
    brightness,
    saturation,
    hue,
    normalizedRedness,
    normalizedBrightness,
  };
}