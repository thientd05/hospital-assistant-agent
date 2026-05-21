import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "update_workspace_file",
  description:
    "Ghi đè toàn bộ một file workspace cá nhân hoá của CHÍNH người dùng đang đăng nhập (bác sĩ hoặc bệnh nhân). " +
    "Ba loại file: `memory` (MEMORY.md — ghi nhớ dài hạn), `soul` (SOUL.md — sở thích/phong cách), `user` (USER.md — sự thật bền về người dùng). " +
    "USER.md và SOUL.md được nối vào system prompt ở lượt sau, nên cập nhật ở đây sẽ ảnh hưởng cách bạn trả lời về sau. " +
    "Tool ghi ĐÈ (replace) toàn bộ nội dung — muốn thêm thì phải gộp nội dung cũ + mới rồi truyền lại trọn vẹn. " +
    "KHÔNG cần truyền id người dùng — tool tự ghi đúng workspace của người đang đăng nhập. " +
    "Trả về { file, content } đã ghi, hoặc { error }.",
  input_schema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        enum: ["memory", "soul", "user"],
        description:
          "Loại file cần cập nhật: `memory` → MEMORY.md, `soul` → SOUL.md, `user` → USER.md.",
      },
      content: {
        type: "string",
        description:
          "Nội dung MỚI, ghi đè toàn bộ file. Dùng markdown tiếng Việt.",
      },
    },
    required: ["file", "content"],
  },
};
