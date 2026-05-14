import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "open_patient_form",
  description:
    "Mở form 'Tạo bệnh nhân mới' trên panel của bác sĩ và (tuỳ chọn) điền sẵn các trường. " +
    "Tool KHÔNG ghi database — nó chỉ điều khiển panel; sau đó gọi `submit_patient_form` để lưu. " +
    "Có thể gọi nhiều lần để cập nhật từng trường (giá trị mới ghi đè lên giá trị cũ trong cùng field). " +
    "Trả về: { opened, fields } trong đó `fields` là giá trị thực tế đang nằm trong từng input của form (để biết field nào nhận, field nào không hợp lệ).",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Họ tên bệnh nhân." },
      age: {
        type: "string",
        description:
          "Tuổi (chuỗi số nguyên ≥ 0). Truyền chuỗi để form có thể nhận giá trị nháp; lúc submit mới validate.",
      },
      gender: {
        type: "string",
        enum: ["Nam", "Nữ"],
        description: "Giới tính.",
      },
      ward: { type: "string", description: "Khoa / phòng." },
      medications: {
        type: "string",
        description: "Danh sách thuốc, phân tách bằng dấu phẩy.",
      },
      spO2: {
        type: "string",
        description: "SpO2 (%), chuỗi số. Ví dụ '98'.",
      },
      heartRate: {
        type: "string",
        description: "Nhịp tim (bpm), chuỗi số. Ví dụ '72'.",
      },
      bloodPressure: {
        type: "string",
        description: "Huyết áp (mmHg). Định dạng tự do, ví dụ '120/80'.",
      },
      temperature: {
        type: "string",
        description: "Nhiệt độ (°C), chuỗi số thập phân. Ví dụ '36.7'.",
      },
    },
    required: [],
  },
};
