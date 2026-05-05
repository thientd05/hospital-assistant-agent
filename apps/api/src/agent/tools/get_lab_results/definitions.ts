import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "get_lab_results",
  description:
    "Lấy kết quả xét nghiệm của bệnh nhân, có thể lọc theo số lượng gần nhất.",
  input_schema: {
    type: "object",
    properties: {
      patient_id: { type: "string", description: "Mã bệnh nhân" },
      limit: {
        type: "number",
        description: "Số kết quả gần nhất cần lấy, mặc định 10",
      },
    },
    required: ["patient_id"],
  },
};
