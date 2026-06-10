"use client";

import { useAppointments } from "@/hooks/useAppointments";

// Tab Thông báo — danh sách thông báo từ hệ thống.
// CHƯA có backend thông báo: dữ liệu là MOCK tạm.
//  - Bệnh nhân: thông báo nhắc uống thuốc (cố định, mock).
//  - Bác sĩ: "Bạn có X lịch hẹn chưa xem" — X = số lịch hẹn của bác sĩ đó
//    (đếm từ /api/appointments, loại bỏ hàng chờ chung doctorId="").
type Props = {
  role: string | null;
  version: number;
  active: boolean;
};

type Notice = {
  id: string;
  kind: "appointment" | "medication";
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const KIND_ICON: Record<Notice["kind"], string> = {
  appointment: "📅",
  medication: "💊",
};

// Mock nhắc uống thuốc cho bệnh nhân (chưa có backend thông báo).
const PATIENT_NOTICES: Notice[] = [
  {
    id: "noti-med-1",
    kind: "medication",
    title: "Nhắc uống thuốc buổi sáng",
    body: "Đã đến giờ uống thuốc buổi sáng. Bạn nhớ uống thuốc sau khi ăn no nhé.",
    time: "Hôm nay, 07:00",
    unread: true,
  },
  {
    id: "noti-med-2",
    kind: "medication",
    title: "Nhắc uống thuốc buổi tối",
    body: "Đừng quên uống thuốc buổi tối sau bữa ăn. Uống đều đặn giúp kiểm soát bệnh tốt hơn.",
    time: "Hôm qua, 20:00",
    unread: false,
  },
];

export function NotificationsTab({ role, version, active }: Props) {
  const isDoctor = role === "doctor";
  // Bác sĩ: lấy số lịch hẹn để dựng thông báo. Bệnh nhân: không cần fetch.
  const { data, loading } = useAppointments(version, active && isDoctor);

  let notices: Notice[] = PATIENT_NOTICES;
  if (isDoctor) {
    // Loại hàng chờ chung (doctorId="") — chỉ đếm lịch hẹn của chính bác sĩ.
    const count = (data ?? []).filter((a) => a.doctorId !== "").length;
    notices = [
      {
        id: "noti-appt",
        kind: "appointment",
        title: "Lịch hẹn chưa xem",
        body: `Bạn có ${count} lịch hẹn chưa xem. Mở tab Lịch hẹn để xem chi tiết.`,
        time: "Vừa xong",
        unread: count > 0,
      },
    ];
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
        {notices.length} thông báo
      </div>

      {isDoctor && loading && (
        <div
          data-agent-loading="true"
          className="text-sm text-gray-400 text-center py-4"
        >
          Đang tải…
        </div>
      )}

      <ul className="space-y-2">
        {notices.map((n) => (
          <li
            key={n.id}
            data-agent-ref={`notification:item:${n.id}`}
            data-agent-role="text"
            data-agent-label="Thông báo"
            className={`relative rounded-lg border px-3 py-2.5 ${
              n.unread
                ? "border-[#C8E7E9] bg-[#F2FAFB]"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span aria-hidden className="text-lg leading-none mt-0.5">
                {KIND_ICON[n.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-900">
                    {n.title}
                  </div>
                  {n.unread && (
                    <span
                      aria-hidden
                      className="shrink-0 w-2 h-2 rounded-full bg-amber-400"
                    />
                  )}
                </div>
                <div className="mt-0.5 text-xs text-gray-600">{n.body}</div>
                <div className="mt-1 text-[11px] text-gray-400 tabular-nums">
                  {n.time}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
