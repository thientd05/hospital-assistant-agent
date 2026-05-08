"use client";

import { useState } from "react";
import { usePatients, patientsApi } from "@/hooks/usePatients";
import type {
  PatientFormValues,
  SubmitPatientResult,
} from "@/hooks/useWorkspace";
import { PatientCreateFormControlled } from "../forms/PatientCreateFormControlled";
import { ConfirmModal } from "@/components/sidebar/ConfirmModal";

type CreateFormControl = {
  open: boolean;
  values: PatientFormValues;
  submitting: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: <K extends keyof PatientFormValues>(
    key: K,
    value: PatientFormValues[K]
  ) => void;
  onSubmit: () => Promise<SubmitPatientResult>;
};

type Props = {
  version: number;
  active: boolean;
  role: "doctor" | "manager";
  onSelect?: (id: string) => void;
  onChanged: () => void;
  createForm?: CreateFormControl;
};

export function PatientsTab({
  version,
  active,
  role,
  onSelect,
  onChanged,
  createForm,
}: Props) {
  const { data, loading, error, refetch } = usePatients(version, active);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const list =
    data?.patients.filter((p) => {
      const f = filter.trim().toLowerCase();
      if (!f) return true;
      return (
        p.id.toLowerCase().includes(f) ||
        p.name.toLowerCase().includes(f) ||
        p.ward.toLowerCase().includes(f) ||
        p.diagnoses.some((d) => d.toLowerCase().includes(f))
      );
    }) ?? [];

  async function confirmDelete() {
    if (!confirmId) return;
    const id = confirmId;
    setBusy(id);
    try {
      await patientsApi.remove(id);
      setConfirmId(null);
      refetch();
      onChanged();
    } catch (e) {
      alert(`Xoá thất bại: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmitForm() {
    if (!createForm) return;
    setSubmitError(null);
    const result = await createForm.onSubmit();
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    onChanged();
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Tìm theo tên, mã, khoa, chẩn đoán…"
          className="flex-1 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#087E8B]"
        />
        {role === "doctor" && createForm && !createForm.open && (
          <button
            type="button"
            onClick={() => {
              setSubmitError(null);
              createForm.onOpen();
            }}
            className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671]"
          >
            + Tạo
          </button>
        )}
      </div>

      {role === "doctor" && createForm && createForm.open && (
        <PatientCreateFormControlled
          values={createForm.values}
          submitting={createForm.submitting}
          error={submitError}
          onChange={createForm.onChange}
          onClose={() => {
            setSubmitError(null);
            createForm.onClose();
          }}
          onSubmit={handleSubmitForm}
        />
      )}

      {loading && (
        <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {data && (
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {list.length} / {data.count} bệnh nhân
        </div>
      )}

      <ul className="space-y-2">
        {list.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-gray-900 font-medium">{p.name}</div>
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums">
                {p.id}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              {p.gender} · {p.age} tuổi · {p.ward}
            </div>
            {p.diagnoses.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {p.diagnoses.map((d) => (
                  <span
                    key={d}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-[#C8E7E9] text-[#087E8B]"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-end gap-2">
              {role === "doctor" && onSelect && (
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-[#C8E7E9] text-[#087E8B] hover:bg-[#C8E7E9]"
                >
                  Mở hồ sơ
                </button>
              )}
              {role === "doctor" && (
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => setConfirmId(p.id)}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {busy === p.id ? "Đang xoá…" : "Xoá"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmModal
        open={confirmId !== null}
        title="Xoá bệnh nhân"
        message={`Bạn có chắc muốn xoá bệnh nhân ${confirmId ?? ""}? Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        busy={busy !== null && busy === confirmId}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
