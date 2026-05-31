import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "open_panel",
  description:
    "Mở panel bên phải (và tuỳ chọn chuyển sang một tab). " +
    "BẮT BUỘC gọi tool này TRƯỚC mọi thao tác khác khi panel đang đóng — vì panel đóng thì không có gì để click/type. " +
    "Sau khi mở, tool trả về một SNAPSHOT mô tả panel: { panelOpen, activeTab, tabs, elements }. " +
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
          "Tab muốn mở. Bác sĩ: patients (Bệnh nhân), patient (Hồ sơ), lab (Lab), appointments (Lịch hẹn), drug-check (Tương tác thuốc). Bệnh nhân: my-record (Hồ sơ), my-labs (Xét nghiệm), my-appointments (Lịch hẹn), home-vitals (Chỉ số tại nhà). Bỏ trống để giữ tab hiện tại.",
      },
    },
    required: [],
  },
};
