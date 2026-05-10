import { connectDB, client } from "./client.ts";
import type { Utility, UtilityType, UtilityStatus } from "@pr_hospitalagent/types";

const now = new Date();
const ANCHOR = new Date(2026, 4, 10);

function periodKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function lastNPeriods(n: number, anchor: Date): string[] {
  const out: string[] = [];
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  for (let i = n - 1; i >= 0; i--) {
    out.push(periodKey(new Date(y, m - i, 1)));
  }
  return out;
}

type Recipe = {
  type: UtilityType;
  baseAmount: number;
  baseUsage: number;
  unit: string;
  amountVar: number;
  usageVar: number;
};

const recipes: Recipe[] = [
  { type: "Điện", baseAmount: 12_500_000, baseUsage: 4200, unit: "kWh", amountVar: 0.18, usageVar: 0.16 },
  { type: "Nước", baseAmount: 2_400_000, baseUsage: 180, unit: "m³", amountVar: 0.12, usageVar: 0.1 },
  { type: "Internet", baseAmount: 1_800_000, baseUsage: 1, unit: "tháng", amountVar: 0, usageVar: 0 },
];

function rand(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

async function run() {
  const db = await connectDB();
  const collection = db.collection<Utility>("utilities");
  await collection.deleteMany({});
  await collection.createIndex({ id: 1 }, { unique: true });

  const periods = lastNPeriods(12, ANCHOR);
  const currentPeriod = periodKey(ANCHOR);

  const docs: Utility[] = [];
  let seq = 1;
  for (let pi = 0; pi < periods.length; pi++) {
    const p = periods[pi]!;
    for (let ri = 0; ri < recipes.length; ri++) {
      const r = recipes[ri]!;
      const f1 = rand(pi * 7 + ri);
      const f2 = rand(pi * 13 + ri + 1);
      const amount = Math.round(
        r.baseAmount * (1 + (f1 - 0.5) * 2 * r.amountVar)
      );
      const usage = Math.round(
        r.baseUsage * (1 + (f2 - 0.5) * 2 * r.usageVar)
      );
      const isCurrent = p === currentPeriod;
      const status: UtilityStatus = isCurrent
        ? rand(pi + ri) < 0.5
          ? "Chưa thanh toán"
          : "Đã thanh toán"
        : "Đã thanh toán";
      const [yy, mm] = p.split("-").map(Number) as [number, number];
      const paidDate =
        status === "Đã thanh toán" ? new Date(yy, mm - 1, 5) : null;
      docs.push({
        id: "UT" + String(seq++).padStart(3, "0"),
        type: r.type,
        period: p,
        amount,
        usage,
        unit: r.unit,
        paidDate,
        status,
        createdAt: now,
      });
    }
  }

  await collection.insertMany(docs);
  console.log(`Inserted ${docs.length} utility bills (${periods.length} months × ${recipes.length} types).`);
  await client.close();
}

run().catch((err) => {
  console.error("Seed utilities failed:", err);
  process.exit(1);
});
