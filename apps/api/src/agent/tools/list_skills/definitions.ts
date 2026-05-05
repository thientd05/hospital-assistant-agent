import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "list_skills",
  description:
    "Liệt kê tất cả các skill hiện có trong thư viện `agent/skills/`. Trả về mảng `{ name, description }` của mọi skill (đọc từ frontmatter SKILL.md). Không cần truyền tham số. Dùng khi chuyên gia muốn xem có những skill nào, hoặc trước khi quyết định tạo/sửa skill.",
  input_schema: {
    type: "object",
    properties: {},
  },
};
