import { BadRequestError } from "./errors.ts";

export function buildSet<T extends Record<string, unknown>>(
  data: Partial<T>,
  allowedKeys: readonly (keyof T)[]
): Record<string, unknown> {
  const $set: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    const value = data[key];
    if (value !== undefined) $set[key as string] = value;
  }
  return $set;
}

export function assertHasUpdates(set: Record<string, unknown>) {
  if (Object.keys(set).length === 0) {
    throw new BadRequestError("Không có trường nào để cập nhật.");
  }
}
