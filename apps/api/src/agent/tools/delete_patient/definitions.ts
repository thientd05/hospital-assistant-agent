import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "delete_patient",
  description:
    "Xoá vĩnh viễn MỘT HOẶC NHIỀU hồ sơ bệnh nhân khỏi collection `patients`. Truyền `ids` là MẢNG mã bệnh nhân (ví dụ `[\"BN012\"]` hoặc `[\"BN012\", \"BN015\"]`). Thao tác KHÔNG THỂ HOÀN TÁC — chỉ gọi khi bác sĩ đã yêu cầu xoá rõ ràng và đã xác nhận lại TOÀN BỘ danh sách mã. Không dùng để \"sửa nhầm\" — sửa nhầm hãy dùng `update_patient`. Tool sẽ cố xoá tất cả id hợp lệ trong mảng (dùng `deleteMany` với `$in`); id không tồn tại được liệt kê riêng trong `notFoundIds`. Sau khi xoá, trả về `{ok, deletedIds, notFoundIds, count, patients}` — `count` + `patients` là danh sách bệnh nhân CÒN LẠI (giống output của `list_patients`) để UI tự bung tab Bệnh nhân, KHÔNG cần gọi thêm `list_patients`. Trả `{error}` nếu mảng rỗng / chứa id sai format / không xoá được id nào / lỗi DB. Lưu ý: tool này KHÔNG xoá appointments hay conversations liên quan; nếu cần dọn dữ liệu phụ thuộc, báo bác sĩ liên hệ admin DB.",
  input_schema: {
    type: "object",
    properties: {
      ids: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description:
          "Danh sách mã bệnh nhân cần xoá, ví dụ `[\"BN012\"]` hoặc `[\"BN012\", \"BN015\"]`. Mỗi phần tử phải khớp regex `^BN\\d+$` (không phân biệt hoa/thường).",
      },
    },
    required: ["ids"],
  },
};
