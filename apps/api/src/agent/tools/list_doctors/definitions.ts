import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "list_doctors",
  description:
    "Liệt kê TOÀN BỘ bác sĩ trong phòng khám (id, fullName, title, department, specialty, phone, email). KHÔNG cần truyền tham số. Trả về `{count, doctors}` đã sắp xếp theo `id`. Dùng khi quản lý muốn xem danh sách bác sĩ hiện có (nhân sự, phân khoa, liên hệ). Panel sẽ tự bung tab Bác sĩ khi tool xong — không cần liệt kê lại JSON thô trong câu trả lời, chỉ cần tóm tắt số lượng và một vài điểm đáng chú ý (phân bố theo khoa/chuyên môn).",
  input_schema: {
    type: "object",
    properties: {},
  },
};
