// src/ml/hbPreprocess.ts

// هذه الدالة تفترض أن لديك مصفوفة صور RGBA بحجم 224x224 (من native أو مكتبة كاميرا)
export function preprocessRgbaToHbInput(
  rgbaPixels: Uint8ClampedArray,
  width = 224,
  height = 224
): Float32Array {
  const channels = 3; // نحتاج فقط RGB
  const inputSize = 1 * width * height * channels;
  const input = new Float32Array(inputSize);

  // MobileNetV2 preprocess_input تقريبًا: x / 127.5 - 1
  const scale = 1 / 127.5;

  for (let i = 0; i < width * height; i++) {
    const r = rgbaPixels[i * 4 + 0];
    const g = rgbaPixels[i * 4 + 1];
    const b = rgbaPixels[i * 4 + 2];

    const rNorm = r * scale - 1.0;
    const gNorm = g * scale - 1.0;
    const bNorm = b * scale - 1.0;

    const baseIndex = i * channels;
    input[baseIndex + 0] = rNorm;
    input[baseIndex + 1] = gNorm;
    input[baseIndex + 2] = bNorm;
  }

  return input;
}