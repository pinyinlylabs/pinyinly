// @ts-check

/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  api.cache.never();

  return {
    presets: [`babel-preset-expo`, `nativewind/babel`],
    plugins: [`babel-plugin-transform-import-meta`],
  };
};
