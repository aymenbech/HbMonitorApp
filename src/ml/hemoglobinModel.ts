import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import {
  useTensorflowModel,
  TensorflowModel,
  TensorflowModelDelegate,
} from 'react-native-fast-tflite';

export type HemoglobinModelPlugin = ReturnType<typeof useHemoglobinModel>;

const DEFAULT_DELEGATES: TensorflowModelDelegate[] = [];
const ANDROID_ASSET_RELATIVE_PATH = 'models/hb_model_fp16.tflite';
const LOCAL_MODEL_FILE_NAME = 'hb_model_fp16.tflite';

const FALLBACK_MODEL_SOURCE = require('../assets/models/hb_model_fp16.tflite');

export function useHemoglobinModel() {
  const [modelSource, setModelSource] = useState<number | { url: string }>(
    FALLBACK_MODEL_SOURCE
  );

  useEffect(() => {
    let isMounted = true;

    async function prepareModel() {
      try {
        if (Platform.OS !== 'android') {
          return;
        }

        const destinationPath = `${RNFS.CachesDirectoryPath}/${LOCAL_MODEL_FILE_NAME}`;
        const exists = await RNFS.exists(destinationPath);

        if (!exists) {
          await RNFS.copyFileAssets(ANDROID_ASSET_RELATIVE_PATH, destinationPath);
          console.log('Hb model copied from Android assets to:', destinationPath);
        } else {
          console.log('Hb model already exists at:', destinationPath);
        }

        if (isMounted) {
          setModelSource({ url: `file://${destinationPath}` });
        }
      } catch (error) {
        console.log('Hb model prepare error:', error);
      }
    }

    prepareModel();

    return () => {
      isMounted = false;
    };
  }, []);

  const plugin = useTensorflowModel(modelSource, DEFAULT_DELEGATES);

  useEffect(() => {
    console.log('Hb model source:', modelSource);
    console.log('Hb model state:', plugin.state);
    console.log('Hb model available:', plugin.model != null);

    if (plugin.state === 'loaded' && plugin.model != null) {
      console.log('Hb model loaded successfully.');
    }

    if (plugin.state === 'error') {
      console.log('Hb model failed to load.');
    }
  }, [modelSource, plugin.state, plugin.model]);

  return plugin;
}

export function getLoadedHemoglobinModel(
  plugin: HemoglobinModelPlugin
): TensorflowModel | undefined {
  if (plugin.state === 'loaded' && plugin.model != null) {
    return plugin.model;
  }
  return undefined;
}

export function isHemoglobinModelLoaded(
  plugin: HemoglobinModelPlugin
): boolean {
  return plugin.state === 'loaded' && plugin.model != null;
}

export function isHemoglobinModelLoading(
  plugin: HemoglobinModelPlugin
): boolean {
  return plugin.state === 'loading';
}

export function getHemoglobinModelState(
  plugin: HemoglobinModelPlugin
): string {
  return plugin.state;
}