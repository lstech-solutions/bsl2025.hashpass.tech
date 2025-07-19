module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
            '@providers': './providers',
            '@/lib': './lib',
          },
        },
      ],
      'react-native-reanimated/plugin',
      // Make sure Reanimated is the last plugin
    ],
  };
};
