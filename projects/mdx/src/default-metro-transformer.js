// @ts-check
// This file needs to be CommonJS to work with Metro's require system
const upstreamTransformer = require(`@expo/metro-config/build/babel-transformer.js`);

// Import the transformer dynamically to handle the ESM/CommonJS boundary
async function getTransformer() {
  const { transform: expoMdxTransform } = await import(`./transformer.js`);
  return expoMdxTransform;
}

/**
 * Transform function for Metro bundler
 * @param {any} args - Metro transform arguments
 */
const transform = async (args) => {
  // @ts-expect-error - upstreamTransformer module structure
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const upstreamTransform = upstreamTransformer.transform;
  const expoMdxTransform = await getTransformer();
  
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
  return await upstreamTransform(await expoMdxTransform(args));
};

module.exports = { transform };