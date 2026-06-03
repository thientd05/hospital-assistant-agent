import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "read_skills",
  description:
    "Đọc nội dung chi tiết của MỘT HOẶC NHIỀU skill cùng lúc. " +
    "System prompt chỉ liệt kê tên + mô tả ngắn của các skill khả dụng — khi tình huống match một (hoặc nhiều) skill, bạn PHẢI gọi tool này để đọc body đầy đủ TRƯỚC khi hành động. " +
    "Khi một yêu cầu cần nhiều skill (vd vừa kê thuốc vừa thêm chẩn đoán), truyền HẾT tên skill cần dùng vào `names` trong một lần gọi. " +
    "Tool đọc thuần (không động DB/panel/API). Trả về { skills: [{ name, content } | { name, error }] }.",
  input_schema: {
    type: "object",
    properties: {
      names: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description:
          "Danh sách tên skill cần đọc — mỗi tên phải khớp tên trong index của system prompt.",
      },
    },
    required: ["names"],
  },
};
