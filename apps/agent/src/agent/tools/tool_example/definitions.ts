import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "tool_example",
  description:
    "Tool mẫu dùng làm khung tham chiếu khi thêm tool mới. Nhận một chuỗi `message` và trả về object xác nhận đã nhận được. KHÔNG có tác dụng phụ — chỉ để minh hoạ cấu trúc definitions/handlers + dispatch + refresh-map.",
  input_schema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Nội dung tuỳ ý mà mô hình muốn echo lại.",
      },
    },
    required: ["message"],
  },
};
