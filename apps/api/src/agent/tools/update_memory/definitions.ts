import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "update_memory",
  description:
    "Ghi THÊM (append) một mục kinh nghiệm vào MEMORY.md trong workspace của bác sĩ ĐANG ĐĂNG NHẬP. KHÔNG ghi đè — mục mới được nối vào cuối file, ngăn cách bằng dòng trống. Chỉ dùng khi đúng điều kiện ở mục \"Khi nào lưu MEMORY\" của AGENT.md: bác sĩ vừa sửa cách bạn làm, vừa xác nhận một quyết định khó, vừa lộ một đặc thù lâm sàng/khoa, hoặc bạn vừa rút kinh nghiệm từ một hiểu nhầm. KHÔNG dùng để lưu sự thật trong DB (đã có collection `patients`), thông tin định danh bác sĩ (dùng `update_user_profile` cho USER.md), hay preferences (dùng `update_working_style` cho SOUL.md). Tham số `entry` là nội dung markdown của MỘT mục mới — ngắn gọn, đủ ngữ cảnh (cái gì + tại sao) để các turn sau dùng được. Mã bác sĩ do hệ thống tự nhận diện, KHÔNG cần truyền.",
  input_schema: {
    type: "object",
    properties: {
      entry: {
        type: "string",
        description:
          "Nội dung markdown của một mục kinh nghiệm mới sẽ được nối vào cuối MEMORY.md.",
      },
    },
    required: ["entry"],
  },
};
