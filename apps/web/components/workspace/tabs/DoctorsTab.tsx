"use client";

import { useState } from "react";
import type { DoctorPublic } from "@pr_hospitalagent/types";
import { useDoctors, useDoctor, doctorsApi } from "@/hooks/useDoctors";
import { DoctorForm } from "../forms/DoctorForm";

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

export function DoctorsTab({ version, active, onChanged }: Props) {
  const { data, loading, error, refetch } = useDoctors(version, active);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DoctorPublic | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = useDoctor(selectedId, version, active && Boolean(selectedId));

  async function handleDelete(id: string) {
    if (!confirm(`Xoá bác sĩ ${id}?`)) return;
    setBusy(id);
    try {
      await doctorsApi.remove(id);
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
      const fresh = await http.get<DoctorPublic>(`/api/doctors/${id}`);
      setEditing(fresh);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {data?.count ?? 0} bác sĩ
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671]"
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
        {(data?.doctors ?? []).map((d) => (
          <li
            key={d.id}
            className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-gray-900 font-medium">
                {d.title} {d.fullName}
              </div>
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums">
                {d.id}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              {d.department} · {d.specialty}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              {d.phone && <span>📞 {d.phone}</span>}
              {d.email && <span>✉ {d.email}</span>}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedId(d.id)}
                className="text-[11px] px-2 py-1 rounded-md border border-[#C8E7E9] text-[#087E8B] hover:bg-[#C8E7E9]"
              >
                Chi tiết
              </button>
              <button
                type="button"
                onClick={() => openEdit(d.id)}
                className="text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Sửa
              </button>
              <button
                type="button"
                disabled={busy === d.id}
                onClick={() => handleDelete(d.id)}
                className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {busy === d.id ? "Đang xoá…" : "Xoá"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {selectedId && detail.data && (
        <div className="mt-2 rounded-lg border border-[#C8E7E9] bg-[#C8E7E9]/40 px-3 py-2.5 text-sm">
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
          <Row label="Khoa" value={detail.data.department} />
          <Row label="Chuyên khoa" value={detail.data.specialty} />
          <Row label="Điện thoại" value={detail.data.phone} />
          <Row label="Email" value={detail.data.email} />
          <Row label="Địa chỉ" value={detail.data.address} />
        </div>
      )}

      {showCreate && (
        <DoctorForm
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            refetch();
            onChanged();
          }}
        />
      )}
      {editing && (
        <DoctorForm
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
