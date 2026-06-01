import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "read_panel",
  description:
    "Đọc SNAPSHOT của panel bên phải. " +
    "LUÔN đọc được panel bất kể đang đóng hay mở — nếu panel đang đóng, tool TỰ ĐỘNG mở rồi đọc. " +
    "Truyền `tab` (tuỳ chọn) để chuyển sang tab cần xem trước khi đọc; bỏ trống để giữ tab hiện tại. " +
    "Dùng để định hướng (xem đang ở tab nào, có những phần tử nào, giá trị/lỗi hiện tại) hoặc kiểm tra kết quả sau khi `act`. " +
    "Trả về SNAPSHOT { panelOpen, activeTab, tabs, elements }. " +
    "Mỗi phần tử trong `elements` có { ref, role, label, value?, checked?, disabled? } — dùng `ref` để nhắm phần tử khi gọi tool `act`. " +
    "KHÔNG đọc HTML; chỉ làm việc với snapshot này.",
  input_schema: {
    type: "object",
    properties: {
      tab: {
        type: "string",
        enum: [
          "patients",
          "patient",
          "lab",
          "appointments",
          "drug-check",
          "my-record",
          "my-labs",
          "my-appointments",
          "home-vitals",
        ],
        description:
          "Tab muốn xem. Bác sĩ: patients (Bệnh nhân), patient (Hồ sơ), lab (Lab), appointments (Lịch hẹn), drug-check (Tương tác thuốc). Bệnh nhân: my-record (Hồ sơ), my-labs (Xét nghiệm), my-appointments (Lịch hẹn), home-vitals (Chỉ số tại nhà). Bỏ trống để giữ tab hiện tại.",
      },
    },
    required: [],
  },
};
