import { connectDB, client } from "@pr_hospitalagent/api-shared";
import type { Revenue, RevenueSource } from "@pr_hospitalagent/types";
import { lastNPeriods } from "../lib/period.ts";
import { rand } from "./seed-util.ts";

const now = new Date();
const ANCHOR = new Date(2026, 4, 10);

function daysInMonth(period: string): number {
  const [y, m] = period.split("-").map(Number) as [number, number];
  return new Date(y, m, 0).getDate();
}

type Recipe = {
  source: RevenueSource;
  baseTotal: number;
  entriesPerMonth: number;
  variance: number;
};

const recipes: Recipe[] = [
  { source: "Khám bệnh", baseTotal: 95_000_000, entriesPerMonth: 8, variance: 0.22 },
  { source: "Xét nghiệm", baseTotal: 42_000_000, entriesPerMonth: 5, variance: 0.2 },
  { source: "Bán thuốc", baseTotal: 28_000_000, entriesPerMonth: 4, variance: 0.18 },
  { source: "Dịch vụ khác", baseTotal: 12_000_000, entriesPerMonth: 3, variance: 0.3 },
];

async function run() {
  const db = await connectDB();
  const collection = db.collection<Revenue>("revenue");
  await collection.deleteMany({});
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ period: 1, source: 1 });

  const periods = lastNPeriods(12, ANCHOR);
  const docs: Revenue[] = [];
  let seq = 1;
  for (let pi = 0; pi < periods.length; pi++) {
    const p = periods[pi]!;
    const [yy, mm] = p.split("-").map(Number) as [number, number];
    const dim = daysInMonth(p);
    for (let ri = 0; ri < recipes.length; ri++) {
      const r = recipes[ri]!;
      const monthFactor = 1 + (rand(pi * 11 + ri) - 0.5) * 2 * r.variance;
      const monthTotal = Math.round(r.baseTotal * monthFactor);
      const slices: number[] = [];
      let remaining = monthTotal;
      for (let i = 0; i < r.entriesPerMonth; i++) {
        if (i === r.entriesPerMonth - 1) {
          slices.push(Math.max(0, remaining));
        } else {
          const f = 0.5 + rand(pi * 31 + ri * 7 + i) * 1.0;
          const share = Math.round(
            (monthTotal / r.entriesPerMonth) * f
          );
          const s = Math.min(share, remaining - (r.entriesPerMonth - i - 1));
          slices.push(Math.max(0, s));
          remaining -= s;
        }
      }
      for (let i = 0; i < slices.length; i++) {
        const day = Math.max(
          1,
          Math.min(dim, Math.floor(rand(pi * 41 + ri * 11 + i) * dim) + 1)
        );
        docs.push({
          id: "DT" + String(seq++).padStart(3, "0"),
          source: r.source,
          period: p,
          amount: slices[i]!,
          date: new Date(yy, mm - 1, day),
          createdAt: now,
        });
      }
    }
  }

  await collection.insertMany(docs);
  console.log(`Inserted ${docs.length} revenue entries (${periods.length} months × ${recipes.length} sources).`);
  await client.close();
}

run().catch((err) => {
  console.error("Seed revenue failed:", err);
  process.exit(1);
});
