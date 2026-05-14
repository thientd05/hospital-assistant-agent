import { connectDB, client } from "@pr_hospitalagent/api-shared";
import type {
  Doctor,
  Expert,
  Manager,
  Payroll,
  PayrollStatus,
} from "@pr_hospitalagent/types";

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

function rand(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

type Employee = {
  id: string;
  role: "doctor" | "expert" | "manager";
  name: string;
  baseSalary: number;
};

async function run() {
  const db = await connectDB();
  const doctors = await db
    .collection<Doctor>("doctors")
    .find({}, { projection: { _id: 0, id: 1, fullName: 1, title: 1 } })
    .sort({ id: 1 })
    .toArray();
  const experts = await db
    .collection<Expert>("experts")
    .find({}, { projection: { _id: 0, id: 1, fullName: 1, title: 1 } })
    .sort({ id: 1 })
    .toArray();
  const managers = await db
    .collection<Manager>("managers")
    .find({}, { projection: { _id: 0, id: 1, fullName: 1, title: 1 } })
    .sort({ id: 1 })
    .toArray();

  if (doctors.length === 0 && experts.length === 0 && managers.length === 0) {
    console.warn(
      "Không có nhân viên nào trong DB. Hãy chạy seed:doctors / seed:experts / seed:manager trước."
    );
  }

  const employees: Employee[] = [
    ...doctors.map(
      (d, i): Employee => ({
        id: d.id,
        role: "doctor",
        name: `${d.title} ${d.fullName}`.trim(),
        baseSalary: 28_000_000 + i * 1_500_000,
      })
    ),
    ...experts.map(
      (e, i): Employee => ({
        id: e.id,
        role: "expert",
        name: `${e.title} ${e.fullName}`.trim(),
        baseSalary: 25_000_000 + i * 1_200_000,
      })
    ),
    ...managers.map(
      (m): Employee => ({
        id: m.id,
        role: "manager",
        name: `${m.title} ${m.fullName}`.trim(),
        baseSalary: 35_000_000,
      })
    ),
  ];

  const collection = db.collection<Payroll>("payroll");
  await collection.deleteMany({});
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ employeeId: 1, period: 1 });

  const periods = lastNPeriods(12, ANCHOR);
  const currentPeriod = periodKey(ANCHOR);

  const docs: Payroll[] = [];
  let seq = 1;
  for (let pi = 0; pi < periods.length; pi++) {
    const p = periods[pi]!;
    const isCurrent = p === currentPeriod;
    for (let ei = 0; ei < employees.length; ei++) {
      const e = employees[ei]!;
      const r = rand(pi * 17 + ei * 3);
      const r2 = rand(pi * 23 + ei * 5);
      const bonus = Math.round(e.baseSalary * (0.05 + r * 0.15));
      const deduction = Math.round(e.baseSalary * (r2 * 0.04));
      const net = e.baseSalary + bonus - deduction;
      const status: PayrollStatus = isCurrent
        ? r < 0.4
          ? "Chưa thanh toán"
          : "Đã thanh toán"
        : "Đã thanh toán";
      const [yy, mm] = p.split("-").map(Number) as [number, number];
      const paidDate =
        status === "Đã thanh toán" ? new Date(yy, mm - 1, 28) : null;
      docs.push({
        id: "LG" + String(seq++).padStart(3, "0"),
        employeeId: e.id,
        employeeRole: e.role,
        employeeName: e.name,
        period: p,
        baseSalary: e.baseSalary,
        bonus,
        deduction,
        net,
        paidDate,
        status,
        createdAt: now,
      });
    }
  }

  if (docs.length > 0) {
    await collection.insertMany(docs);
  }
  console.log(
    `Inserted ${docs.length} payroll entries (${periods.length} months × ${employees.length} employees).`
  );
  await client.close();
}

run().catch((err) => {
  console.error("Seed payroll failed:", err);
  process.exit(1);
});
