import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "update_workspace_file",
  description:
    "Cập nhật một file workspace cá nhân hoá của CHÍNH người dùng đang đăng nhập (bác sĩ hoặc bệnh nhân). " +
    "Ba loại file: `memory` (MEMORY.md — bài học/ghi nhớ dài hạn), `soul` (SOUL.md — sở thích/phong cách), `user` (USER.md — sự thật bền về người dùng). " +
    "Cả ba được nối vào system prompt ở lượt sau, nên cập nhật ở đây sẽ ảnh hưởng cách bạn trả lời về sau. " +
    "Có 3 chế độ qua `mode`: " +
    "(1) `edit` — ƯU TIÊN khi chỉ sửa/xoá MỘT mục: thay đoạn `old_string` (phải khớp CHÍNH XÁC và DUY NHẤT trong file) bằng `new_string` (rỗng = xoá đoạn đó), giữ nguyên phần còn lại. " +
    "(2) `append` — khi chỉ BỔ SUNG nội dung: nối `content` vào CUỐI file hiện có (tự thêm xuống dòng). " +
    "(3) `overwrite` (mặc định) — thay TOÀN BỘ file bằng `content`; chỉ dùng khi muốn viết lại từ đầu. " +
    "Với `edit`/`append` bạn KHÔNG cần (và đừng) chép lại cả file — tránh làm mất nội dung cũ và tiết kiệm. Nội dung file hiện tại đang nằm sẵn ở đầu system prompt, hãy chép `old_string` từ đó cho khớp. " +
    "KHÔNG cần truyền id người dùng — tool tự ghi đúng workspace của người đang đăng nhập. " +
    "Trả về { file, mode, content } (nội dung file SAU khi ghi), hoặc { error }.",
  input_schema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        enum: ["memory", "soul", "user"],
        description:
          "Loại file cần cập nhật: `memory` → MEMORY.md, `soul` → SOUL.md, `user` → USER.md.",
      },
      mode: {
        type: "string",
        enum: ["edit", "append", "overwrite"],
        description:
          "Cách ghi. `edit`: sửa/xoá đúng chỗ (cần old_string + new_string). `append`: nối thêm (cần content). `overwrite` (mặc định): ghi đè cả file (cần content).",
      },
      content: {
        type: "string",
        description:
          "Dùng cho `append`/`overwrite`. Markdown tiếng Việt. `append` nối vào cuối; `overwrite` thay toàn bộ.",
      },
      old_string: {
        type: "string",
        description:
          "Dùng cho `edit`. Đoạn văn bản hiện có cần thay — phải khớp CHÍNH XÁC từng ký tự và DUY NHẤT trong file (thêm ngữ cảnh nếu bị trùng).",
      },
      new_string: {
        type: "string",
        description:
          "Dùng cho `edit`. Đoạn thay thế cho `old_string`; để chuỗi rỗng nếu muốn XOÁ đoạn đó.",
      },
    },
    required: ["file"],
  },
};
