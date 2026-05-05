import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "find_patients",
  description:
    "Tra cứu danh sách bệnh nhân theo các tiêu chí một phần khi bác sĩ KHÔNG cung cấp mã `BN…`. Trả về `{count, patientIds}` (cap 50, có cờ `truncated` nếu vượt). PHẢI có ít nhất một tiêu chí. Quy trình bắt buộc theo `count`: 0 → báo không tìm thấy; 1 → gọi tiếp `get_patient_record` với id duy nhất; >1 → hỏi bác sĩ thêm tiêu chí lọc, KHÔNG tự chọn. Nếu bác sĩ đã cho mã `BN…` thì bỏ qua tool này, gọi thẳng `get_patient_record`. Khớp chuỗi không phân biệt hoa/thường, có dấu tiếng Việt.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Tên bệnh nhân — khớp một phần (substring).",
      },
      age: {
        type: "number",
        description: "Tuổi chính xác.",
      },
      gender: {
        type: "string",
        enum: ["Nam", "Nữ"],
        description: "Giới tính, đúng `Nam` hoặc `Nữ`.",
      },
      ward: {
        type: "string",
        description: "Khoa/phòng — khớp một phần.",
      },
      diagnosis: {
        type: "string",
        description:
          "Từ khoá chẩn đoán — khớp một phần với phần tử bất kỳ trong mảng `diagnoses`.",
      },
    },
  },
};
