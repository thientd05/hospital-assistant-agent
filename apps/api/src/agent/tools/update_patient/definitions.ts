import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "update_patient",
  description:
    "Cập nhật từng phần một bệnh nhân theo `id`. KHÔNG ghi đè cả mảng — diagnoses/medications/labResults chỉ thêm/bớt phần tử qua các trường `add_*` / `remove_*`. Vitals: truyền field nào set field đó (dot-notation phía server) và tự đặt `vitals.recordedAt` mới. Phải có `id` + ít nhất 1 trường update. Dùng cho mọi sửa đổi sau khi bệnh nhân đã được tạo: bổ sung thông tin, sửa nhầm, thêm chẩn đoán/thuốc, push kết quả xét nghiệm.",
  input_schema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Mã bệnh nhân, ví dụ `BN012`.",
      },
      name: { type: "string" },
      age: { type: "number" },
      gender: { type: "string", enum: ["Nam", "Nữ"] },
      ward: { type: "string" },
      vitals: {
        type: "object",
        description:
          "Cập nhật sinh hiệu (partial). Field nào truyền sẽ được `$set`, đồng thời tự cập nhật `vitals.recordedAt`.",
        properties: {
          spO2: { type: "number" },
          heartRate: { type: "number" },
          bloodPressure: { type: "string" },
          temperature: { type: "number" },
        },
      },
      add_diagnoses: {
        type: "array",
        items: { type: "string" },
        description: "Thêm chẩn đoán (không trùng phần tử đã có).",
      },
      remove_diagnoses: {
        type: "array",
        items: { type: "string" },
        description: "Gỡ chẩn đoán (khớp đúng chuỗi).",
      },
      add_medications: {
        type: "array",
        items: { type: "string" },
        description: "Thêm thuốc đang dùng.",
      },
      remove_medications: {
        type: "array",
        items: { type: "string" },
        description: "Gỡ thuốc đang dùng.",
      },
      add_lab_results: {
        type: "array",
        description:
          "Push thêm kết quả xét nghiệm vào `labResults`. Mỗi entry bắt buộc đủ name/value/unit/referenceRange/isAbnormal. `recordedAt` server tự đặt nếu không truyền.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            value: {
              description: "Số (định lượng) hoặc chuỗi (định tính).",
            },
            unit: { type: "string" },
            referenceRange: { type: "string" },
            isAbnormal: { type: "boolean" },
            recordedAt: {
              type: "string",
              description:
                "ISO datetime, optional — server tự đặt nếu thiếu.",
            },
          },
          required: ["name", "value", "unit", "referenceRange", "isAbnormal"],
        },
      },
    },
    required: ["id"],
  },
};
