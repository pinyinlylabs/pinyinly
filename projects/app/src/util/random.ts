// SplitMix64 to generate initial seed state from full 64-bit float
function splitmix64(seed: number): () => bigint {
  let state = BigInt.asUintN(64, BigInt(Math.floor(seed * 2 ** 32)));
  return () => {
    state = (state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    let z = state;
    z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
    z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
    return z ^ (z >> 31n);
  };
}

/**
 * Seedable psuedo-random number generator using the Xoshiro128** algorithm.
 * Returns numbers between 0 and 1. Supports seeding with 64-bit floats.
 */
export function makePRNG(seed: number): () => number {
  // xoshiro128** PRNG — fast, high quality, returns number in [0, 1)
  const seedGen = splitmix64(seed);
  const mask32 = 0xffffffffn;

  // Seed state with 4 uint32 parts from SplitMix64
  let s0 = Number(seedGen() & mask32);
  let s1 = Number(seedGen() & mask32);
  let s2 = Number(seedGen() & mask32);
  let s3 = Number(seedGen() & mask32);

  return () => {
    const result = rotl(s1 * 5, 7) * 9;

    const t = s1 << 9;

    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;

    s2 ^= t;

    s3 = rotl(s3, 11);

    return (result >>> 0) / 2 ** 32;
  };
}

/**
 * Implementation detail of Xoshiro128**.
 */
function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}
