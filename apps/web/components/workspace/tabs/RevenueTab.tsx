"use client";

import { useMemo, useState } from "react";
import type { Revenue, RevenueSource } from "@pr_hospitalagent/types";
import { useRevenue, revenueApi } from "@/hooks/useRevenue";
import { RevenueForm } from "../forms/RevenueForm";
import { formatVND, formatDate, formatPeriod } from "@/lib/format";

const SOURCE_STYLES: Record<RevenueSource, string> = {
  "Khám bệnh": "bg-teal-50 text-teal-700 ring-teal-200",
  "Xét nghiệm": "bg-violet-50 text-violet-700 ring-violet-200",
  "Bán thuốc": "bg-amber-50 text-amber-700 ring-amber-200",
  "Dịch vụ khác": "bg-gray-100 text-gray-700 ring-gray-200",
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
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1">
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
            className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 bg-white"
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
            className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671] shrink-0"
          >
            + Tạo
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {grouped.map(([period, items]) => {
        const total = items.reduce((s, r) => s + r.amount, 0);
        return (
          <section key={period} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[11px] uppercase tracking-wider text-gray-400 font-medium">
              <span>
                {formatPeriod(period)} · {items.length} mục
              </span>
              <span className="text-[#087E8B] tabular-nums normal-case font-semibold">
                {formatVND(total)}
              </span>
            </div>
            <ul className="space-y-2">
              {items.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${SOURCE_STYLES[r.source]}`}
                      >
                        {r.source}
                      </span>
                      <span className="text-sm text-gray-900 font-medium tabular-nums">
                        {formatVND(r.amount)}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums">
                      {r.id}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                    <span>📅 {formatDate(r.date)}</span>
                    {r.patientId && <span>BN {r.patientId}</span>}
                  </div>
                  {r.notes && (
                    <div className="mt-1 text-xs text-gray-500 italic">
                      {r.notes}
                    </div>
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
        <div className="text-sm text-gray-400 text-center py-6">
          Chưa có doanh thu nào.
        </div>
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? "bg-[#C8E7E9] border-[#C8E7E9] text-[#066671] font-medium"
          : "border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}
