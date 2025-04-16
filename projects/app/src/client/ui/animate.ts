export type Transform1D = (value: number) => number;

export function createAffineTransform(
  x1: number,
  x1p: number,
  x2: number,
  x2p: number,
) {
  if (x2 === x1) {
    // Handle the case where input range has zero width
    return () => x1p;
  }

  const scale = (x2p - x1p) / (x2 - x1);
  const offset = x1p - scale * x1;

  return (x: number) => scale * x + offset;
}
