import { z } from "zod";

export const DateLike = z.union([z.string(), z.date()]);

export { PeriodSchema } from "../lib/period.ts";
