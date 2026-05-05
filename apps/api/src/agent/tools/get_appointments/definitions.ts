import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "get_appointments",
  description:
    "Lấy TOÀN BỘ cuộc hẹn của bác sĩ ĐANG ĐĂNG NHẬP, sắp xếp theo `scheduledAt` tăng dần. KHÔNG cần truyền tham số — hệ thống tự nhận diện bác sĩ. Mỗi cuộc hẹn kèm `patientName` (đã join từ collection `patients`) và `status` là một trong `\"Chờ duyệt\"` / `\"Đã duyệt\"` / `\"Thành công\"`. Dùng khi bác sĩ hỏi về lịch hẹn, lịch hôm nay/tuần này, cuộc hẹn chờ duyệt, v.v. Panel sẽ tự bung tab Lịch hẹn khi tool xong.",
  input_schema: {
    type: "object",
    properties: {},
  },
};
