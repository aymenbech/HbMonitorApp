const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const {assetExts, sourceExts} = defaultConfig.resolver;

/**
 * إعدادات Metro لتضمين ملفات النماذج الحسابية مثل .tflite
 */
const config = {
  resolver: {
    assetExts: [...assetExts, 'tflite'],
    sourceExts: [...sourceExts],
  },
};

module.exports = mergeConfig(defaultConfig, config);