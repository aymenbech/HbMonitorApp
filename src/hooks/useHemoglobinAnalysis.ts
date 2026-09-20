// src/features/scan/hooks/useHemoglobinAnalysis.ts

import {useCallback, useState} from 'react';
import {supabase} from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResultSeverity = 'normal' | 'mild' | 'moderate' | 'severe';

export type HbAnalysisResult = {
  hbValue: number;
  confidence: number;       // 0–100
  severity: ResultSeverity;
  labelEn: string;
  recommendationEn: string;
  modelVersionId: string;
};

type HbAnalysisState =
  | {status: 'idle'}
  | {status: 'loading'}
  | {status: 'success'; data: HbAnalysisResult}
  | {status: 'error'; message: string};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHemoglobinAnalysis() {
  const [state, setState] = useState<HbAnalysisState>({status: 'idle'});

  const analyze = useCallback(
    async (params: {
      imageUri: string;   // file:// path
      sex?: string | null;
      modelVersionId?: string;
    }): Promise<HbAnalysisResult | null> => {
      setState({status: 'loading'});

      try {
        // Convert local image to base64
        const response = await fetch(params.imageUri);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        // Call Edge Function (JWT attached automatically by supabase client)
        const {data, error} = await supabase.functions.invoke('analyze-scan', {
          body: {
            imageBase64: base64,
            sex: params.sex ?? null,
            modelVersionId: params.modelVersionId ?? 'unknown',
          },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        const result: HbAnalysisResult = {
          hbValue: data.hbValue,
          confidence: data.confidence,
          severity: data.severity,
          labelEn: data.labelEn,
          recommendationEn: data.recommendationEn,
          modelVersionId: data.modelVersionId,
        };

        setState({status: 'success', data: result});
        return result;
      } catch (err: any) {
        const message = err?.message ?? 'Analysis failed';
        setState({status: 'error', message});
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => setState({status: 'idle'}), []);

  return {state, analyze, reset};
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data URL prefix: "data:image/jpeg;base64,..."
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}