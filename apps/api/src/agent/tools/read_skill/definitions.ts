import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "read_skill",
  description:
    "Đọc nội dung đầy đủ của một kỹ năng trong thư viện skills. Truyền vào TÊN kỹ năng (đúng theo trường `name` trong frontmatter, ví dụ `patient-intake`, `lab-result-entry`). Tool sẽ tự đọc `skills/<tên>/SKILL.md`. Dùng tool này khi yêu cầu của bác sĩ phù hợp với mô tả ngắn của một kỹ năng trong danh sách kỹ năng ở system prompt.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "Tên kỹ năng (đúng theo `name` trong frontmatter), ví dụ `patient-intake`.",
      },
    },
    required: ["name"],
  },
};
