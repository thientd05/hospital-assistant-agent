"use client";

import { useMemo } from "react";
import type { AppointmentStatus } from "@pr_hospitalagent/types";
import {
  CAL_VIEWS,
  WEEKDAY_LABELS,
  type CalView,
  isSameDay,
  isSameMonth,
  monthMatrix,
  rangeLabel,
  step,
  ymd,
} from "@/lib/calendar";

type CalAppt = { scheduledAt: string | Date; status: AppointmentStatus };

/** Thanh điều hướng: chọn Tháng/Tuần/Ngày + lùi/tới + nhãn phạm vi + nút Hôm nay. */
export function CalendarToolbar({
  view,
  cursor,
  onView,
  onCursor,
}: {
  view: CalView;
  cursor: Date;
  onView: (v: CalView) => void;
  onCursor: (d: Date) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {CAL_VIEWS.map((v) => {
            const isActive = v.key === view;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => onView(v.key)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  isActive
                    ? "bg-white text-gray-900 font-medium shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onCursor(new Date())}
          className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Hôm nay
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onCursor(step(view, cursor, -1))}
          aria-label="Trước"
          className="w-7 h-7 grid place-items-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          ‹
        </button>
        <div className="text-sm font-medium text-gray-800 tabular-nums">
          {rangeLabel(view, cursor)}
        </div>
        <button
          type="button"
          onClick={() => onCursor(step(view, cursor, 1))}
          aria-label="Sau"
          className="w-7 h-7 grid place-items-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          ›
        </button>
      </div>
    </div>
  );
}

/**
 * Bảng lịch cả tháng. Mỗi ngày có lịch hẹn hiện dấu chấm: xanh đặc trưng (#087E8B)
 * = đã duyệt, vàng nhạt = chờ duyệt. Bấm một ngày → gọi `onPickDay` (chuyển sang
 * chế độ Ngày). Thuần hiển thị — agent đọc lịch qua các thẻ luôn được gắn DOM.
 */
export function MonthGrid({
  cursor,
  appointments,
  newDays,
  onPickDay,
}: {
  cursor: Date;
  appointments: CalAppt[];
  /** "YYYY-MM-DD" các ngày có lịch hẹn MỚI chưa xem → ô ngày nhấp nháy lóe lên. */
  newDays?: Set<string>;
  onPickDay: (d: Date) => void;
}) {
  // Gộp theo ngày: ngày nào có lịch chờ duyệt / đã duyệt.
  const byDay = useMemo(() => {
    const map = new Map<string, { pending: boolean; approved: boolean }>();
    for (const a of appointments) {
      const dt = new Date(a.scheduledAt);
      if (Number.isNaN(dt.getTime())) continue;
      const key = ymd(dt);
      const e = map.get(key) ?? { pending: false, approved: false };
      if (a.status === "Đã duyệt") e.approved = true;
      else e.pending = true;
      map.set(key, e);
    }
    return map;
  }, [appointments]);

  const weeks = monthMatrix(cursor);
  const today = new Date();

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {WEEKDAY_LABELS.map((w) => (
          <div
            key={w}
            className="py-1.5 text-center text-[11px] font-medium text-gray-500"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((d) => {
          const key = ymd(d);
          const info = byDay.get(key);
          const inMonth = isSameMonth(d, cursor);
          const isToday = isSameDay(d, today);
          const isNew = !!newDays?.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickDay(d)}
              className={`relative h-12 border-b border-r border-gray-100 last:border-r-0 flex flex-col items-center justify-center gap-1 transition-colors hover:bg-[#087E8B]/5 ${
                inMonth ? "" : "bg-gray-50/60"
              } ${isNew ? "appt-day-pulse" : ""}`}
            >
              <span
                className={`text-xs tabular-nums leading-none grid place-items-center w-5 h-5 rounded-full ${
                  isToday
                    ? "bg-[#087E8B] text-white font-semibold"
                    : inMonth
                      ? "text-gray-700"
                      : "text-gray-300"
                }`}
              >
                {d.getDate()}
              </span>
              <span className="flex items-center gap-0.5 h-1.5">
                {info?.approved && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#087E8B]" />
                )}
                {info?.pending && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 py-1.5 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#087E8B]" /> Đã duyệt
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Chờ duyệt
        </span>
      </div>
    </div>
  );
}
