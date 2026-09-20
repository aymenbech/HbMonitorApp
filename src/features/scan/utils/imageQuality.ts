// src/features/scan/utils/imageQuality.ts

import {getAverageColor} from '@somesoap/react-native-image-palette';
import {
  OpenCV,
  DataTypes,
  ObjectType,
  ColorConversionCodes,
  BorderTypes,
} from 'react-native-fast-opencv';
import RNFS from 'react-native-fs';

import type {ImageQualityResult, QualityLabel} from '../../../navigation/types';

type RGB = {r: number; g: number; b: number};

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function normalizeHex(raw: string): string {
  const cleaned = raw.trim().replace('#', '');
  if (cleaned.length === 3) {
    return cleaned.split('').map(c => c + c).join('');
  }
  return cleaned.slice(0, 6).padEnd(6, '0');
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(normalizeHex(hex), 16);
  return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255};
}

function luminance({r, g, b}: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function computeBrightness(rgb: RGB): number {
  return Math.round(luminance(rgb) / 2.55);
}

function computeRedness({r, g, b}: RGB): number {
  const raw = r - (g + b) / 2;
  return clamp(Math.round(((raw + 255) / 510) * 100), 0, 100);
}

// ─────────────────────────────────────────────────────────────
// تحميل الصورة — base64ToMat مباشرة
// ─────────────────────────────────────────────────────────────

async function imageUriToMat(imageUri: string) {
  const cleanUri = imageUri.replace('file://', '');
  const base64 = await RNFS.readFile(cleanUri, 'base64');
  return OpenCV.base64ToMat(base64);
}

// ─────────────────────────────────────────────────────────────
// Contrast — meanStdDev على grayscale pixels
// ─────────────────────────────────────────────────────────────

async function computeContrastOpenCV(imageUri: string): Promise<number> {
  const src = await imageUriToMat(imageUri);

  const gray = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
  OpenCV.invoke('cvtColor', src, gray, ColorConversionCodes.COLOR_BGR2GRAY);

  const mean = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_64F);
  const stddev = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_64F);
  OpenCV.invoke('meanStdDev', gray, mean, stddev);

  const {buffer} = OpenCV.matToBuffer(stddev, 'float64');
  const std = buffer[0] ?? 0;

  OpenCV.clearBuffers();

  return clamp(Math.round((std / 80) * 100), 0, 100);
}

// ─────────────────────────────────────────────────────────────
// Sharpness — Laplacian Variance
// ─────────────────────────────────────────────────────────────

async function computeSharpnessOpenCV(imageUri: string): Promise<number> {
  const src = await imageUriToMat(imageUri);

  const gray = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
  OpenCV.invoke('cvtColor', src, gray, ColorConversionCodes.COLOR_BGR2GRAY);

  const lap = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_64F);
  OpenCV.invoke(
    'Laplacian',
    gray,
    lap,
    DataTypes.CV_64F,
    1,
    1,
    0,
    BorderTypes.BORDER_DEFAULT,
  );

  const mean = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_64F);
  const stddev = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_64F);
  OpenCV.invoke('meanStdDev', lap, mean, stddev);

  const {buffer} = OpenCV.matToBuffer(stddev, 'float64');
  const std = buffer[0] ?? 0;
  const variance = std * std;

  OpenCV.clearBuffers();

  let score: number;
  if (variance < 50) {
    score = Math.round((variance / 50) * 30);
  } else if (variance < 500) {
    score = Math.round(30 + ((variance - 50) / 450) * 50);
  } else {
    score = Math.min(100, Math.round(80 + ((variance - 500) / 500) * 20));
  }

  return clamp(score, 0, 100);
}

// ─────────────────────────────────────────────────────────────
// Score composition
// ─────────────────────────────────────────────────────────────

function brightnessSubScore(b: number): number {
  if (b >= 35 && b <= 75) return 90;
  if ((b >= 25 && b < 35) || (b > 75 && b <= 85)) return 68;
  if ((b >= 15 && b < 25) || (b > 85 && b <= 92)) return 42;
  return 18;
}

function rednessSubScore(r: number): number {
  if (r >= 45) return 85;
  if (r >= 30) return 65;
  if (r >= 20) return 45;
  return 25;
}

function buildQualityScore(p: {
  brightness: number;
  redness: number;
  contrast: number | null;
  sharpness: number | null;
}): number {
  const b = brightnessSubScore(p.brightness);
  const r = rednessSubScore(p.redness);

  let score: number;
  if (p.contrast !== null && p.sharpness !== null) {
    score = b * 0.30 + p.sharpness * 0.30 + p.contrast * 0.25 + r * 0.15;
  } else if (p.sharpness !== null) {
    score = b * 0.45 + p.sharpness * 0.40 + r * 0.15;
  } else if (p.contrast !== null) {
    score = b * 0.50 + p.contrast * 0.35 + r * 0.15;
  } else {
    score = b * 0.80 + r * 0.20;
  }

  return clamp(Math.round(score), 0, 100);
}

function buildQualityLabel(s: number): QualityLabel {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Fair';
  return 'Poor';
}

function buildIssues(p: {
  brightness: number;
  contrast: number | null;
  sharpness: number | null;
}): string[] {
  const issues: string[] = [];

  if (p.brightness < 25) {
    issues.push('Image is too dark — try better lighting');
  } else if (p.brightness > 85) {
    issues.push('Image is overexposed — reduce direct light');
  }

  if (p.sharpness !== null && p.sharpness < 30) {
    issues.push('Blurry image — hold the camera steady and retake');
  }

  if (p.contrast !== null && p.contrast < 35) {
    issues.push('Low contrast — flat or washed-out tones detected');
  }

  if (issues.length === 0) {
    issues.push('Image quality looks acceptable');
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export async function analyzeImageQuality(
  imageUri: string,
): Promise<ImageQualityResult> {
  let averageHex = '#808080';
  let rgb: RGB = {r: 128, g: 128, b: 128};

  try {
    const raw = await getAverageColor(imageUri);
    averageHex = `#${normalizeHex(raw)}`;
    rgb = hexToRgb(raw);
  } catch {
    // Fallback to default gray if color extraction fails
  }

  const brightness = computeBrightness(rgb);
  const redness = computeRedness(rgb);

  const [contrast, sharpness] = await Promise.all([
    computeContrastOpenCV(imageUri).catch(() => null),
    computeSharpnessOpenCV(imageUri).catch(() => null),
  ]);

  const qualityScore = buildQualityScore({brightness, redness, contrast, sharpness});
  const qualityLabel = buildQualityLabel(qualityScore);
  const issues = buildIssues({brightness, contrast, sharpness});

  return {
    averageHex,
    brightness,
    contrast,
    sharpness,
    redness,
    qualityScore,
    qualityLabel,
    issues,
  };
}