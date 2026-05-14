import type { ZodTypeAny, z } from "zod";
import { BadRequestError } from "./errors.ts";

export function parseBody<S extends ZodTypeAny>(
  schema: S,
  body: unknown
): z.infer<S> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError("Invalid body", parsed.error);
  }
  return parsed.data;
}
