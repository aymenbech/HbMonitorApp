// src/analysis/roi/extractGuideRoi.ts

export type RoiResult = {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  coverage: number;
};

export function extractGuideRoi(
  rgba: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
): RoiResult {
  if (imageWidth <= 0 || imageHeight <= 0 || rgba.length === 0) {
    return {
      rgba: new Uint8ClampedArray(0),
      width: 0,
      height: 0,
      coverage: 0,
    };
  }

  const roiWidth = Math.floor(imageWidth * 0.5);
  const roiHeight = Math.floor(imageHeight * 0.5);

  const startX = Math.floor((imageWidth - roiWidth) / 2);
  const startY = Math.floor((imageHeight - roiHeight) / 2);

  const out = new Uint8ClampedArray(roiWidth * roiHeight * 4);
  let outIndex = 0;

  for (let y = startY; y < startY + roiHeight; y += 1) {
    for (let x = startX; x < startX + roiWidth; x += 1) {
      const idx = (y * imageWidth + x) * 4;
      out[outIndex++] = rgba[idx];
      out[outIndex++] = rgba[idx + 1];
      out[outIndex++] = rgba[idx + 2];
      out[outIndex++] = rgba[idx + 3];
    }
  }

  return {
    rgba: out,
    width: roiWidth,
    height: roiHeight,
    coverage: (roiWidth * roiHeight) / (imageWidth * imageHeight),
  };
}