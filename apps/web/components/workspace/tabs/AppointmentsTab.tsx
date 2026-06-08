"use client";

import { useMemo, useState } from "react";
import { useAppointments, appointmentsApi } from "@/hooks/useAppointments";
import { formatDateTime as fmt } from "@/lib/format";
import { APPOINTMENT_STATUS_STYLES as STATUS_STYLES } from "@/lib/appointment";
import { type CalView, inView } from "@/lib/calendar";
import { CalendarToolbar, MonthGrid } from "../AppointmentCalendar";

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
  /** Sau khi duyệt/nhận → chuyển sang đoạn chat trực tiếp với BN này. */
  onAccepted?: (patientId: string) => void;
};

// Bộ lọc nhanh theo trạng thái (không còn tab con tách hẳn). Mặc định "Tất cả"
// để bảng tháng (gộp mọi trạng thái) và chế độ Ngày/Tuần luôn khớp pha nhau.
type StatusFilter = "all" | "pending" | "approved";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
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
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [view, setView] = useState<CalView>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());

  // Mọi lịch sắp xếp theo thời gian hẹn TĂNG DẦN (gần nhất → xa nhất).
  const sorted = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      ),
    [data]
  );

  // Số đếm trên chip lọc bám theo PHẠM VI đang xem (ngày/tuần), không phải tổng
  // toàn bộ — để ngày chỉ có 1 lịch không hiện "Tất cả · 2" như tuần.
  const inRange = useMemo(
    () =>
      sorted.filter(
        (a) => view !== "month" && inView(a.scheduledAt, view, cursor)
      ),
    [sorted, view, cursor]
  );
  const counts = useMemo(
    () => ({
      all: inRange.length,
      pending: inRange.filter((a) => a.status === "Chờ duyệt").length,
      approved: inRange.filter((a) => a.status === "Đã duyệt").length,
    }),
    [inRange]
  );

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

  // Tách lịch của mình (trên) và hàng chờ chung doctorId="" (dưới — luôn là chờ duyệt).
  const owned = sorted.filter((a) => a.doctorId !== "");
  const pool = sorted.filter((a) => a.doctorId === "");

  // Chế độ Tháng dùng bảng lịch (mọi trạng thái); Tuần/Ngày lọc thẻ theo phạm vi
  // + bộ lọc trạng thái. Thẻ ngoài phạm vi vẫn gắn DOM (ẩn bằng `hidden`) để agent
  // đọc ngầm được hết.
  const matchesFilter = (status: string) =>
    filter === "all" ||
    (filter === "pending" && status === "Chờ duyệt") ||
    (filter === "approved" && status === "Đã duyệt");
  const visible = (a: { scheduledAt: string | Date; status: string }) =>
    view !== "month" && inView(a.scheduledAt, view, cursor) && matchesFilter(a.status);
  const visibleCount = owned.filter(visible).length + pool.filter(visible).length;

  const renderCard = (a: (typeof sorted)[number]) => {
    const isPending = a.status === "Chờ duyệt";
    return (
      <li
        key={a.id}
        data-agent-ref={`appointment:${a.id}:info`}
        data-agent-role="text"
        data-agent-label="Lịch hẹn"
        className={`rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50 ${
          visible(a) ? "" : "hidden"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs text-gray-500 font-medium tabular-nums">
            {fmt(a.scheduledAt)}
          </div>
          <span
            className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${STATUS_STYLES[a.status]}`}
          >
            {a.status}
          </span>
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
          {isPending ? (
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
          ) : (
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
  };

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
          appointments={sorted}
          onPickDay={(d) => {
            setCursor(d);
            setView("day");
          }}
        />
      )}

      {/* Chế độ Tuần/Ngày: thẻ lịch (cả 2 trạng thái trong một danh sách). Khối
          luôn gắn DOM cho agent; ẩn khi đang xem Tháng. */}
      <div className={view === "month" ? "hidden" : "space-y-3"}>
        {/* Bộ lọc nhanh theo trạng thái (tuỳ chọn). */}
        <div className="flex gap-1.5">
          {FILTERS.map((f) => {
            const isActive = f.key === filter;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  isActive
                    ? "border-[#087E8B] bg-[#087E8B]/10 text-[#087E8B] font-medium"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {f.label} · {counts[f.key]}
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
