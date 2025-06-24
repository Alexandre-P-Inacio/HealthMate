const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuração mínima para evitar problemas de bundling
config.resolver.assetExts.push('css');

module.exports = config; 