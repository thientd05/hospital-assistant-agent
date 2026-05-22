// Deterministic pseudo-random in [0, 1) for reproducible seed data.
export function rand(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}
