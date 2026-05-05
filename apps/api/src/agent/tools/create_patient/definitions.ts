import Anthropic from "@anthropic-ai/sdk";

export const definition: Anthropic.Tool = {
  name: "create_patient",
  description:
    "Tạo bản ghi bệnh nhân MỚI trong collection `patients` với mã `id` tự sinh (`BN` + số nguyên kế tiếp, zero-pad theo độ dài lớn nhất hiện có, tối thiểu 3 chữ số). Mọi trường input đều OPTIONAL — bác sĩ thường chỉ cho 1–3 trường ban đầu (tên, tuổi, giới, khoa); phần còn lại sẽ bổ sung qua `update_patient`. Trường thiếu được fill placeholder (chuỗi rỗng / 0 / mảng rỗng) để UI có chỗ hiển thị. Dùng tool này khi bác sĩ nói \"tiếp nhận bệnh nhân mới\", \"tạo hồ sơ\", \"bắt đầu ghi chép thông tin bệnh nhân\". Hệ thống đồng thời tự sinh `username` (= `id` viết thường, ví dụ `bn011`) và mật khẩu mặc định (`matkhau<username>`, ví dụ `matkhaubn011`) để bệnh nhân có thể đăng nhập chat tư vấn — passwordHash đã được hash trước khi lưu. Trả về `{ ok, id, username, password, patient }`; **hãy nhắc bác sĩ thông báo `username` + `password` cho bệnh nhân và khuyến nghị họ đổi mật khẩu sau lần đăng nhập đầu tiên** (cơ chế đổi mật khẩu sẽ bổ sung sau).",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Họ tên bệnh nhân." },
      age: { type: "number", description: "Tuổi." },
      gender: {
        type: "string",
        enum: ["Nam", "Nữ"],
        description: "Giới tính.",
      },
      ward: { type: "string", description: "Khoa/phòng." },
      diagnoses: {
        type: "array",
        items: { type: "string" },
        description: "Danh sách chẩn đoán ban đầu.",
      },
      medications: {
        type: "array",
        items: { type: "string" },
        description: "Thuốc đang dùng.",
      },
      vitals: {
        type: "object",
        description:
          "Sinh hiệu ban đầu (partial). Truyền field nào set field đó; field thiếu để 0/'' và `recordedAt` tự đặt thời gian hiện tại.",
        properties: {
          spO2: { type: "number" },
          heartRate: { type: "number" },
          bloodPressure: {
            type: "string",
            description: "Chuỗi `tâm thu/tâm trương`, ví dụ `150/90`.",
          },
          temperature: { type: "number" },
        },
      },
    },
  },
};
