import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "check_drug_interaction",
  description:
    "Kiểm tra tương tác giữa các thuốc. Truyền vào danh sách tên thuốc.",
  input_schema: {
    type: "object",
    properties: {
      drugs: {
        type: "array",
        items: { type: "string" },
        description: "Danh sách tên thuốc cần kiểm tra tương tác",
      },
    },
    required: ["drugs"],
  },
};
