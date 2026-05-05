import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "read_memory",
  description:
    "Đọc một file trong workspace của bác sĩ ĐANG ĐĂNG NHẬP. Chỉ chấp nhận đúng một trong ba giá trị: `USER.md`, `SOUL.md`, `MEMORY.md`. KHÔNG BAO GIỜ được đọc `AGENT.md` qua tool này — AGENT.md là prompt hệ thống mặc định, đã có sẵn trong context và bị cấm đọc/sửa trực tiếp. Mã bác sĩ do hệ thống tự nhận diện, KHÔNG cần truyền.",
  input_schema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        enum: ["USER.md", "SOUL.md", "MEMORY.md"],
        description:
          "Tên file cần đọc, chỉ được là một trong: USER.md, SOUL.md, MEMORY.md.",
      },
    },
    required: ["file"],
  },
};
