"use client";

import { useMemo, useState } from "react";
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
import {
  StatCard,
  SectionTitle,
  ChartCard,
  Bar as PctBar,
  Segmented,
  Pill,
  EmptyState,
  ErrorBox,
  CHART_PALETTE,
  CHART_TOOLTIP_STYLE,
  CHART_AXIS_TICK,
} from "@/components/admin/ui";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  "Chờ duyệt": "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  "Đã duyệt": "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
};

const AGE_GROUPS = ["0-17", "18-39", "40-59", "60+"] as const;

type View = "financial" | "patients";

type Props = {
  version: number;
  active: boolean;
};

export function StatsTab({ version, active }: Props) {
  const customer = useCustomerStats(version, active);
  const fin = useFinancialStats(version, active);
  const [view, setView] = useState<View>("financial");

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

  if (customer.loading || fin.loading) return <EmptyState>Đang tải…</EmptyState>;
  if (customer.error) return <ErrorBox>{customer.error}</ErrorBox>;
  if (fin.error) return <ErrorBox>{fin.error}</ErrorBox>;
  if (!customer.data || !fin.data)
    return <EmptyState>Chưa có dữ liệu.</EmptyState>;

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
    <div className="space-y-6">
      <Segmented<View>
        value={view}
        onChange={setView}
        options={[
          { key: "financial", label: "Tài chính" },
          { key: "patients", label: "Bệnh nhân & Cuộc hẹn" },
        ]}
      />

      {view === "financial" ? (
        <div className="space-y-6">
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

          <ChartCard
            title="Doanh thu / Chi phí 12 tháng"
            empty={trendData.length === 0}
          >
            <ResponsiveContainer width="100%" height={280}>
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
                <Area type="monotone" dataKey="Doanh thu" stroke="#087E8B" fill="url(#gradRev)" strokeWidth={2} />
                <Area type="monotone" dataKey="Chi phí" stroke="#F59E0B" fill="url(#gradExp)" strokeWidth={2} />
                <Area type="monotone" dataKey="Lợi nhuận" stroke="#3B82F6" fill="url(#gradPro)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Phân bổ chi phí tháng"
              empty={f.expensesByCategory.length === 0}
            >
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={f.expensesByCategory}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {f.expensesByCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatVND(Number(v))}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Doanh thu theo nguồn"
              empty={f.revenueBySource.length === 0}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={f.revenueBySource}
                  margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="source" tick={{ ...CHART_AXIS_TICK, fontSize: 10 }} tickLine={false} />
                  <YAxis
                    tick={CHART_AXIS_TICK}
                    tickFormatter={(v: number) => formatVNDCompact(v)}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v) => formatVND(Number(v))}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {f.revenueBySource.map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Tài sản theo loại"
              empty={f.assets.byCategory.length === 0}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={f.assets.byCategory}
                  layout="vertical"
                  margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    type="number"
                    tick={CHART_AXIS_TICK}
                    tickFormatter={(v: number) => formatVNDCompact(v)}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={CHART_AXIS_TICK}
                    tickLine={false}
                    width={86}
                  />
                  <Tooltip
                    formatter={(v, k) =>
                      k === "value" ? formatVND(Number(v)) : `${v} cái`
                    }
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Bar dataKey="value" fill="#087E8B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Tiện ích theo loại (12 tháng)"
              empty={f.utilitiesByType.length === 0}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={f.utilitiesByType}
                  margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="type" tick={CHART_AXIS_TICK} tickLine={false} />
                  <YAxis
                    tick={CHART_AXIS_TICK}
                    tickFormatter={(v: number) => formatVNDCompact(v)}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v) => formatVND(Number(v))}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {f.utilitiesByType.map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[(i + 1) % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Tổng bệnh nhân" value={String(patients.total)} tone="accent" />
            <StatCard label="Tổng cuộc hẹn" value={String(appointments.total)} tone="accent" />
            <StatCard
              label="XN bất thường"
              value={String(patients.withAbnormalLab)}
              subtitle={`/ ${patients.total} BN có ≥1 chỉ số bất thường`}
            />
            <StatCard
              label="Cuộc hẹn chờ duyệt"
              value={String(appointments.byStatus["Chờ duyệt"] ?? 0)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {genderEntries.length > 0 && (
              <ListCard title="Theo giới tính">
                {genderEntries.map(([g, c]) => (
                  <PctBar key={g} label={g} value={c} total={patients.total} />
                ))}
              </ListCard>
            )}

            <ListCard title="Theo độ tuổi">
              {AGE_GROUPS.map((g) => (
                <PctBar
                  key={g}
                  label={g}
                  value={patients.byAgeGroup[g] ?? 0}
                  total={patients.total}
                />
              ))}
            </ListCard>

            {patients.byWard.length > 0 && (
              <ListCard title="Khoa / phòng">
                {patients.byWard.map((w) => (
                  <PctBar key={w.ward} label={w.ward} value={w.count} total={patients.total} />
                ))}
              </ListCard>
            )}

            {patients.topDiagnoses.length > 0 && (
              <ListCard title="Top chẩn đoán">
                {patients.topDiagnoses.map((d) => (
                  <PctBar
                    key={d.diagnosis}
                    label={d.diagnosis}
                    value={d.count}
                    total={patients.total}
                    rightLabel={`${d.count} BN`}
                  />
                ))}
              </ListCard>
            )}

            {appointments.byDoctor.length > 0 && (
              <ListCard title="Cuộc hẹn theo bác sĩ">
                {appointments.byDoctor.map((d) => (
                  <PctBar
                    key={d.doctorId}
                    label={d.doctorName ?? d.doctorId}
                    value={d.count}
                    total={appointments.total}
                    rightLabel={`${d.count}`}
                  />
                ))}
              </ListCard>
            )}

            {statusEntries.length > 0 && (
              <div>
                <SectionTitle>Cuộc hẹn theo trạng thái</SectionTitle>
                <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-wrap gap-2">
                  {statusEntries.map(([s, c]) => (
                    <Pill key={s} className={STATUS_STYLES[s]}>
                      {s} · {c}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ListCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <ul className="rounded-xl border border-gray-200 bg-white p-4 space-y-2.5">
        {children}
      </ul>
    </div>
  );
}
