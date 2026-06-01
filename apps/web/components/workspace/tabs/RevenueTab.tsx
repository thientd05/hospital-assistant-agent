"use client";

import { useMemo, useState } from "react";
import type { Revenue, RevenueSource } from "@pr_hospitalagent/types";
import { useRevenue, revenueApi } from "@/hooks/useRevenue";
import { RevenueForm } from "../forms/RevenueForm";
import { formatVND, formatDate, formatPeriod } from "@/lib/format";
import {
  StatCard,
  SectionTitle,
  Chip,
  Pill,
  IdPill,
  EmptyState,
  ErrorBox,
} from "@/components/admin/ui";

const SOURCE_STYLES: Record<RevenueSource, string> = {
  "Khám bệnh": "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200",
  "Xét nghiệm": "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
  "Bán thuốc": "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  "Dịch vụ khác": "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200",
};

const SOURCES: RevenueSource[] = [
  "Khám bệnh",
  "Xét nghiệm",
  "Bán thuốc",
  "Dịch vụ khác",
];

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

export function RevenueTab({ version, active, onChanged }: Props) {
  const { data, loading, error, refetch } = useRevenue(version, active);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Revenue | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | RevenueSource>("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | string>("all");

  const entries = data?.revenue ?? [];

  const periods = useMemo(() => {
    const set = new Set<string>();
    for (const r of entries) set.add(r.period);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const filtered = useMemo(
    () =>
      entries.filter(
        (r) =>
          (filter === "all" || r.source === filter) &&
          (periodFilter === "all" || r.period === periodFilter)
      ),
    [entries, filter, periodFilter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Revenue[]>();
    for (const r of filtered) {
      const arr = map.get(r.period) ?? [];
      arr.push(r);
      map.set(r.period, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalShown = useMemo(
    () => filtered.reduce((s, r) => s + r.amount, 0),
    [filtered]
  );
  const scopeLabel = [
    periodFilter === "all" ? "Mọi kỳ" : formatPeriod(periodFilter),
    filter === "all" ? "tất cả nguồn" : filter,
  ]
    .filter(Boolean)
    .join(" · ");

  async function handleDelete(id: string) {
    if (!confirm(`Xoá doanh thu ${id}?`)) return;
    setBusy(id);
    try {
      await revenueApi.remove(id);
      refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <StatCard
          label="Tổng doanh thu (đang lọc)"
          value={formatVND(totalShown)}
          subtitle={scopeLabel}
          tone="accent"
        />
        <StatCard label="Số mục" value={String(filtered.length)} />
        <StatCard label="Số kỳ" value={String(grouped.length)} />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            Tất cả nguồn
          </Chip>
          {SOURCES.map((s) => (
            <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
              {s}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="ws-input w-auto"
          >
            <option value="all">Mọi kỳ</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {formatPeriod(p)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="text-sm px-3 py-2 rounded-lg bg-[#087E8B] text-white hover:bg-[#066671] shrink-0"
          >
            + Tạo
          </button>
        </div>
      </div>

      {loading && <EmptyState>Đang tải…</EmptyState>}
      {error && <ErrorBox>{error}</ErrorBox>}

      {grouped.map(([period, items]) => {
        const total = items.reduce((s, r) => s + r.amount, 0);
        return (
          <section key={period} className="space-y-2">
            <SectionTitle right={formatVND(total)}>
              {formatPeriod(period)} · {items.length} mục
            </SectionTitle>
            <ul className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {items.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Pill className={SOURCE_STYLES[r.source]}>{r.source}</Pill>
                      <span className="text-sm text-gray-900 font-medium tabular-nums">
                        {formatVND(r.amount)}
                      </span>
                    </div>
                    <IdPill>{r.id}</IdPill>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    <span>📅 {formatDate(r.date)}</span>
                    {r.patientId && <span>BN {r.patientId}</span>}
                  </div>
                  {r.notes && (
                    <div className="mt-1 text-xs text-gray-500 italic">{r.notes}</div>
                  )}
                  <div className="mt-2 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      className="text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => handleDelete(r.id)}
                      className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {busy === r.id ? "Đang xoá…" : "Xoá"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!loading && grouped.length === 0 && (
        <EmptyState>Chưa có doanh thu nào.</EmptyState>
      )}

      {showCreate && (
        <RevenueForm
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            refetch();
            onChanged();
          }}
        />
      )}
      {editing && (
        <RevenueForm
          editId={editing.id}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
