import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "get_customer_stats",
  description:
    "Tổng hợp thống kê khách hàng (bệnh nhân) và lịch hẹn của TOÀN PHÒNG KHÁM. Dành chủ yếu cho QUẢN LÝ phòng khám: tổng số bệnh nhân, phân bố theo giới và độ tuổi, top khoa và top chẩn đoán, số bệnh nhân có xét nghiệm bất thường; tổng cuộc hẹn, phân bố theo trạng thái (`Chờ duyệt`/`Đã duyệt`/`Thành công`) và theo bác sĩ (kèm `fullName`). KHÔNG cần truyền tham số trừ khi muốn đổi `topDiagnoses`/`topWards` (mặc định 10 mỗi loại). Trả về JSON `{ patients: {...}, appointments: {...} }`. Khi quản lý hỏi \"thống kê\", \"báo cáo\", \"số liệu\", \"phân bố\", \"có bao nhiêu bệnh nhân/lịch hẹn\" — gọi tool này thay vì đoán.",
  input_schema: {
    type: "object",
    properties: {
      topDiagnoses: {
        type: "number",
        description: "Số chẩn đoán phổ biến nhất cần liệt kê, mặc định 10.",
      },
      topWards: {
        type: "number",
        description:
          "Số khoa/phòng đông bệnh nhân nhất cần liệt kê, mặc định 10.",
      },
    },
  },
};
