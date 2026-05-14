import { z } from "zod";

export const PeriodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "period phải có dạng YYYY-MM");

export function periodKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function lastNPeriods(n: number, anchor: Date): string[] {
  const out: string[] = [];
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  for (let i = n - 1; i >= 0; i--) {
    out.push(periodKey(new Date(y, m - i, 1)));
  }
  return out;
}
