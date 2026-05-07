import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "list_experts",
  description:
    "Liệt kê TOÀN BỘ chuyên gia (cố vấn, người huấn luyện chatbot) trong hệ thống (id, fullName, title, expertise, phone, email). KHÔNG cần truyền tham số. Trả về `{count, experts}` đã sắp xếp theo `id`. Dùng khi quản lý muốn xem danh sách chuyên gia hiện có (lĩnh vực chuyên môn, liên hệ). Panel sẽ tự bung tab Chuyên gia khi tool xong — không cần liệt kê lại JSON thô trong câu trả lời, chỉ cần tóm tắt số lượng và một vài điểm đáng chú ý (phân bố theo lĩnh vực).",
  input_schema: {
    type: "object",
    properties: {},
  },
};
