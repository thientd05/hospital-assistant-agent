"use client";

import { useState } from "react";
import type { ExpertPublic } from "@pr_hospitalagent/types";
import { useExperts, useExpert, expertsApi } from "@/hooks/useExperts";
import { ExpertForm } from "../forms/ExpertForm";

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

export function ExpertsTab({ version, active, onChanged }: Props) {
  const { data, loading, error, refetch } = useExperts(version, active);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ExpertPublic | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = useExpert(selectedId, version, active && Boolean(selectedId));

  async function handleDelete(id: string) {
    if (!confirm(`Xoá chuyên gia ${id}?`)) return;
    setBusy(id);
    try {
      await expertsApi.remove(id);
      if (selectedId === id) setSelectedId(null);
      refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function openEdit(id: string) {
    try {
      const { http } = await import("@/lib/apiClient");
      const fresh = await http.get<ExpertPublic>(`/api/experts/${id}`);
      setEditing(fresh);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {data?.count ?? 0} chuyên gia
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-sm px-3 py-1.5 rounded-md bg-purple-500 text-white hover:bg-purple-600"
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
        {(data?.experts ?? []).map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-gray-900 font-medium">
                {e.title} {e.fullName}
              </div>
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums">
                {e.id}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">{e.expertise}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              {e.phone && <span>📞 {e.phone}</span>}
              {e.email && <span>✉ {e.email}</span>}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedId(e.id)}
                className="text-[11px] px-2 py-1 rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                Chi tiết
              </button>
              <button
                type="button"
                onClick={() => openEdit(e.id)}
                className="text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Sửa
              </button>
              <button
                type="button"
                disabled={busy === e.id}
                onClick={() => handleDelete(e.id)}
                className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {busy === e.id ? "Đang xoá…" : "Xoá"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {selectedId && detail.data && (
        <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50/40 px-3 py-2.5 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="text-base font-semibold text-gray-900">
              {detail.data.title} {detail.data.fullName}
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Đóng
            </button>
          </div>
          <Row label="Mã" value={detail.data.id} />
          <Row label="Username" value={detail.data.username} />
          <Row label="Lĩnh vực" value={detail.data.expertise} />
          <Row label="Điện thoại" value={detail.data.phone} />
          <Row label="Email" value={detail.data.email} />
          <Row label="Địa chỉ" value={detail.data.address} />
        </div>
      )}

      {showCreate && (
        <ExpertForm
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            refetch();
            onChanged();
          }}
        />
      )}
      {editing && (
        <ExpertForm
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}
