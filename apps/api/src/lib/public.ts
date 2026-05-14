export function stripPassword<T extends { passwordHash?: string }>(
  doc: T
): Omit<T, "passwordHash"> {
  const { passwordHash, ...rest } = doc;
  return rest;
}
