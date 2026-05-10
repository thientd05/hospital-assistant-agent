"use client";

import { useMemo, useState } from "react";
import type {
  Utility,
  UtilityStatus,
  UtilityType,
} from "@pr_hospitalagent/types";
import { useUtilities, utilitiesApi } from "@/hooks/useUtilities";
import { UtilityForm } from "../forms/UtilityForm";
import { formatVND, formatDate, formatPeriod } from "@/lib/format";

const TYPE_STYLES: Record<UtilityType, string> = {
  "Điện": "bg-amber-50 text-amber-700 ring-amber-200",
  "Nước": "bg-blue-50 text-blue-700 ring-blue-200",
  Internet: "bg-violet-50 text-violet-700 ring-violet-200",
  Gas: "bg-orange-50 text-orange-700 ring-orange-200",
};
const STATUS_STYLES: Record<UtilityStatus, string> = {
  "Chưa thanh toán": "bg-rose-50 text-rose-700 ring-rose-200",
  "Đã thanh toán": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

export function UtilitiesTab({ version, active, onChanged }: Props) {
  const { data, loading, error, refetch } = useUtilities(version, active);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Utility | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | UtilityType>("all");

  const utilities = data?.utilities ?? [];
  const filtered = useMemo(
    () =>
      filter === "all" ? utilities : utilities.filter((u) => u.type === filter),
    [utilities, filter]
  );
  const grouped = useMemo(() => {
    const map = new Map<string, Utility[]>();
    for (const u of filtered) {
      const arr = map.get(u.period) ?? [];
      arr.push(u);
      map.set(u.period, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  async function handleDelete(id: string) {
    if (!confirm(`Xoá hoá đơn ${id}?`)) return;
    setBusy(id);
    try {
      await utilitiesApi.remove(id);
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            Tất cả
          </Chip>
          {(["Điện", "Nước", "Internet", "Gas"] as UtilityType[]).map((t) => (
            <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>
              {t}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671] shrink-0"
        >
          + Tạo
        </button>
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
        const total = items.reduce((s, u) => s + u.amount, 0);
        return (
          <section key={period} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[11px] uppercase tracking-wider text-gray-400 font-medium">
              <span>{formatPeriod(period)}</span>
              <span className="text-gray-700 tabular-nums normal-case">
                {formatVND(total)}
              </span>
            </div>
            <ul className="space-y-2">
              {items.map((u) => (
                <li
                  key={u.id}
                  className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${TYPE_STYLES[u.type]}`}
                      >
                        {u.type}
                      </span>
                      <span className="text-sm text-gray-900 font-medium tabular-nums">
                        {formatVND(u.amount)}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums">
                      {u.id}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                    <span>
                      {u.usage} {u.unit}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${STATUS_STYLES[u.status]}`}
                    >
                      {u.status}
                    </span>
                    {u.paidDate && <span>📅 {formatDate(u.paidDate)}</span>}
                  </div>
                  {u.notes && (
                    <div className="mt-1 text-xs text-gray-500 italic">
                      {u.notes}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(u)}
                      className="text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy === u.id}
                      onClick={() => handleDelete(u.id)}
                      className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {busy === u.id ? "Đang xoá…" : "Xoá"}
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
          Chưa có hoá đơn nào.
        </div>
      )}

      {showCreate && (
        <UtilityForm
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            refetch();
            onChanged();
          }}
        />
      )}
      {editing && (
        <UtilityForm
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
