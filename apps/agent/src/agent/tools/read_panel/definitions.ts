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
    "QUAN TRỌNG: snapshot CHỈ liệt kê phần tử ĐANG HIỂN THỊ trên tab đang mở — phần tử ở tab khác, hoặc trong form/khu vực chưa được mở, sẽ KHÔNG xuất hiện cho tới khi bạn chuyển tab hoặc click nút mở tương ứng. " +
    "TUYỆT ĐỐI không đoán `ref` — chỉ dùng `ref` đọc được từ snapshot mới nhất. " +
    "KHÔNG đọc HTML; chỉ làm việc với snapshot này.",
  input_schema: {
    type: "object",
    properties: {
      tab: {
        type: "string",
        enum: ["patients", "appointments", "my-record", "my-appointments"],
        description:
          "Tab muốn xem. Bác sĩ: patients (Bệnh nhân — gồm cả hồ sơ chi tiết, xét nghiệm, lịch sử khám của BN đang chọn), appointments (Lịch hẹn). Bệnh nhân: my-record (Hồ sơ + xét nghiệm của chính mình), my-appointments (Lịch hẹn). Bỏ trống để giữ tab hiện tại.",
      },
    },
    required: [],
  },
};
