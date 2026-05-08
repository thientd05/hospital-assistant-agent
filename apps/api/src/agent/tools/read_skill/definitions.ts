import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "read_skill",
  description:
    "Đọc nội dung chi tiết của một skill từ thư mục agent/skills/. " +
    "System prompt chỉ liệt kê tên + mô tả ngắn của các skill khả dụng — khi tình huống match một skill, bạn PHẢI gọi tool này để đọc body đầy đủ trước khi hành động. " +
    "Tool đọc thuần file (không động DB/panel/API). Trả về { name, content } hoặc { error }.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Tên skill — phải khớp tên trong index của system prompt.",
      },
    },
    required: ["name"],
  },
};
