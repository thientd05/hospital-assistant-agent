import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "delete_patient",
  description:
    "Xoá vĩnh viễn hồ sơ bệnh nhân khỏi collection `patients` theo `id` (ví dụ `BN012`). Đây là thao tác KHÔNG THỂ HOÀN TÁC — chỉ gọi khi bác sĩ đã yêu cầu xoá rõ ràng và đã xác nhận lại. Không dùng để \"sửa nhầm\" — sửa nhầm hãy dùng `update_patient`. Sau khi xoá thành công, tool trả về danh sách bệnh nhân còn lại (giống output của `list_patients`: `{count, patients}`) để UI tự bung tab Bệnh nhân — KHÔNG cần gọi thêm `list_patients`. Trả `{error}` nếu id không hợp lệ / không tìm thấy / lỗi DB. Lưu ý: tool này KHÔNG xoá appointments hay conversations liên quan; nếu cần dọn dẹp dữ liệu phụ thuộc, báo bác sĩ liên hệ admin DB.",
  input_schema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Mã bệnh nhân cần xoá, ví dụ `BN012`.",
      },
    },
    required: ["id"],
  },
};
