const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // lazy-load modules — faster startup
      },
    }),
  },
  resolver: {
    // Prefer .native.ts/.native.tsx over .ts/.tsx for platform-specific code
    platforms: ['android', 'ios', 'native'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
