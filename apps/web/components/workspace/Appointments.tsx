"use client";

import type { AppointmentStatus } from "@pr_hospitalagent/types";

export type AppointmentRow = {
  id: string;
  patientId: string;
  patientName: string | null;
  doctorId: string;
  scheduledAt: string | Date;
  reason: string;
  status: AppointmentStatus;
};

type Props = {
  data: AppointmentRow[] | null;
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  "Chờ duyệt": "bg-amber-50 text-amber-700 ring-amber-200",
  "Đã duyệt": "bg-blue-50 text-blue-700 ring-blue-200",
  "Thành công": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatScheduledAt(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return dateFormatter.format(d);
}

export function Appointments({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">
        Chưa có cuộc hẹn nào.
      </div>
    );
  }
  return (
    <div className="px-5 py-4 space-y-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
        {data.length} cuộc hẹn
      </div>
      <ul className="space-y-2">
        {data.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs text-gray-500 font-medium tabular-nums">
                {formatScheduledAt(a.scheduledAt)}
              </div>
              <span
                className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${STATUS_STYLES[a.status]}`}
              >
                {a.status}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-900 font-medium">
              {a.patientName
                ? `${a.patientName} · ${a.patientId}`
                : a.patientId}
            </div>
            <div className="mt-0.5 text-xs text-gray-500 line-clamp-2">
              {a.reason}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
