import RNFS from 'react-native-fs';
import {decode} from 'base64-arraybuffer';

import {supabase} from '../../../lib/supabase';
import type {ImageQualityResult} from '../utils/imageQuality';
import type {LocalHemoglobinInferenceResult} from './localHemoglobinModel';

type SaveScanSessionParams = {
  imageUri: string;
  analysis: ImageQualityResult;
  inference: LocalHemoglobinInferenceResult;
};

type SaveScanSessionResult = {
  scanSessionId: string;
  imagePath: string | null;
  storagePath: string | null;
  hbResultId: string | null;
};

function cleanFileUri(uri: string) {
  return uri.startsWith('file://') ? uri.replace('file://', '') : uri;
}

function getFileExtension(path: string) {
  const normalized = path.toLowerCase();

  if (normalized.endsWith('.png')) return 'png';
  if (normalized.endsWith('.webp')) return 'webp';
  if (normalized.endsWith('.heic')) return 'heic';
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'jpg';

  return 'jpg';
}

function getContentType(extension: string) {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'jpg':
    default:
      return 'image/jpeg';
  }
}

export async function saveScanSession({
  imageUri,
  analysis,
  inference,
}: SaveScanSessionParams): Promise<SaveScanSessionResult> {
  const {
    data: {user},
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User session not found.');
  }

  const filePath = cleanFileUri(imageUri);
  const extension = getFileExtension(filePath);
  const contentType = getContentType(extension);

  const {
    data: createdSession,
    error: sessionError,
  } = await supabase
    .from('scan_sessions')
    .insert({
      user_id: user.id,
      source: 'mobile-app',
      status: 'completed',
    })
    .select('id')
    .single();

  if (sessionError || !createdSession) {
    throw new Error(sessionError?.message ?? 'Failed to create scan session.');
  }

  const scanSessionId = createdSession.id;
  const storagePath = `${user.id}/${scanSessionId}/capture.${extension}`;

  const base64 = await RNFS.readFile(filePath, 'base64');
  const arrayBuffer = decode(base64);

  const {error: uploadError} = await supabase.storage
    .from('scan-images')
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message ?? 'Failed to upload scan image.');
  }

  const {
    data: imageAsset,
    error: imageAssetError,
  } = await supabase
    .from('image_assets')
    .insert({
      user_id: user.id,
      scan_session_id: scanSessionId,
      storage_bucket: 'scan-images',
      storage_path: storagePath,
      mime_type: contentType,
      file_size_bytes: null,
      capture_device: 'react-native',
    })
    .select('id')
    .single();

  if (imageAssetError) {
    throw new Error(imageAssetError.message ?? 'Failed to save image asset.');
  }

  const {error: qualityError} = await supabase.from('image_quality_assessments').insert({
    scan_session_id: scanSessionId,
    brightness_score: analysis.brightness,
    contrast_score: analysis.contrast,
    sharpness_score: analysis.sharpness,
    redness_score: analysis.redness,
    quality_score: analysis.qualityScore,
    quality_label: analysis.qualityLabel.toLowerCase(),
    notes: analysis.issues.join(' | '),
  });

  if (qualityError) {
    throw new Error(qualityError.message ?? 'Failed to save quality analysis.');
  }

  let hbResultId: string | null = null;

  if (inference.hbValue !== null && inference.confidence !== null && inference.severity) {
    const {
      data: modelInference,
      error: inferenceError,
    } = await supabase
      .from('model_inferences')
      .insert({
        scan_session_id: scanSessionId,
        model_name: 'local-hemoglobin-model',
        model_version: '1.0.0',
        output_payload: inference.rawOutput ?? {},
        confidence_score: inference.confidence / 100,
      })
      .select('id')
      .single();

    if (inferenceError || !modelInference) {
      throw new Error(inferenceError?.message ?? 'Failed to save model inference.');
    }

    const {
      data: hbResult,
      error: hbResultError,
    } = await supabase
      .from('hemoglobin_results')
      .insert({
        user_id: user.id,
        scan_session_id: scanSessionId,
        model_inference_id: modelInference.id,
        hemoglobin_g_dl: inference.hbValue,
        confidence_score: inference.confidence / 100,
        severity_class: inference.severity,
        measured_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (hbResultError || !hbResult) {
      throw new Error(hbResultError?.message ?? 'Failed to save hemoglobin result.');
    }

    hbResultId = hbResult.id;
  }

  return {
    scanSessionId,
    imagePath: filePath,
    storagePath,
    hbResultId,
  };
}