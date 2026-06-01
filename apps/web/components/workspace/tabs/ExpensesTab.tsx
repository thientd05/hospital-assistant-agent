"use client";

import { useMemo, useState } from "react";
import type {
  Asset,
  AssetCategory,
  AssetCondition,
  Payroll,
  PayrollStatus,
  Utility,
  UtilityStatus,
  UtilityType,
} from "@pr_hospitalagent/types";
import { useAssets, assetsApi } from "@/hooks/useAssets";
import { useUtilities, utilitiesApi } from "@/hooks/useUtilities";
import { usePayroll, payrollApi } from "@/hooks/usePayroll";
import { AssetForm } from "../forms/AssetForm";
import { UtilityForm } from "../forms/UtilityForm";
import { PayrollForm } from "../forms/PayrollForm";
import {
  formatVND,
  formatVNDCompact,
  formatDate,
  formatPeriod,
} from "@/lib/format";
import {
  StatCard,
  SectionTitle,
  Chip,
  Pill,
  IdPill,
  EmptyState,
  ErrorBox,
} from "@/components/admin/ui";

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

type Category = "assets" | "utilities" | "payroll";

const CATEGORY_META: Record<
  Category,
  { label: string; dot: string; unitLabel: string }
> = {
  assets: { label: "Cơ sở vật chất", dot: "bg-[#087E8B]", unitLabel: "tài sản" },
  utilities: { label: "Điện nước", dot: "bg-sky-500", unitLabel: "hoá đơn" },
  payroll: { label: "Lương", dot: "bg-violet-500", unitLabel: "bản lương" },
};

