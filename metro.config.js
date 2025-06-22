const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable CSS support
config.resolver.assetExts.push('css');

// Configure for React Native Reanimated
config.resolver.alias = {
  'react-native-reanimated/lib/typescript/reanimated2': 'react-native-reanimated/lib/typescript/reanimated2',
};

module.exports = config; 