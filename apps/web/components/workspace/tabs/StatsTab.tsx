"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppointmentStatus } from "@pr_hospitalagent/types";
import { useCustomerStats, useFinancialStats } from "@/hooks/useStats";
import { formatVND, formatVNDCompact, formatPeriod } from "@/lib/format";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  "Chờ duyệt": "bg-amber-50 text-amber-700 ring-amber-200",
  "Đã duyệt": "bg-blue-50 text-blue-700 ring-blue-200",
};

const AGE_GROUPS = ["0-17", "18-39", "40-59", "60+"] as const;

const CHART_COLORS = [
  "#087E8B",
  "#F59E0B",
  "#3B82F6",
  "#8B5CF6",
  "#EF4444",
  "#10B981",
  "#EC4899",
  "#6366F1",
];

type Props = {
  version: number;
  active: boolean;
};

export function StatsTab({ version, active }: Props) {
  const customer = useCustomerStats(version, active);
  const fin = useFinancialStats(version, active);

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
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">
        Đang tải…
      </div>
    );
  }
  if (customer.error) {
    return <div className="px-5 py-4 text-sm text-red-600">{customer.error}</div>;
  }
  if (fin.error) {
    return <div className="px-5 py-4 text-sm text-red-600">{fin.error}</div>;
  }
  if (!customer.data || !fin.data) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">
        Chưa có dữ liệu.
      </div>
    );
  }

  const { patients, appointments } = customer.data;
  const f = fin.data;
  const totalExpenses =
    f.currentMonth.expensesPayroll + f.currentMonth.expensesUtilities;
  const profit = f.currentMonth.profit;
  const genderEntries = Object.entries(patients.byGender);
  const statusEntries = Object.entries(appointments.byStatus) as Array<
    [AppointmentStatus, number]
  >;

  return (
    <div className="px-5 py-4 space-y-6">
      <div>
        <SectionTitle>
          Tài chính · {formatPeriod(f.currentMonth.period)}
        </SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi
            label="Doanh thu tháng"
            value={formatVND(f.currentMonth.revenue)}
            tone="teal"
          />
          <Kpi
            label="Chi phí tháng"
            value={formatVND(totalExpenses)}
            tone="amber"
            subtitle={`Lương ${formatVNDCompact(
              f.currentMonth.expensesPayroll
            )} · ĐN ${formatVNDCompact(f.currentMonth.expensesUtilities)}`}
          />
          <Kpi
            label="Lợi nhuận tháng"
            value={formatVND(profit)}
            tone={profit >= 0 ? "emerald" : "rose"}
          />
          <Kpi
            label="Tổng giá trị tài sản"
            value={formatVND(f.assets.totalValue)}
            tone="violet"
            subtitle={`${f.assets.total} tài sản`}
          />
        </div>
      </div>

      {(f.payroll.unpaidCount > 0 ||
        f.expensesByCategory.length === 0 ||
        f.revenueBySource.length === 0) && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 space-y-0.5">
          {f.payroll.unpaidCount > 0 && (
            <div>
              ⚠ Còn <b>{f.payroll.unpaidCount}</b> bản lương tháng này chưa thanh toán.
            </div>
          )}
          {f.revenueBySource.length === 0 && (
            <div>⚠ Chưa có doanh thu nào trong tháng hiện tại.</div>
          )}
          {f.expensesByCategory.length === 0 && (
            <div>⚠ Chưa có chi phí nào trong tháng hiện tại.</div>
          )}
        </div>
      )}

      <section>
        <SectionTitle>Doanh thu / Chi phí 12 tháng</SectionTitle>
        <div className="rounded-lg border border-gray-200 p-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={trendData}
              margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
            >
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#087E8B" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#087E8B" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="gradPro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickFormatter={(v: number) => formatVNDCompact(v)}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(v) => formatVND(Number(v))}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #E5E7EB",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="Doanh thu"
                stroke="#087E8B"
                fill="url(#gradRev)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Chi phí"
                stroke="#F59E0B"
                fill="url(#gradExp)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Lợi nhuận"
                stroke="#3B82F6"
                fill="url(#gradPro)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section>
          <SectionTitle>Phân bổ chi phí tháng</SectionTitle>
          <div className="rounded-lg border border-gray-200 p-2">
            {f.expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={f.expensesByCategory}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {f.expensesByCategory.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatVND(Number(v))}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid #E5E7EB",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    iconSize={8}
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-400 text-center py-12">
                Chưa có chi phí.
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>Doanh thu theo nguồn</SectionTitle>
          <div className="rounded-lg border border-gray-200 p-2">
            {f.revenueBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={f.revenueBySource}
                  margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="source"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickFormatter={(v: number) => formatVNDCompact(v)}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v) => formatVND(Number(v))}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid #E5E7EB",
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {f.revenueBySource.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-400 text-center py-12">
                Chưa có doanh thu tháng này.
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>Tài sản theo loại</SectionTitle>
          <div className="rounded-lg border border-gray-200 p-2">
            {f.assets.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={f.assets.byCategory}
                  layout="vertical"
                  margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickFormatter={(v: number) => formatVNDCompact(v)}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                    width={86}
                  />
                  <Tooltip
                    formatter={(v, k) =>
                      k === "value" ? formatVND(Number(v)) : `${v} cái`
                    }
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid #E5E7EB",
                    }}
                  />
                  <Bar dataKey="value" fill="#087E8B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-400 text-center py-12">
                Chưa có tài sản.
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>Tiện ích theo loại (12 tháng)</SectionTitle>
          <div className="rounded-lg border border-gray-200 p-2">
            {f.utilitiesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={f.utilitiesByType}
                  margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickFormatter={(v: number) => formatVNDCompact(v)}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v) => formatVND(Number(v))}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid #E5E7EB",
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {f.utilitiesByType.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-400 text-center py-12">
                Chưa có hoá đơn nào.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-6">
        <SectionTitle>Bệnh nhân & Cuộc hẹn</SectionTitle>

        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Tổng bệnh nhân" value={String(patients.total)} tone="teal" />
          <Kpi
            label="Tổng cuộc hẹn"
            value={String(appointments.total)}
            tone="violet"
          />
        </div>

        {genderEntries.length > 0 && (
          <section>
            <SmallTitle>Theo giới tính</SmallTitle>
            <ul className="space-y-2">
              {genderEntries.map(([g, c]) => (
                <Bar2 key={g} label={g} value={c} total={patients.total} />
              ))}
            </ul>
          </section>
        )}

        <section>
          <SmallTitle>Theo độ tuổi</SmallTitle>
          <ul className="space-y-2">
            {AGE_GROUPS.map((g) => (
              <Bar2
                key={g}
                label={g}
                value={patients.byAgeGroup[g] ?? 0}
                total={patients.total}
              />
            ))}
          </ul>
        </section>

        {patients.byWard.length > 0 && (
          <section>
            <SmallTitle>Khoa / phòng</SmallTitle>
            <ul className="space-y-2">
              {patients.byWard.map((w) => (
                <Bar2
                  key={w.ward}
                  label={w.ward}
                  value={w.count}
                  total={patients.total}
                />
              ))}
            </ul>
          </section>
        )}

        {patients.topDiagnoses.length > 0 && (
          <section>
            <SmallTitle>Top chẩn đoán</SmallTitle>
            <ul className="space-y-2">
              {patients.topDiagnoses.map((d) => (
                <Bar2
                  key={d.diagnosis}
                  label={d.diagnosis}
                  value={d.count}
                  total={patients.total}
                  rightLabel={`${d.count} BN`}
                />
              ))}
            </ul>
          </section>
        )}

        <section>
          <SmallTitle>Xét nghiệm bất thường</SmallTitle>
          <div className="text-sm text-gray-700">
            <span className="font-semibold tabular-nums">
              {patients.withAbnormalLab}
            </span>
            <span className="text-gray-500">
              {" / "}
              {patients.total} BN có ít nhất 1 chỉ số bất thường
            </span>
          </div>
        </section>

        {statusEntries.length > 0 && (
          <section>
            <SmallTitle>Cuộc hẹn theo trạng thái</SmallTitle>
            <div className="flex flex-wrap gap-2">
              {statusEntries.map(([s, c]) => (
                <span
                  key={s}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${STATUS_STYLES[s]}`}
                >
                  {s} · {c}
                </span>
              ))}
            </div>
          </section>
        )}

        {appointments.byDoctor.length > 0 && (
          <section>
            <SmallTitle>Cuộc hẹn theo bác sĩ</SmallTitle>
            <ul className="space-y-2">
              {appointments.byDoctor.map((d) => (
                <Bar2
                  key={d.doctorId}
                  label={d.doctorName ?? d.doctorId}
                  value={d.count}
                  total={appointments.total}
                  rightLabel={`${d.count}`}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2">
      {children}
    </div>
  );
}

function SmallTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2">
      {children}
    </div>
  );
}

const TONES: Record<string, string> = {
  teal: "border-[#C8E7E9] bg-[#C8E7E9]/30",
  amber: "border-amber-200 bg-amber-50/50",
  emerald: "border-emerald-200 bg-emerald-50/50",
  rose: "border-rose-200 bg-rose-50/50",
  violet: "border-violet-200 bg-violet-50/50",
};

const TONE_TEXT: Record<string, string> = {
  teal: "text-[#087E8B]",
  amber: "text-amber-700",
  emerald: "text-emerald-700",
  rose: "text-rose-700",
  violet: "text-violet-700",
};

function Kpi({
  label,
  value,
  subtitle,
  tone = "teal",
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${TONES[tone]}`}>
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </div>
      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums ${TONE_TEXT[tone]}`}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-[11px] text-gray-500 mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}

function Bar2({
  label,
  value,
  total,
  rightLabel,
}: {
  label: string;
  value: number;
  total: number;
  rightLabel?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-gray-700 truncate">{label}</span>
        <span className="text-gray-500 tabular-nums shrink-0">
          {rightLabel ?? `${value} · ${pct}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-[#087E8B]" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}
