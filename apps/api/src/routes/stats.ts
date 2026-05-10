import type { FastifyInstance } from "fastify";
import type {
  Appointment,
  Asset,
  Doctor,
  FinancialMonthPoint,
  FinancialStatsData,
  Patient,
  Payroll,
  Revenue,
  Utility,
} from "@pr_hospitalagent/types";
import { verifyAuth } from "../auth/middleware.ts";
import { requireRole } from "../auth/role-guard.ts";
import { connectDB } from "../db/client.ts";

function ageBucket(age: number): "0-17" | "18-39" | "40-59" | "60+" {
  if (age <= 17) return "0-17";
  if (age <= 39) return "18-39";
  if (age <= 59) return "40-59";
  return "60+";
}

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
    const d = new Date(y, m - i, 1);
    out.push(periodKey(d));
  }
  return out;
}

export async function statsRoutes(app: FastifyInstance) {
  app.get(
    "/stats/customers",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => {
      const q = req.query as Record<string, unknown>;
      const topDiagN =
        typeof q.topDiagnoses === "string" && Number(q.topDiagnoses) > 0
          ? Math.floor(Number(q.topDiagnoses))
          : 10;
      const topWardsN =
        typeof q.topWards === "string" && Number(q.topWards) > 0
          ? Math.floor(Number(q.topWards))
          : 10;

      const db = await connectDB();

      const patients = await db
        .collection<Patient>("patients")
        .find({}, { projection: { _id: 0, passwordHash: 0 } })
        .toArray();

      const byGender: Record<string, number> = {};
      const byAgeGroup: Record<"0-17" | "18-39" | "40-59" | "60+", number> = {
        "0-17": 0,
        "18-39": 0,
        "40-59": 0,
        "60+": 0,
      };
      const wardCount = new Map<string, number>();
      const diagCount = new Map<string, number>();
      let withAbnormalLab = 0;

      for (const p of patients) {
        byGender[p.gender] = (byGender[p.gender] ?? 0) + 1;
        byAgeGroup[ageBucket(p.age)] += 1;
        if (p.ward) wardCount.set(p.ward, (wardCount.get(p.ward) ?? 0) + 1);
        for (const d of p.diagnoses ?? []) {
          diagCount.set(d, (diagCount.get(d) ?? 0) + 1);
        }
        if ((p.labResults ?? []).some((l) => l.isAbnormal)) {
          withAbnormalLab += 1;
        }
      }

      const byWard = Array.from(wardCount.entries())
        .map(([ward, count]) => ({ ward, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topWardsN);

      const topDiagnoses = Array.from(diagCount.entries())
        .map(([diagnosis, count]) => ({ diagnosis, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topDiagN);

      const appointments = await db
        .collection<Appointment>("appointments")
        .find({}, { projection: { _id: 0 } })
        .toArray();

      const apptByStatus: Record<string, number> = {};
      const apptByDoctor = new Map<string, number>();
      for (const a of appointments) {
        apptByStatus[a.status] = (apptByStatus[a.status] ?? 0) + 1;
        apptByDoctor.set(a.doctorId, (apptByDoctor.get(a.doctorId) ?? 0) + 1);
      }

      const doctorIds = Array.from(apptByDoctor.keys());
      const doctors = doctorIds.length
        ? await db
            .collection<Doctor>("doctors")
            .find(
              { id: { $in: doctorIds } },
              { projection: { id: 1, fullName: 1, _id: 0 } }
            )
            .toArray()
        : [];
      const nameById = new Map(doctors.map((d) => [d.id, d.fullName]));

      const byDoctor = Array.from(apptByDoctor.entries())
        .map(([doctorId, count]) => ({
          doctorId,
          doctorName: nameById.get(doctorId) ?? null,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        patients: {
          total: patients.length,
          byGender,
          byAgeGroup,
          byWard,
          topDiagnoses,
          withAbnormalLab,
        },
        appointments: {
          total: appointments.length,
          byStatus: apptByStatus,
          byDoctor,
        },
      };
    }
  );

  app.get(
    "/stats/financial",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (): Promise<FinancialStatsData> => {
      const db = await connectDB();
      const [revenue, utilities, payroll, assets] = await Promise.all([
        db
          .collection<Revenue>("revenue")
          .find({}, { projection: { _id: 0 } })
          .toArray(),
        db
          .collection<Utility>("utilities")
          .find({}, { projection: { _id: 0 } })
          .toArray(),
        db
          .collection<Payroll>("payroll")
          .find({}, { projection: { _id: 0 } })
          .toArray(),
        db
          .collection<Asset>("assets")
          .find({}, { projection: { _id: 0 } })
          .toArray(),
      ]);

      const today = new Date();
      const currentPeriod = periodKey(today);
      const periods = lastNPeriods(12, today);

      const revByPeriod = new Map<string, number>();
      for (const r of revenue) {
        revByPeriod.set(r.period, (revByPeriod.get(r.period) ?? 0) + r.amount);
      }
      const utilByPeriod = new Map<string, number>();
      for (const u of utilities) {
        utilByPeriod.set(
          u.period,
          (utilByPeriod.get(u.period) ?? 0) + u.amount
        );
      }
      const payByPeriod = new Map<string, number>();
      for (const p of payroll) {
        payByPeriod.set(p.period, (payByPeriod.get(p.period) ?? 0) + p.net);
      }

      const monthlyTrend: FinancialMonthPoint[] = periods.map((p) => {
        const rev = revByPeriod.get(p) ?? 0;
        const util = utilByPeriod.get(p) ?? 0;
        const pay = payByPeriod.get(p) ?? 0;
        return {
          period: p,
          revenue: rev,
          expensesPayroll: pay,
          expensesUtilities: util,
          profit: rev - pay - util,
        };
      });
      const currentMonth =
        monthlyTrend.find((m) => m.period === currentPeriod) ?? {
          period: currentPeriod,
          revenue: 0,
          expensesPayroll: 0,
          expensesUtilities: 0,
          profit: 0,
        };

      const revSrc = new Map<string, number>();
      for (const r of revenue) {
        if (r.period === currentPeriod) {
          revSrc.set(r.source, (revSrc.get(r.source) ?? 0) + r.amount);
        }
      }
      const revenueBySource = Array.from(revSrc.entries())
        .map(([source, amount]) => ({ source, amount }))
        .sort((a, b) => b.amount - a.amount);

      const expCat = new Map<string, number>();
      if (currentMonth.expensesPayroll > 0) {
        expCat.set("Lương", currentMonth.expensesPayroll);
      }
      for (const u of utilities) {
        if (u.period === currentPeriod) {
          expCat.set(u.type, (expCat.get(u.type) ?? 0) + u.amount);
        }
      }
      const expensesByCategory = Array.from(expCat.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      const utilType = new Map<string, number>();
      const periodSet = new Set(periods);
      for (const u of utilities) {
        if (periodSet.has(u.period)) {
          utilType.set(u.type, (utilType.get(u.type) ?? 0) + u.amount);
        }
      }
      const utilitiesByType = Array.from(utilType.entries())
        .map(([type, amount]) => ({ type, amount }))
        .sort((a, b) => b.amount - a.amount);

      const assetCat = new Map<string, { count: number; value: number }>();
      const assetCond = new Map<string, number>();
      let assetTotalValue = 0;
      for (const a of assets) {
        const c = assetCat.get(a.category) ?? { count: 0, value: 0 };
        c.count += 1;
        c.value += a.purchasePrice;
        assetCat.set(a.category, c);
        assetCond.set(a.condition, (assetCond.get(a.condition) ?? 0) + 1);
        assetTotalValue += a.purchasePrice;
      }
      const assetsByCategory = Array.from(assetCat.entries())
        .map(([category, v]) => ({ category, count: v.count, value: v.value }))
        .sort((a, b) => b.value - a.value);
      const assetsByCondition = Array.from(assetCond.entries())
        .map(([condition, count]) => ({ condition, count }))
        .sort((a, b) => b.count - a.count);

      let payrollUnpaid = 0;
      for (const p of payroll) {
        if (p.period === currentPeriod && p.status === "Chưa thanh toán") {
          payrollUnpaid += 1;
        }
      }

      return {
        currentMonth,
        monthlyTrend,
        revenueBySource,
        expensesByCategory,
        utilitiesByType,
        assets: {
          total: assets.length,
          totalValue: assetTotalValue,
          byCategory: assetsByCategory,
          byCondition: assetsByCondition,
        },
        payroll: {
          currentMonthTotal: currentMonth.expensesPayroll,
          unpaidCount: payrollUnpaid,
        },
      };
    }
  );
}
