"use client";

import { useMemo, useState } from "react";
import type { Asset, AssetCategory, AssetCondition } from "@pr_hospitalagent/types";
import { useAssets, assetsApi } from "@/hooks/useAssets";
import { AssetForm } from "../forms/AssetForm";
import { formatVND, formatDate } from "@/lib/format";

const CATEGORIES: AssetCategory[] = [
  "Thiết bị y tế",
  "Nội thất",
  "Máy tính",
  "Khác",
];

const CONDITION_STYLES: Record<AssetCondition, string> = {
  "Tốt": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Bình thường": "bg-blue-50 text-blue-700 ring-blue-200",
  "Cần sửa": "bg-amber-50 text-amber-700 ring-amber-200",
  "Hỏng": "bg-rose-50 text-rose-700 ring-rose-200",
};

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

export function AssetsTab({ version, active, onChanged }: Props) {
  const { data, loading, error, refetch } = useAssets(version, active);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AssetCategory>("all");

  const assets = data?.assets ?? [];
  const filtered = useMemo(
    () => (filter === "all" ? assets : assets.filter((a) => a.category === filter)),
    [assets, filter]
  );
  const totalValue = useMemo(
    () => assets.reduce((s, a) => s + a.purchasePrice, 0),
    [assets]
  );

  async function handleDelete(id: string) {
    if (!confirm(`Xoá tài sản ${id}?`)) return;
    setBusy(id);
    try {
      await assetsApi.remove(id);
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
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
            Tổng tài sản
          </div>
          <div className="mt-0.5 text-2xl font-semibold text-gray-900 tabular-nums">
            {assets.length}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
            Tổng giá trị
          </div>
          <div className="mt-0.5 text-lg font-semibold text-[#087E8B] tabular-nums">
            {formatVND(totalValue)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Tất cả
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              active={filter === c}
              onClick={() => setFilter(c)}
            >
              {c}
            </FilterChip>
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

      <ul className="space-y-2">
        {filtered.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-gray-900 font-medium">{a.name}</div>
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums">
                {a.id}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              {a.category} · {a.location}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              <span className="text-gray-700 font-medium tabular-nums">
                {formatVND(a.purchasePrice)}
              </span>
              <span>📅 {formatDate(a.purchaseDate)}</span>
              <span>KH {a.depreciationYears} năm</span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${
                  CONDITION_STYLES[a.condition]
                }`}
              >
                {a.condition}
              </span>
            </div>
            {a.notes && (
              <div className="mt-1 text-xs text-gray-500 italic">{a.notes}</div>
            )}
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(a)}
                className="text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Sửa
              </button>
              <button
                type="button"
                disabled={busy === a.id}
                onClick={() => handleDelete(a.id)}
                className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {busy === a.id ? "Đang xoá…" : "Xoá"}
              </button>
            </div>
          </li>
        ))}
        {!loading && filtered.length === 0 && (
          <li className="text-sm text-gray-400 text-center py-6">
            Chưa có tài sản nào.
          </li>
        )}
      </ul>

      {showCreate && (
        <AssetForm
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            refetch();
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
            refetch();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function FilterChip({
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
