import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "get_doctor",
  description:
    "Tra cứu chi tiết một bác sĩ theo mã (ví dụ `BS001`). Trả về toàn bộ thông tin: id, fullName, title, department, specialty, phone, email, address, workspaceDir, createdAt. Dùng khi quản lý cần xem chi tiết một bác sĩ cụ thể (sau khi đã có danh sách hoặc khi quản lý nói trực tiếp \"xem chi tiết bác sĩ BS001\"). Panel sẽ tự bung tab Bác sĩ (chi tiết) khi tool xong — KHÔNG dán JSON thô trong câu trả lời, chỉ tóm tắt vài điểm chính (chuyên môn, khoa, liên hệ).",
  input_schema: {
    type: "object",
    properties: {
      doctor_id: { type: "string", description: "Mã bác sĩ (ví dụ BS001)" },
    },
    required: ["doctor_id"],
  },
};
