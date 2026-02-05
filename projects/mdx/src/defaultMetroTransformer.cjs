// @ts-check
// This file needs to be CommonJS to work with Metro's require system
const upstreamTransformer = require(
  `@expo/metro-config/build/babel-transformer.js`,
);

// Import the transformer dynamically to handle the ESM/CommonJS boundary
async function getTransformer() {
  const { transform: expoMdxTransform } = await import(`./transformer.ts`);
  return expoMdxTransform;
}

/**
 * Transform function for Metro bundler
 * @param {any} arguments_ - Metro transform arguments
 */
const transform = async (arguments_) => {
  // @ts-expect-error - upstreamTransformer module structure
  // oxlint-disable-next-line typescript/no-unsafe-assignment
  const upstreamTransform = upstreamTransformer.transform;
  const expoMdxTransform = await getTransformer();

  // oxlint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-call, typescript/no-unsafe-argument
  return await upstreamTransform(await expoMdxTransform(arguments_));
};

module.exports = { transform };
