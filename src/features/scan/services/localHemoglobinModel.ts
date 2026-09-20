export type LocalHemoglobinInferenceResult = {
  hbValue: number | null;
  confidence: number | null;
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | null;
  rawOutput: Record<string, unknown> | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function classifySeverity(hbValue: number): 'normal' | 'mild' | 'moderate' | 'severe' {
  if (hbValue >= 12) {
    return 'normal';
  }

  if (hbValue >= 10) {
    return 'mild';
  }

  if (hbValue >= 8) {
    return 'moderate';
  }

  return 'severe';
}

export async function runLocalHemoglobinModel(
  imageUri: string,
): Promise<LocalHemoglobinInferenceResult> {
  try {
    // TODO:
    // Replace this placeholder with your real on-device model call.
    // Examples:
    // - ONNX Runtime React Native
    // - TensorFlow Lite native bridge
    // - TurboModule / NativeModule inference wrapper

    const mockedHbValue = 12.8;
    const mockedConfidence = 91;

    const hbValue = Number(mockedHbValue.toFixed(1));
    const confidence = clamp(Math.round(mockedConfidence), 0, 100);

    return {
      hbValue,
      confidence,
      severity: classifySeverity(hbValue),
      rawOutput: {
        source: 'local-placeholder',
        imageUri,
        mockedHbValue,
        mockedConfidence,
      },
    };
  } catch (error: any) {
    return {
      hbValue: null,
      confidence: null,
      severity: null,
      rawOutput: {
        source: 'local-placeholder',
        imageUri,
        error: error?.message ?? 'Local model execution failed',
      },
    };
  }
}