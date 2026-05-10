"use client";

import { useMemo, useState } from "react";
import type { Payroll, PayrollStatus } from "@pr_hospitalagent/types";
import { usePayroll, payrollApi } from "@/hooks/usePayroll";
import { PayrollForm } from "../forms/PayrollForm";
import { formatVND, formatDate, formatPeriod } from "@/lib/format";

const STATUS_STYLES: Record<PayrollStatus, string> = {
  "Chưa thanh toán": "bg-rose-50 text-rose-700 ring-rose-200",
  "Đã thanh toán": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const ROLE_LABEL: Record<string, string> = {
  doctor: "Bác sĩ",
  expert: "Chuyên gia",
  manager: "Quản lý",
};

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

export function PayrollTab({ version, active, onChanged }: Props) {
  const { data, loading, error, refetch } = usePayroll(version, active);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Payroll | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<"all" | string>("all");

  const entries = data?.payroll ?? [];

  const periods = useMemo(() => {
    const set = new Set<string>();
    for (const p of entries) set.add(p.period);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const filtered = useMemo(
    () =>
      periodFilter === "all"
        ? entries
        : entries.filter((p) => p.period === periodFilter),
    [entries, periodFilter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Payroll[]>();
    for (const p of filtered) {
      const arr = map.get(p.period) ?? [];
      arr.push(p);
      map.set(p.period, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  async function handleDelete(id: string) {
    if (!confirm(`Xoá bản lương ${id}?`)) return;
    setBusy(id);
    try {
      await payrollApi.remove(id);
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
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 bg-white"
        >
          <option value="all">Tất cả kỳ ({entries.length})</option>
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

      {loading && (
        <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {grouped.map(([period, items]) => {
        const totalNet = items.reduce((s, p) => s + p.net, 0);
        const unpaid = items.filter((p) => p.status === "Chưa thanh toán").length;
        return (
          <section key={period} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[11px] uppercase tracking-wider text-gray-400 font-medium">
              <span>
                {formatPeriod(period)} · {items.length} người
                {unpaid > 0 && (
                  <span className="ml-1.5 text-rose-600 normal-case">
                    ({unpaid} chưa thanh toán)
                  </span>
                )}
              </span>
              <span className="text-gray-700 tabular-nums normal-case">
                {formatVND(totalNet)}
              </span>
            </div>
            <ul className="space-y-2">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm text-gray-900 font-medium">
                      {p.employeeName}
                    </div>
                    <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums">
                      {p.id}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {ROLE_LABEL[p.employeeRole] ?? p.employeeRole} · {p.employeeId}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                    <span className="text-gray-700 font-medium tabular-nums">
                      Thực nhận {formatVND(p.net)}
                    </span>
                    <span>CB {formatVND(p.baseSalary)}</span>
                    {p.bonus > 0 && (
                      <span className="text-emerald-700">
                        + {formatVND(p.bonus)}
                      </span>
                    )}
                    {p.deduction > 0 && (
                      <span className="text-rose-700">
                        − {formatVND(p.deduction)}
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${STATUS_STYLES[p.status]}`}
                    >
                      {p.status}
                    </span>
                    {p.paidDate && <span>📅 {formatDate(p.paidDate)}</span>}
                  </div>
                  {p.notes && (
                    <div className="mt-1 text-xs text-gray-500 italic">
                      {p.notes}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy === p.id}
                      onClick={() => handleDelete(p.id)}
                      className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {busy === p.id ? "Đang xoá…" : "Xoá"}
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
          Chưa có bản lương nào.
        </div>
      )}

      {showCreate && (
        <PayrollForm
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            refetch();
            onChanged();
          }}
        />
      )}
      {editing && (
        <PayrollForm
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
