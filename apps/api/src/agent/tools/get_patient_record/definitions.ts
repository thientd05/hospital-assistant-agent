import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "get_patient_record",
  description:
    "Tra cứu toàn bộ hồ sơ bệnh nhân bao gồm thông tin cơ bản, sinh hiệu, chẩn đoán và thuốc đang dùng.",
  input_schema: {
    type: "object",
    properties: {
      patient_id: { type: "string", description: "Mã bệnh nhân" },
    },
    required: ["patient_id"],
  },
};
