import type { AppointmentStatus } from "@pr_hospitalagent/types";

export const APPOINTMENT_STATUS_STYLES: Record<AppointmentStatus, string> = {
  "Chờ duyệt": "bg-amber-50 text-amber-700 ring-amber-200",
  "Đã duyệt": "bg-blue-50 text-blue-700 ring-blue-200",
};
