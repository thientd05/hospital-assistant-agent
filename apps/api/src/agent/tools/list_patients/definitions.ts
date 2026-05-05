import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "list_patients",
  description:
    "Liệt kê TOÀN BỘ bệnh nhân trong hệ thống dưới dạng rút gọn (id, name, age, gender, ward, diagnoses). KHÔNG cần truyền tham số. Trả về `{count, patients}` đã sắp xếp theo `id`. Dùng khi bác sĩ/quản lý muốn xem nhanh danh sách bệnh nhân hiện có; nếu cần lọc theo tiêu chí cụ thể thì dùng `find_patients`. Panel sẽ tự bung tab Bệnh nhân khi tool xong — không cần liệt kê lại JSON thô trong câu trả lời, chỉ cần tóm tắt số lượng và một vài điểm đáng chú ý.",
  input_schema: {
    type: "object",
    properties: {},
  },
};
