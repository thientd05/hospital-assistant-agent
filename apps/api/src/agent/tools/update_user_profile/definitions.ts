import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "update_user_profile",
  description:
    "Ghi đè USER.md — hồ sơ bác sĩ trong không gian làm việc. CHỈ dùng khi bác sĩ YÊU CẦU RÕ RÀNG cập nhật thông tin cá nhân, khoa, chuyên môn, phạm vi công việc, kiến thức nền. Tham số `content` phải là TOÀN BỘ nội dung markdown mới (file sẽ bị ghi đè hoàn toàn) — hãy đọc nội dung hiện tại trong system prompt, chỉnh phần cần sửa, rồi gửi toàn bộ. Mã bác sĩ do hệ thống tự nhận diện theo người đăng nhập, KHÔNG cần và KHÔNG thể truyền vào tool này.",
  input_schema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "Toàn bộ nội dung mới của USER.md (markdown).",
      },
    },
    required: ["content"],
  },
};
