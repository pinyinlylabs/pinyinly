/** @type {import('@babel/core').ConfigFunction} */
module.exports = function babelConfig(api) {
  api.cache.never();

  return {
    presets: [`babel-preset-expo`],
    plugins: [`babel-plugin-transform-import-meta`],
  };
};
