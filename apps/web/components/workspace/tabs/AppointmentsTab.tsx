"use client";

import { useMemo, useState } from "react";
import { useAppointments, appointmentsApi } from "@/hooks/useAppointments";
import { formatDateTime as fmt } from "@/lib/format";
import { type CalView, inView } from "@/lib/calendar";
import { CalendarToolbar, MonthGrid } from "../AppointmentCalendar";

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
  /** Sau khi duyệt/nhận → chuyển sang đoạn chat trực tiếp với BN này. */
  onAccepted?: (patientId: string) => void;
};

type SubTab = "pending" | "approved";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
];

export function AppointmentsTab({
  version,
  active,
  onChanged,
  onAccepted,
}: Props) {
  const { data, loading, error, refetch } = useAppointments(version, active);
  const [busy, setBusy] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("pending");
  const [view, setView] = useState<CalView>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());

  // Mỗi tab con sắp xếp theo thời gian hẹn TĂNG DẦN (gần nhất → xa nhất).
  const byStatus = useMemo(() => {
    const sort = (rows: typeof data) =>
      [...(rows ?? [])].sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    return {
      pending: sort((data ?? []).filter((a) => a.status === "Chờ duyệt")),
      approved: sort((data ?? []).filter((a) => a.status === "Đã duyệt")),
    };
  }, [data]);

  // Duyệt/nhận lịch (gồm cả hàng chờ chung): ai duyệt trước thì nhận bệnh nhân.
  async function handleAccept(id: string, patientId: string) {
    setBusy(id);
    try {
      await appointmentsApi.accept(id);
      refetch();
      onChanged();
      // Đã nhận BN → mở đoạn chat trực tiếp với họ ngay.
      onAccepted?.(patientId);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  // Huỷ duyệt: đưa lịch "Đã duyệt" quay về "Chờ duyệt" (không xoá).
  async function handleRevert(id: string) {
    setBusy(id);
    try {
      await appointmentsApi.update(id, { status: "Chờ duyệt" });
      refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const rows = byStatus[subTab];
  // Tab "Chờ duyệt": tách lịch của mình (trên) và hàng chờ chung doctorId="" (dưới).
  const owned = rows.filter((a) => a.doctorId !== "");
  const pool = subTab === "pending" ? rows.filter((a) => a.doctorId === "") : [];

  // Chế độ Tháng dùng bảng lịch (mọi trạng thái); Tuần/Ngày lọc thẻ theo phạm vi.
  // Thẻ ngoài phạm vi vẫn gắn DOM (ẩn bằng `hidden`) để agent đọc ngầm được hết.
  const visible = (a: (typeof rows)[number]) =>
    view !== "month" && inView(a.scheduledAt, view, cursor);
  const visibleCount =
    owned.filter(visible).length + pool.filter(visible).length;

  const renderCard = (a: (typeof rows)[number]) => (
    <li
      key={a.id}
      data-agent-ref={`appointment:${a.id}:info`}
      data-agent-role="text"
      data-agent-label="Lịch hẹn"
      className={`rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50 ${
        visible(a) ? "" : "hidden"
      }`}
    >
      <div className="text-xs text-gray-500 font-medium tabular-nums">
        {fmt(a.scheduledAt)}
      </div>
      <div className="mt-1 text-sm text-gray-900 font-medium">
        {a.patientName ? `${a.patientName} · ${a.patientId}` : a.patientId}
      </div>
      {a.reason && (
        <div className="mt-1.5">
          <div className="text-[10px] uppercase tracking-wider text-[#087E8B] font-medium">
            Tóm tắt từ trợ lý ảo
          </div>
          <div className="text-xs text-gray-600">{a.reason}</div>
        </div>
      )}
      {a.patientNote && (
        <div className="mt-1.5">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
            Lời nhắn từ bệnh nhân
          </div>
          <div className="text-xs text-gray-600">{a.patientNote}</div>
        </div>
      )}
      <div className="mt-2 flex items-center justify-end gap-1.5">
        {subTab === "pending" && (
          <button
            type="button"
            disabled={busy === a.id}
            onClick={() => handleAccept(a.id, a.patientId)}
            data-agent-ref={`appointment:${a.id}:approve`}
            data-agent-role="button"
            data-agent-label={`Duyệt lịch hẹn ${a.id}`}
            className="text-[11px] px-2 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            {a.doctorId === "" ? "Nhận" : "Duyệt"}
          </button>
        )}
        {subTab === "approved" && (
          <button
            type="button"
            disabled={busy === a.id}
            onClick={() => handleRevert(a.id)}
            data-agent-ref={`appointment:${a.id}:cancel`}
            data-agent-role="button"
            data-agent-label={`Huỷ duyệt lịch hẹn ${a.id}`}
            className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Huỷ
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div className="px-5 py-4 space-y-3">
      <CalendarToolbar
        view={view}
        cursor={cursor}
        onView={setView}
        onCursor={setCursor}
      />

      {loading && (
        <div data-agent-loading="true" className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Chế độ Tháng: bảng lịch cả tháng với dấu chấm theo trạng thái. */}
      {view === "month" && !loading && (
        <MonthGrid
          cursor={cursor}
          appointments={data ?? []}
          onPickDay={(d) => {
            setCursor(d);
            setView("day");
          }}
        />
      )}

      {/* Chế độ Tuần/Ngày: thẻ lịch (như cũ). Khối luôn gắn DOM cho agent; ẩn
          khi đang xem Tháng. */}
      <div className={view === "month" ? "hidden" : "space-y-3"}>
      {/* Tab con: Chờ duyệt | Đã duyệt */}
      <div className="flex gap-1 border-b border-gray-200">
        {SUB_TABS.map((t) => {
          const isActive = t.key === subTab;
          const count = byStatus[t.key].length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSubTab(t.key)}
              data-agent-ref={`appointment-subtab:${t.key}`}
              data-agent-role="tab"
              data-agent-label={t.label}
              data-agent-active={isActive ? "true" : undefined}
              className={`text-sm px-3 py-2 -mb-px border-b-2 transition-colors ${
                isActive
                  ? "border-[#087E8B] text-gray-900 font-medium"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label} · {count}
            </button>
          );
        })}
      </div>

      {!loading && visibleCount === 0 && (
        <div className="text-sm text-gray-400 text-center py-4">
          Không có lịch hẹn nào trong {view === "day" ? "ngày" : "tuần"} này.
        </div>
      )}
      {owned.length > 0 && (
        <ul className="space-y-2">{owned.map(renderCard)}</ul>
      )}
      {pool.length > 0 && (
        <>
          <div
            className={`items-center gap-2 py-1 text-[11px] uppercase tracking-wider text-purple-600 font-medium ${
              pool.some(visible) ? "flex" : "hidden"
            }`}
          >
            <span className="flex-1 border-t border-dashed border-purple-200" />
            Hàng chờ chung
            <span className="flex-1 border-t border-dashed border-purple-200" />
          </div>
          <ul className="space-y-2">{pool.map(renderCard)}</ul>
        </>
      )}
      </div>
    </div>
  );
}
