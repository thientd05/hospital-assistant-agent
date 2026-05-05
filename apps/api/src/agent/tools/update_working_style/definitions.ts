import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "update_working_style",
  description:
    "Ghi đè SOUL.md — phong cách làm việc bác sĩ muốn agent áp dụng. CHỈ dùng khi bác sĩ YÊU CẦU RÕ RÀNG thay đổi cách trả lời, định dạng, điều cần tránh, mức độ chi tiết, v.v. Tham số `content` phải là TOÀN BỘ nội dung markdown mới (file sẽ bị ghi đè hoàn toàn) — hãy đọc nội dung hiện tại trong system prompt, chỉnh phần cần sửa, rồi gửi toàn bộ. Mã bác sĩ do hệ thống tự nhận diện, KHÔNG cần truyền.",
  input_schema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "Toàn bộ nội dung mới của SOUL.md (markdown).",
      },
    },
    required: ["content"],
  },
};
