"use client";

import { useState } from "react";
import type {
  Appointment,
  AppointmentStatus,
} from "@pr_hospitalagent/types";
import {
  useAppointments,
  appointmentsApi,
} from "@/hooks/useAppointments";
import { ConfirmModal } from "@/components/sidebar/ConfirmModal";
import { formatDateTime as fmt } from "@/lib/format";
import { APPOINTMENT_STATUS_STYLES as STATUS_STYLES } from "@/lib/appointment";

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

export function AppointmentsTab({ version, active, onChanged }: Props) {
  const { data, loading, error, refetch } = useAppointments(version, active);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleStatus(id: string, next: AppointmentStatus) {
    setBusy(id);
    try {
      await appointmentsApi.update(id, { status: next });
      refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }
  // Duyệt/nhận lịch (gồm cả hàng chờ chung): ai duyệt trước thì nhận bệnh nhân.
  async function handleAccept(id: string) {
    setBusy(id);
    try {
      await appointmentsApi.accept(id);
      refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }
  async function confirmDelete() {
    if (!confirmId) return;
    const id = confirmId;
    setBusy(id);
    try {
      await appointmentsApi.remove(id);
      setConfirmId(null);
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
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {data?.length ?? 0} cuộc hẹn
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
      <ul className="space-y-2">
        {(data ?? []).map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs text-gray-500 font-medium tabular-nums">
                {fmt(a.scheduledAt)}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {a.doctorId === "" && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset bg-purple-50 text-purple-700 ring-purple-200">
                    Hàng chờ chung
                  </span>
                )}
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${STATUS_STYLES[a.status]}`}
                >
                  {a.status}
                </span>
              </div>
            </div>
            <div className="mt-1 text-sm text-gray-900 font-medium">
              {a.patientName ? `${a.patientName} · ${a.patientId}` : a.patientId}
            </div>
            <div className="mt-0.5 text-xs text-gray-500 line-clamp-2">
              {a.reason}
            </div>
            {a.status !== "Thành công" && (
              <div className="mt-2 flex items-center justify-end gap-1.5">
                {a.status === "Chờ duyệt" && (
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => handleAccept(a.id)}
                    data-agent-ref={`appointment:${a.id}:approve`}
                    data-agent-role="button"
                    data-agent-label={`Duyệt lịch hẹn ${a.id}`}
                    className="text-[11px] px-2 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  >
                    {a.doctorId === "" ? "Nhận" : "Duyệt"}
                  </button>
                )}
                {a.status === "Đã duyệt" && (
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => handleStatus(a.id, "Thành công")}
                    data-agent-ref={`appointment:${a.id}:complete`}
                    data-agent-role="button"
                    data-agent-label={`Hoàn tất lịch hẹn ${a.id}`}
                    className="text-[11px] px-2 py-1 rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    Hoàn tất
                  </button>
                )}
                {a.doctorId !== "" && (
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => setConfirmId(a.id)}
                    data-agent-ref={`appointment:${a.id}:cancel`}
                    data-agent-role="button"
                    data-agent-label={`Huỷ lịch hẹn ${a.id}`}
                    className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Huỷ
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <ConfirmModal
        open={confirmId !== null}
        title="Huỷ lịch hẹn"
        message={`Bạn có chắc muốn huỷ lịch hẹn ${confirmId ?? ""}?`}
        confirmLabel="Huỷ lịch"
        cancelLabel="Đóng"
        busy={busy !== null && busy === confirmId}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
