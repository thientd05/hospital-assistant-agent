import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "write_skill",
  description:
    "Tạo hoặc ghi đè nội dung của một skill trong thư viện. Tool tạo thư mục `skills/<name>/` nếu chưa tồn tại và ghi toàn bộ `content` vào `SKILL.md`. Chỉ dành cho CHUYÊN GIA — dùng khi chuyên gia yêu cầu tạo skill mới hoặc chỉnh sửa skill hiện có. Luôn truyền nội dung đầy đủ của cả file (tool ghi đè hoàn toàn, không append). Tên skill phải là kebab-case, chỉ gồm chữ cái, chữ số, gạch ngang.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "Tên skill (kebab-case), ví dụ `patient-intake`. Dùng làm tên thư mục `skills/<name>/`.",
      },
      content: {
        type: "string",
        description:
          "Toàn bộ nội dung mới của file SKILL.md (bao gồm frontmatter --- name/description --- và phần thân).",
      },
    },
    required: ["name", "content"],
  },
};