export function ExpensesTab({ version, active, onChanged }: Props) {
  const assets = useAssets(version, active);
  const utilities = useUtilities(version, active);
  const payroll = usePayroll(version, active);

  const [tab, setTab] = useState<Category>("assets");

  const assetItems = assets.data?.assets ?? [];
  const utilityItems = utilities.data?.utilities ?? [];
  const payrollItems = payroll.data?.payroll ?? [];

  const summary = useMemo(() => {
    const assetTotal = assetItems.reduce((s, a) => s + a.purchasePrice, 0);
    const utilityTotal = utilityItems.reduce((s, u) => s + u.amount, 0);
    const payrollTotal = payrollItems.reduce((s, p) => s + p.net, 0);
    const utilityUnpaid = utilityItems.filter(
      (u) => u.status === "Chưa thanh toán"
    ).length;
    const payrollUnpaid = payrollItems.filter(
      (p) => p.status === "Chưa thanh toán"
    ).length;
    return {
      assets: { total: assetTotal, count: assetItems.length, unpaid: 0 },
      utilities: {
        total: utilityTotal,
        count: utilityItems.length,
        unpaid: utilityUnpaid,
      },
      payroll: {
        total: payrollTotal,
        count: payrollItems.length,
        unpaid: payrollUnpaid,
      },
      grandTotal: assetTotal + utilityTotal + payrollTotal,
    };
  }, [assetItems, utilityItems, payrollItems]);

  const cards: { key: Category; total: number; count: number; unpaid: number }[] =
    [
      { key: "assets", ...summary.assets },
      { key: "utilities", ...summary.utilities },
      { key: "payroll", ...summary.payroll },
    ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <StatCard
          label="Tổng chi phí"
          value={formatVND(summary.grandTotal)}
          tone="accent"
        />
        {cards.map((c) => {
          const meta = CATEGORY_META[c.key];
          const isActive = tab === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setTab(c.key)}
              className={`text-left rounded-xl border bg-white px-4 py-3 transition-colors ${
                isActive
                  ? "border-[#087E8B] ring-1 ring-[#087E8B]"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                <span className="text-[11px] uppercase tracking-wider font-medium text-gray-500 truncate">
                  {meta.label}
                </span>
              </div>
              <div
                className={`mt-1 text-2xl font-semibold tabular-nums leading-tight ${
                  isActive ? "text-[#087E8B]" : "text-gray-900"
                }`}
                title={formatVND(c.total)}
              >
                {formatVNDCompact(c.total)}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                {c.count} {meta.unitLabel}
                {c.unpaid > 0 && (
                  <span className="ml-1 text-rose-600 font-medium">
                    · {c.unpaid} chưa TT
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div>
        {tab === "assets" && (
          <AssetsPanel data={assets} items={assetItems} onChanged={onChanged} />
        )}
        {tab === "utilities" && (
          <UtilitiesPanel
            data={utilities}
            items={utilityItems}
            onChanged={onChanged}
          />
        )}
        {tab === "payroll" && (
          <PayrollPanel data={payroll} items={payrollItems} onChanged={onChanged} />
        )}
      </div>
    </div>
  );
}

// ─── shared bits ─────────────────────────────────────────────────────────

type PanelState = { loading: boolean; error: string | null; refetch: () => void };

function PanelStatus({ loading, error }: { loading: boolean; error: string | null }) {
  return (
    <>
      {loading && <EmptyState>Đang tải…</EmptyState>}
      {error && <ErrorBox>{error}</ErrorBox>}
    </>
  );
}

function CreateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm px-3 py-2 rounded-lg bg-[#087E8B] text-white hover:bg-[#066671] shrink-0"
    >
      + Tạo
    </button>
  );
}

function ItemCard({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:bg-gray-50">
      {children}
    </li>
  );
}

function RowActions({
  busy,
  onEdit,
  onDelete,
}: {
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={onEdit}
        className="text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
      >
        Sửa
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "Đang xoá…" : "Xoá"}
      </button>
    </div>
  );
}

const STATUS_STYLES: Record<UtilityStatus | PayrollStatus, string> = {
  "Chưa thanh toán": "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  "Đã thanh toán": "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

const GRID = "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2.5";

// ─── Assets ──────────────────────────────────────────────────────────────

const ASSET_CATEGORIES: AssetCategory[] = [
  "Thiết bị y tế",
  "Nội thất",
  "Máy tính",
  "Khác",
];
const CONDITION_STYLES: Record<AssetCondition, string> = {
  "Tốt": "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  "Bình thường": "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  "Cần sửa": "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  "Hỏng": "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
};

function AssetsPanel({
  data,
  items,
  onChanged,
}: {
  data: PanelState;
  items: Asset[];
  onChanged: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AssetCategory>("all");

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((a) => a.category === filter)),
    [items, filter]
  );

  async function handleDelete(id: string) {
    if (!confirm(`Xoá tài sản ${id}?`)) return;
    setBusy(id);
    try {
      await assetsApi.remove(id);
      data.refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            Tất cả
          </Chip>
          {ASSET_CATEGORIES.map((c) => (
            <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <CreateButton onClick={() => setShowCreate(true)} />
      </div>

      <PanelStatus loading={data.loading} error={data.error} />

      <ul className={GRID}>
        {filtered.map((a) => (
          <ItemCard key={a.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-gray-900 font-medium">{a.name}</div>
              <IdPill>{a.id}</IdPill>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              {a.category} · {a.location}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
              <span className="text-gray-700 font-medium tabular-nums">
                {formatVND(a.purchasePrice)}
              </span>
              <span>📅 {formatDate(a.purchaseDate)}</span>
              <span>KH {a.depreciationYears} năm</span>
              <Pill className={CONDITION_STYLES[a.condition]}>{a.condition}</Pill>
            </div>
            {a.notes && (
              <div className="mt-1 text-xs text-gray-500 italic">{a.notes}</div>
            )}
            <RowActions
              busy={busy === a.id}
              onEdit={() => setEditing(a)}
              onDelete={() => handleDelete(a.id)}
            />
          </ItemCard>
        ))}
        {!data.loading && filtered.length === 0 && (
          <li className="col-span-full">
            <EmptyState>Chưa có tài sản nào.</EmptyState>
          </li>
        )}
      </ul>

      {showCreate && (
        <AssetForm
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            data.refetch();
            onChanged();
          }}
        />
      )}
      {editing && (
        <AssetForm
          editId={editing.id}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            data.refetch();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────────

const UTILITY_TYPE_STYLES: Record<UtilityType, string> = {
  "Điện": "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  "Nước": "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  Internet: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
  Gas: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
};

function UtilitiesPanel({
  data,
  items,
  onChanged,
}: {
  data: PanelState;
  items: Utility[];
  onChanged: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Utility | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | UtilityType>("all");

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((u) => u.type === filter)),
    [items, filter]
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
      data.refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            Tất cả
          </Chip>
          {(["Điện", "Nước", "Internet", "Gas"] as UtilityType[]).map((t) => (
            <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>
              {t}
            </Chip>
          ))}
        </div>
        <CreateButton onClick={() => setShowCreate(true)} />
      </div>

      <PanelStatus loading={data.loading} error={data.error} />

      {grouped.map(([period, list]) => {
        const total = list.reduce((s, u) => s + u.amount, 0);
        return (
          <section key={period} className="space-y-2">
            <SectionTitle right={formatVND(total)}>
              {formatPeriod(period)}
            </SectionTitle>
            <ul className={GRID}>
              {list.map((u) => (
                <ItemCard key={u.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Pill className={UTILITY_TYPE_STYLES[u.type]}>{u.type}</Pill>
                      <span className="text-sm text-gray-900 font-medium tabular-nums">
                        {formatVND(u.amount)}
                      </span>
                    </div>
                    <IdPill>{u.id}</IdPill>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    <span>
                      {u.usage} {u.unit}
                    </span>
                    <Pill className={STATUS_STYLES[u.status]}>{u.status}</Pill>
                    {u.paidDate && <span>📅 {formatDate(u.paidDate)}</span>}
                  </div>
                  {u.notes && (
                    <div className="mt-1 text-xs text-gray-500 italic">{u.notes}</div>
                  )}
                  <RowActions
                    busy={busy === u.id}
                    onEdit={() => setEditing(u)}
                    onDelete={() => handleDelete(u.id)}
                  />
                </ItemCard>
              ))}
            </ul>
          </section>
        );
      })}
      {!data.loading && grouped.length === 0 && (
        <EmptyState>Chưa có hoá đơn nào.</EmptyState>
      )}

      {showCreate && (
        <UtilityForm
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            data.refetch();
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
            data.refetch();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

// ─── Payroll ─────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  doctor: "Bác sĩ",
  expert: "Chuyên gia",
  manager: "Quản lý",
};

function PayrollPanel({
  data,
  items,
  onChanged,
}: {
  data: PanelState;
  items: Payroll[];
  onChanged: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Payroll | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<"all" | string>("all");

  const periods = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) set.add(p.period);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [items]);

  const filtered = useMemo(
    () =>
      periodFilter === "all"
        ? items
        : items.filter((p) => p.period === periodFilter),
    [items, periodFilter]
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
      data.refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="ws-input w-auto"
        >
          <option value="all">Tất cả kỳ ({items.length})</option>
          {periods.map((p) => (
            <option key={p} value={p}>
              {formatPeriod(p)}
            </option>
          ))}
        </select>
        <CreateButton onClick={() => setShowCreate(true)} />
      </div>

      <PanelStatus loading={data.loading} error={data.error} />

      {grouped.map(([period, list]) => {
        const totalNet = list.reduce((s, p) => s + p.net, 0);
        const unpaid = list.filter((p) => p.status === "Chưa thanh toán").length;
        return (
          <section key={period} className="space-y-2">
            <SectionTitle right={formatVND(totalNet)}>
              {formatPeriod(period)} · {list.length} người
              {unpaid > 0 && (
                <span className="ml-1.5 text-rose-600 normal-case">
                  ({unpaid} chưa thanh toán)
                </span>
              )}
            </SectionTitle>
            <ul className={GRID}>
              {list.map((p) => (
                <ItemCard key={p.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm text-gray-900 font-medium">
                      {p.employeeName}
                    </div>
                    <IdPill>{p.id}</IdPill>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {ROLE_LABEL[p.employeeRole] ?? p.employeeRole} · {p.employeeId}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    <span className="text-gray-700 font-medium tabular-nums">
                      Thực nhận {formatVND(p.net)}
                    </span>
                    <span>CB {formatVND(p.baseSalary)}</span>
                    {p.bonus > 0 && (
                      <span className="text-emerald-700">+ {formatVND(p.bonus)}</span>
                    )}
                    {p.deduction > 0 && (
                      <span className="text-rose-700">− {formatVND(p.deduction)}</span>
                    )}
                    <Pill className={STATUS_STYLES[p.status]}>{p.status}</Pill>
                    {p.paidDate && <span>📅 {formatDate(p.paidDate)}</span>}
                  </div>
                  {p.notes && (
                    <div className="mt-1 text-xs text-gray-500 italic">{p.notes}</div>
                  )}
                  <RowActions
                    busy={busy === p.id}
                    onEdit={() => setEditing(p)}
                    onDelete={() => handleDelete(p.id)}
                  />
                </ItemCard>
              ))}
            </ul>
          </section>
        );
      })}
      {!data.loading && grouped.length === 0 && (
        <EmptyState>Chưa có bản lương nào.</EmptyState>
      )}

      {showCreate && (
        <PayrollForm
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            data.refetch();
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
            data.refetch();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
