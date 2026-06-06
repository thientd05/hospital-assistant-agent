import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "read_exam_history",
  description:
    "Đọc LỊCH SỬ KHÁM của một bệnh nhân — danh sách các lần khám (snapshot lâm sàng theo ngày: sinh hiệu, chẩn đoán, thuốc, kết quả xét nghiệm). " +
    "Gọi tool này KHI bác sĩ muốn xem lại lịch sử / diễn tiến / quá trình điều trị của bệnh nhân (vd để vẽ dashboard trực quan). " +
    "Cần `patientId` của bệnh nhân (lấy từ `read_panel` — bệnh nhân đang chọn ở tab Bệnh nhân, ref dạng `patient:<id>:open`). " +
    "Tool đọc thuần qua REST (không động panel/DB trực tiếp). Trả về { patientId, count, records: [{ id, examDate, doctorName, ward, diagnoses, medications, vitals, labResults }] } — records sắp mới nhất trước.",
  input_schema: {
    type: "object",
    properties: {
      patientId: {
        type: "string",
        description: "Mã bệnh nhân, vd \"BN001\".",
      },
    },
    required: ["patientId"],
  },
};
