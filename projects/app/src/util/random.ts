/**
 * Seedable pseudo-random number generator using the Mulberry32 algorithm.
 */
export function pseudoRandomNumberGenerator(seed: number): () => number {
  return function () {
    seed = Math.trunc(seed);
    seed = Math.trunc(seed + 0x6d2b79f5);
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
