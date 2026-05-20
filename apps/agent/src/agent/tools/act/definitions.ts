import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "act",
  description:
    "Thực hiện MỘT CHUỖI thao tác mô phỏng con người trên panel (giống agent code thao tác web). " +
    "Truyền `actions` là MẢNG các bước; frontend chạy TUẦN TỰ, có độ trễ giữa mỗi bước để bác sĩ quan sát. " +
    "Hãy gộp nhiều bước vào MỘT lần gọi `act` để chạy nhanh, thay vì gọi từng bước một. " +
    "Mỗi action nhắm một phần tử qua `ref` lấy từ snapshot (open_panel/read_panel). " +
    "Kết quả: nếu mọi bước OK → { ok: true, executed, snapshot } (đọc snapshot để xác nhận, ví dụ form đã đóng = thành công); " +
    "nếu một bước lỗi → DỪNG ngay và trả { ok: false, failedAt, error, steps, snapshot } để bạn debug (đọc phần tử role 'alert' để biết lỗi validation).",
  input_schema: {
    type: "object",
    properties: {
      actions: {
        type: "array",
        description: "Danh sách bước thao tác, chạy tuần tự theo đúng thứ tự.",
        items: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["click", "type", "select", "check"],
              description:
                "click: bấm button/tab. type: nhập text vào input/textarea (tự xoá giá trị cũ trước). select: chọn option của dropdown. check: tick/bỏ tick checkbox.",
            },
            ref: {
              type: "string",
              description:
                "Định danh phần tử lấy từ snapshot (vd 'patient-form:name', 'tab:patients').",
            },
            value: {
              type: "string",
              description:
                "Giá trị cho type/select/check. type/select: chuỗi cần nhập/chọn. check: 'true' để tick, 'false' để bỏ tick. Bỏ trống với click.",
            },
          },
          required: ["action", "ref"],
        },
      },
    },
    required: ["actions"],
  },
};
