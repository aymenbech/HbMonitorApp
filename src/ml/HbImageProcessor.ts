import {NativeModules} from 'react-native';

const {HbImageProcessor} = NativeModules;

export async function getRgbaFromImage(
  filePath: string,
  targetWidth: number,
  targetHeight: number,
): Promise<Uint8ClampedArray> {
  // HbImageProcessor يرجع Uint8Array بطول targetWidth * targetHeight * 4 (RGBA)
  const byteArray: number[] = await HbImageProcessor.getRgbaFromImage(
    filePath,
    targetWidth,
    targetHeight,
  );

  return new Uint8ClampedArray(byteArray);
}