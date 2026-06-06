import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "read_service_prices",
  description:
    "Đọc BẢNG GIÁ THAM KHẢO các dịch vụ khám của phòng khám (khám tổng quát, khám chuyên khoa, chẩn đoán hình ảnh, xét nghiệm, thủ thuật, tiêm chủng, khám tại nhà). " +
    "Gọi tool này KHI bệnh nhân hỏi về chi phí / giá / bao nhiêu tiền của một dịch vụ khám. " +
    "Tool đọc thuần (không động DB/panel; không có panel đồ họa cho phần giá). Trả về { count, services: [{ id, name, category, price, unit, description? }] } với `price` là VND. " +
    "LƯU Ý khi tư vấn giá: tư vấn (chat) là MIỄN PHÍ, chỉ tính phí khi thực sự khám; đây chỉ là giá THAM KHẢO, chi phí cuối cùng phụ thuộc vào chỉ định của bác sĩ.",
  input_schema: {
    type: "object",
    properties: {},
  },
};
