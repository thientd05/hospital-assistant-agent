import type {
  FinancialMonthPoint,
  FinancialStatsData,
} from "@pr_hospitalagent/types";
import { revenueRepo } from "../../repositories/revenue.repo.ts";
import { utilityRepo } from "../../repositories/utility.repo.ts";
import { payrollRepo } from "../../repositories/payroll.repo.ts";
import { assetRepo } from "../../repositories/asset.repo.ts";
import { periodKey, lastNPeriods } from "../../lib/period.ts";

export const financialStatsService = {
  async build(): Promise<FinancialStatsData> {
    const [revenue, utilities, payroll, assets] = await Promise.all([
      revenueRepo.listAll(),
      utilityRepo.listAll(),
      payrollRepo.listAll(),
      assetRepo.listAll(),
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
      utilByPeriod.set(u.period, (utilByPeriod.get(u.period) ?? 0) + u.amount);
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
  },
};
