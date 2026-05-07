import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "delete_skill",
  description:
    "Xoá một skill khỏi thư viện `agent/skills/`. Tool xoá toàn bộ thư mục `skills/<name>/` (gồm SKILL.md và mọi file con). Chỉ dành cho CHUYÊN GIA — dùng khi chuyên gia yêu cầu xoá skill cũ hoặc skill không còn phù hợp. Sau khi xoá thành công, tool tự động trả về danh sách skill còn lại trong thư viện. Tên skill phải là kebab-case, chỉ gồm chữ cái, chữ số, gạch ngang.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "Tên skill cần xoá (kebab-case), ví dụ `patient-intake`. Là tên thư mục `skills/<name>/`.",
      },
    },
    required: ["name"],
  },
};
