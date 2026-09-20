// src/native/HbImageProcessor.ts
import {NativeModules} from 'react-native';

const {HbImageProcessor} = NativeModules;

export async function getRgbaFromImage(
  filePath: string,
  targetWidth: number,
  targetHeight: number,
): Promise<Uint8ClampedArray> {
  // HbImageProcessor.getRgbaFromImage يرجّع Array من الأعداد الصحيحة (Int)
  const bytes: number[] = await HbImageProcessor.getRgbaFromImage(
    filePath,
    targetWidth,
    targetHeight,
  );

  return new Uint8ClampedArray(bytes);
}