import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "get_expert",
  description:
    "Tra cứu chi tiết một chuyên gia theo mã (ví dụ `CG001`). Trả về toàn bộ thông tin: id, fullName, title, expertise, phone, email, address, createdAt. Dùng khi quản lý cần xem chi tiết một chuyên gia cụ thể (sau khi đã có danh sách hoặc khi quản lý nói trực tiếp \"xem chi tiết chuyên gia CG001\"). Panel sẽ tự bung tab Chuyên gia (chi tiết) khi tool xong — KHÔNG dán JSON thô trong câu trả lời, chỉ tóm tắt vài điểm chính (lĩnh vực, liên hệ).",
  input_schema: {
    type: "object",
    properties: {
      expert_id: { type: "string", description: "Mã chuyên gia (ví dụ CG001)" },
    },
    required: ["expert_id"],
  },
};
