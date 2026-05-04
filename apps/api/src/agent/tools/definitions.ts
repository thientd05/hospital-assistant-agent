import Anthropic from "@anthropic-ai/sdk";

export const tools: Anthropic.Tool[] = [
  {
    name: "find_patients",
    description:
      "Tra cứu danh sách bệnh nhân theo các tiêu chí một phần khi bác sĩ KHÔNG cung cấp mã `BN…`. Trả về `{count, patientIds}` (cap 50, có cờ `truncated` nếu vượt). PHẢI có ít nhất một tiêu chí. Quy trình bắt buộc theo `count`: 0 → báo không tìm thấy; 1 → gọi tiếp `get_patient_record` với id duy nhất; >1 → hỏi bác sĩ thêm tiêu chí lọc, KHÔNG tự chọn. Nếu bác sĩ đã cho mã `BN…` thì bỏ qua tool này, gọi thẳng `get_patient_record`. Khớp chuỗi không phân biệt hoa/thường, có dấu tiếng Việt.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Tên bệnh nhân — khớp một phần (substring).",
        },
        age: {
          type: "number",
          description: "Tuổi chính xác.",
        },
        gender: {
          type: "string",
          enum: ["Nam", "Nữ"],
          description: "Giới tính, đúng `Nam` hoặc `Nữ`.",
        },
        ward: {
          type: "string",
          description: "Khoa/phòng — khớp một phần.",
        },
        diagnosis: {
          type: "string",
          description:
            "Từ khoá chẩn đoán — khớp một phần với phần tử bất kỳ trong mảng `diagnoses`.",
        },
      },
    },
  },
  {
    name: "get_patient_record",
    description:
      "Tra cứu toàn bộ hồ sơ bệnh nhân bao gồm thông tin cơ bản, sinh hiệu, chẩn đoán và thuốc đang dùng.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "Mã bệnh nhân" },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "get_lab_results",
    description:
      "Lấy kết quả xét nghiệm của bệnh nhân, có thể lọc theo số lượng gần nhất.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "Mã bệnh nhân" },
        limit: {
          type: "number",
          description: "Số kết quả gần nhất cần lấy, mặc định 10",
        },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "get_appointments",
    description:
      "Lấy TOÀN BỘ cuộc hẹn của bác sĩ ĐANG ĐĂNG NHẬP, sắp xếp theo `scheduledAt` tăng dần. KHÔNG cần truyền tham số — hệ thống tự nhận diện bác sĩ. Mỗi cuộc hẹn kèm `patientName` (đã join từ collection `patients`) và `status` là một trong `\"Chờ duyệt\"` / `\"Đã duyệt\"` / `\"Thành công\"`. Dùng khi bác sĩ hỏi về lịch hẹn, lịch hôm nay/tuần này, cuộc hẹn chờ duyệt, v.v. Panel sẽ tự bung tab Lịch hẹn khi tool xong.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_customer_stats",
    description:
      "Tổng hợp thống kê khách hàng (bệnh nhân) và lịch hẹn của TOÀN PHÒNG KHÁM. Dành chủ yếu cho QUẢN LÝ phòng khám: tổng số bệnh nhân, phân bố theo giới và độ tuổi, top khoa và top chẩn đoán, số bệnh nhân có xét nghiệm bất thường; tổng cuộc hẹn, phân bố theo trạng thái (`Chờ duyệt`/`Đã duyệt`/`Thành công`) và theo bác sĩ (kèm `fullName`). KHÔNG cần truyền tham số trừ khi muốn đổi `topDiagnoses`/`topWards` (mặc định 10 mỗi loại). Trả về JSON `{ patients: {...}, appointments: {...} }`. Khi quản lý hỏi \"thống kê\", \"báo cáo\", \"số liệu\", \"phân bố\", \"có bao nhiêu bệnh nhân/lịch hẹn\" — gọi tool này thay vì đoán.",
    input_schema: {
      type: "object",
      properties: {
        topDiagnoses: {
          type: "number",
          description: "Số chẩn đoán phổ biến nhất cần liệt kê, mặc định 10.",
        },
        topWards: {
          type: "number",
          description: "Số khoa/phòng đông bệnh nhân nhất cần liệt kê, mặc định 10.",
        },
      },
    },
  },
  {
    name: "check_drug_interaction",
    description:
      "Kiểm tra tương tác giữa các thuốc. Truyền vào danh sách tên thuốc.",
    input_schema: {
      type: "object",
      properties: {
        drugs: {
          type: "array",
          items: { type: "string" },
          description: "Danh sách tên thuốc cần kiểm tra tương tác",
        },
      },
      required: ["drugs"],
    },
  },
  {
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
  },
  {
    name: "update_patient",
    description:
      "Cập nhật từng phần một bệnh nhân theo `id`. KHÔNG ghi đè cả mảng — diagnoses/medications/labResults chỉ thêm/bớt phần tử qua các trường `add_*` / `remove_*`. Vitals: truyền field nào set field đó (dot-notation phía server) và tự đặt `vitals.recordedAt` mới. Phải có `id` + ít nhất 1 trường update. Dùng cho mọi sửa đổi sau khi bệnh nhân đã được tạo: bổ sung thông tin, sửa nhầm, thêm chẩn đoán/thuốc, push kết quả xét nghiệm.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Mã bệnh nhân, ví dụ `BN012`.",
        },
        name: { type: "string" },
        age: { type: "number" },
        gender: { type: "string", enum: ["Nam", "Nữ"] },
        ward: { type: "string" },
        vitals: {
          type: "object",
          description:
            "Cập nhật sinh hiệu (partial). Field nào truyền sẽ được `$set`, đồng thời tự cập nhật `vitals.recordedAt`.",
          properties: {
            spO2: { type: "number" },
            heartRate: { type: "number" },
            bloodPressure: { type: "string" },
            temperature: { type: "number" },
          },
        },
        add_diagnoses: {
          type: "array",
          items: { type: "string" },
          description: "Thêm chẩn đoán (không trùng phần tử đã có).",
        },
        remove_diagnoses: {
          type: "array",
          items: { type: "string" },
          description: "Gỡ chẩn đoán (khớp đúng chuỗi).",
        },
        add_medications: {
          type: "array",
          items: { type: "string" },
          description: "Thêm thuốc đang dùng.",
        },
        remove_medications: {
          type: "array",
          items: { type: "string" },
          description: "Gỡ thuốc đang dùng.",
        },
        add_lab_results: {
          type: "array",
          description:
            "Push thêm kết quả xét nghiệm vào `labResults`. Mỗi entry bắt buộc đủ name/value/unit/referenceRange/isAbnormal. `recordedAt` server tự đặt nếu không truyền.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              value: {
                description: "Số (định lượng) hoặc chuỗi (định tính).",
              },
              unit: { type: "string" },
              referenceRange: { type: "string" },
              isAbnormal: { type: "boolean" },
              recordedAt: {
                type: "string",
                description: "ISO datetime, optional — server tự đặt nếu thiếu.",
              },
            },
            required: ["name", "value", "unit", "referenceRange", "isAbnormal"],
          },
        },
      },
      required: ["id"],
    },
  },
  {
    name: "read_skill",
    description:
      "Đọc nội dung đầy đủ của một kỹ năng trong thư viện skills. Truyền vào TÊN kỹ năng (đúng theo trường `name` trong frontmatter, ví dụ `patient-intake`, `lab-result-entry`). Tool sẽ tự đọc `skills/<tên>/SKILL.md`. Dùng tool này khi yêu cầu của bác sĩ phù hợp với mô tả ngắn của một kỹ năng trong danh sách kỹ năng ở system prompt.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Tên kỹ năng (đúng theo `name` trong frontmatter), ví dụ `patient-intake`.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "read_memory",
    description:
      "Đọc một file trong workspace của bác sĩ ĐANG ĐĂNG NHẬP. Chỉ chấp nhận đúng một trong ba giá trị: `USER.md`, `SOUL.md`, `MEMORY.md`. KHÔNG BAO GIỜ được đọc `AGENT.md` qua tool này — AGENT.md là prompt hệ thống mặc định, đã có sẵn trong context và bị cấm đọc/sửa trực tiếp. Mã bác sĩ do hệ thống tự nhận diện, KHÔNG cần truyền.",
    input_schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          enum: ["USER.md", "SOUL.md", "MEMORY.md"],
          description:
            "Tên file cần đọc, chỉ được là một trong: USER.md, SOUL.md, MEMORY.md.",
        },
      },
      required: ["file"],
    },
  },
  {
    name: "update_user_profile",
    description:
      "Ghi đè USER.md — hồ sơ bác sĩ trong không gian làm việc. CHỈ dùng khi bác sĩ YÊU CẦU RÕ RÀNG cập nhật thông tin cá nhân, khoa, chuyên môn, phạm vi công việc, kiến thức nền. Tham số `content` phải là TOÀN BỘ nội dung markdown mới (file sẽ bị ghi đè hoàn toàn) — hãy đọc nội dung hiện tại trong system prompt, chỉnh phần cần sửa, rồi gửi toàn bộ. Mã bác sĩ do hệ thống tự nhận diện theo người đăng nhập, KHÔNG cần và KHÔNG thể truyền vào tool này.",
    input_schema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Toàn bộ nội dung mới của USER.md (markdown).",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "update_working_style",
    description:
      "Ghi đè SOUL.md — phong cách làm việc bác sĩ muốn agent áp dụng. CHỈ dùng khi bác sĩ YÊU CẦU RÕ RÀNG thay đổi cách trả lời, định dạng, điều cần tránh, mức độ chi tiết, v.v. Tham số `content` phải là TOÀN BỘ nội dung markdown mới (file sẽ bị ghi đè hoàn toàn) — hãy đọc nội dung hiện tại trong system prompt, chỉnh phần cần sửa, rồi gửi toàn bộ. Mã bác sĩ do hệ thống tự nhận diện, KHÔNG cần truyền.",
    input_schema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Toàn bộ nội dung mới của SOUL.md (markdown).",
        },
      },
      required: ["content"],
    },
  },
  {
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
  },
  {
    name: "write_skill",
    description:
      "Tạo hoặc ghi đè nội dung của một skill trong thư viện. Tool tạo thư mục `skills/<name>/` nếu chưa tồn tại và ghi toàn bộ `content` vào `SKILL.md`. Chỉ dành cho CHUYÊN GIA — dùng khi chuyên gia yêu cầu tạo skill mới hoặc chỉnh sửa skill hiện có. Luôn truyền nội dung đầy đủ của cả file (tool ghi đè hoàn toàn, không append). Tên skill phải là kebab-case, chỉ gồm chữ cái, chữ số, gạch ngang.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Tên skill (kebab-case), ví dụ `patient-intake`. Dùng làm tên thư mục `skills/<name>/`.",
        },
        content: {
          type: "string",
          description:
            "Toàn bộ nội dung mới của file SKILL.md (bao gồm frontmatter --- name/description --- và phần thân).",
        },
      },
      required: ["name", "content"],
    },
  },
];
