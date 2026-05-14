import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "submit_patient_form",
  description:
    "Bấm nút 'Tạo' trên form bệnh nhân (đã được mở qua `open_patient_form`). " +
    "Frontend sẽ gọi REST `POST /api/patients` với các giá trị hiện đang có trong form. " +
    "Ràng buộc: form phải đang mở; có ít nhất một field được điền; name+ward không rỗng; age là số nguyên ≥ 0. " +
    "Trả về: { ok: true, patient } khi tạo thành công, hoặc { ok: false, error } nếu form chưa mở / form trống / lỗi validation / lỗi mạng.",
  input_schema: { type: "object", properties: {}, required: [] },
};
