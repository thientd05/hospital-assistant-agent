"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCustomerStats, useFinancialStats } from "@/hooks/useStats";
import { useDoctors } from "@/hooks/useDoctors";
import { useExperts } from "@/hooks/useExperts";
import { usePatients } from "@/hooks/usePatients";
import { formatVND, formatVNDCompact, formatPeriod } from "@/lib/format";
import {
  StatCard,
  SectionTitle,
  ChartCard,
  EmptyState,
  ErrorBox,
  CHART_TOOLTIP_STYLE,
  CHART_AXIS_TICK,
} from "@/components/admin/ui";

type Props = {
  version: number;
  active: boolean;
  navigate: (key: string) => void;
};

export function OverviewTab({ version, active, navigate }: Props) {
  const customer = useCustomerStats(version, active);
  const fin = useFinancialStats(version, active);
  const doctors = useDoctors(version, active);
  const experts = useExperts(version, active);
  const patients = usePatients(version, active);

  const trendData = useMemo(
    () =>
      (fin.data?.monthlyTrend ?? []).map((m) => ({
        period: formatPeriod(m.period),
        "Doanh thu": m.revenue,
        "Chi phí": m.expensesPayroll + m.expensesUtilities,
        "Lợi nhuận": m.profit,
      })),
    [fin.data]
  );

  if (customer.loading || fin.loading) {
    return <EmptyState>Đang tải…</EmptyState>;
  }
  if (customer.error) return <ErrorBox>{customer.error}</ErrorBox>;
  if (fin.error) return <ErrorBox>{fin.error}</ErrorBox>;
  if (!customer.data || !fin.data) return <EmptyState>Chưa có dữ liệu.</EmptyState>;

  const f = fin.data;
  const totalExpenses =
    f.currentMonth.expensesPayroll + f.currentMonth.expensesUtilities;
  const profit = f.currentMonth.profit;

  const warnings: string[] = [];
  if (f.payroll.unpaidCount > 0)
    warnings.push(
      `Còn ${f.payroll.unpaidCount} bản lương tháng này chưa thanh toán.`
    );
  if (f.revenueBySource.length === 0)
    warnings.push("Chưa có doanh thu nào trong tháng hiện tại.");
  if (f.expensesByCategory.length === 0)
    warnings.push("Chưa có chi phí nào trong tháng hiện tại.");

  return (
    <div className="space-y-6">
      {/* KPI hàng đầu */}
      <div>
        <SectionTitle>Tháng {formatPeriod(f.currentMonth.period)}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Doanh thu"
            value={formatVND(f.currentMonth.revenue)}
            tone="accent"
          />
          <StatCard
            label="Chi phí"
            value={formatVND(totalExpenses)}
            subtitle={`Lương ${formatVNDCompact(
              f.currentMonth.expensesPayroll
            )} · ĐN ${formatVNDCompact(f.currentMonth.expensesUtilities)}`}
          />
          <StatCard
            label="Lợi nhuận"
            value={formatVND(profit)}
            tone={profit >= 0 ? "accent" : "danger"}
          />
          <StatCard
            label="Tổng giá trị tài sản"
            value={formatVND(f.assets.totalValue)}
            subtitle={`${f.assets.total} tài sản`}
          />
        </div>
      </div>

      {/* Cảnh báo */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-0.5">
          {warnings.map((w) => (
            <div key={w}>⚠ {w}</div>
          ))}
        </div>
      )}

      {/* Biểu đồ chính + drill-down */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard
          title="Doanh thu / Chi phí 12 tháng"
          empty={trendData.length === 0}
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={trendData}
              margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
            >
              <defs>
                <linearGradient id="ovRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#087E8B" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#087E8B" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="ovExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="ovPro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="period" tick={CHART_AXIS_TICK} tickLine={false} />
              <YAxis
                tick={CHART_AXIS_TICK}
                tickFormatter={(v: number) => formatVNDCompact(v)}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(v) => formatVND(Number(v))}
                labelStyle={{ fontSize: 12 }}
                contentStyle={CHART_TOOLTIP_STYLE}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Doanh thu" stroke="#087E8B" fill="url(#ovRev)" strokeWidth={2} />
              <Area type="monotone" dataKey="Chi phí" stroke="#F59E0B" fill="url(#ovExp)" strokeWidth={2} />
              <Area type="monotone" dataKey="Lợi nhuận" stroke="#3B82F6" fill="url(#ovPro)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="space-y-3">
          <SectionTitle>Truy cập nhanh</SectionTitle>
          <DrillCard
            title="Thống kê chi tiết"
            onClick={() => navigate("stats")}
            lines={[
              `${customer.data.patients.total} bệnh nhân · ${customer.data.appointments.total} cuộc hẹn`,
            ]}
          />
          <DrillCard
            title="Tài khoản"
            onClick={() => navigate("accounts")}
            lines={[
              `${doctors.data?.count ?? 0} bác sĩ · ${
                experts.data?.count ?? 0
              } chuyên gia · ${patients.data?.count ?? 0} bệnh nhân`,
            ]}
          />
          <DrillCard
            title="Chi phí tháng"
            onClick={() => navigate("expenses")}
            value={formatVND(totalExpenses)}
            lines={
              f.payroll.unpaidCount > 0
                ? [`${f.payroll.unpaidCount} bản lương chưa thanh toán`]
                : ["Đã thanh toán đủ"]
            }
          />
          <DrillCard
            title="Doanh thu tháng"
            onClick={() => navigate("revenue")}
            value={formatVND(f.currentMonth.revenue)}
            lines={[`${f.revenueBySource.length} nguồn doanh thu`]}
          />
        </div>
      </div>
    </div>
  );
}

function DrillCard({
  title,
  value,
  lines,
  onClick,
}: {
  title: string;
  value?: string;
  lines: string[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-[#9FD4D8] hover:bg-[#F0FAFB]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <span className="text-[#087E8B]" aria-hidden>
          →
        </span>
      </div>
      {value && (
        <div className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
          {value}
        </div>
      )}
      {lines.map((l) => (
        <div key={l} className="mt-0.5 text-[11px] text-gray-500">
          {l}
        </div>
      ))}
    </button>
  );
}
