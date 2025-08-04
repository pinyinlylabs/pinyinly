/** @type {import('@babel/core').ConfigFunction} */
module.exports = function babelConfig(api) {
  api.cache.never();

  return {
    presets: [
      [
        `babel-preset-expo`,
        {
          "react-compiler": {
            // Passed directly to the React Compiler Babel plugin.
            compilationMode: `strict`,
            panicThreshold: `all_errors`,
          },
        },
      ],
      `nativewind/babel`,
      [
        `@pinyinly/expo-audio-sprites/babel`,
        { manifestPath: require.resolve(`./src/assets/audio/manifest.json`) },
      ],
    ],
    plugins: [`babel-plugin-transform-import-meta`],
  };
};
