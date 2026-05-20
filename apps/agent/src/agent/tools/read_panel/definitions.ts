import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "read_panel",
  description:
    "Đọc SNAPSHOT hiện tại của panel mà KHÔNG thao tác gì. " +
    "Dùng để định hướng (xem đang ở tab nào, có những phần tử nào, giá trị/lỗi hiện tại) hoặc kiểm tra kết quả sau khi `act`. " +
    "Trả về { panelOpen, activeTab, tabs, elements }; mỗi phần tử có { ref, role, label, value?, checked?, disabled? }. " +
    "Nếu panel đang đóng, panelOpen = false và elements rỗng — hãy gọi `open_panel` trước.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};
