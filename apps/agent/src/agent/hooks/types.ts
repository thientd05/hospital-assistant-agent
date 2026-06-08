// Hook = đoạn code chạy XEN vào vòng tool, gắn với MỘT tool, chạy TRƯỚC hoặc SAU
// khi tool thực thi, có thể chèn thêm text vào tool_result (vd: bơm ngày giờ hiện
// tại kèm kết quả skill đặt lịch). Mỗi hook = một thư mục trong `hooks/`:
//   <tên-hook>/config.json   — khai báo: gắn tool nào, trước/sau, khớp tham số gì
//   <tên-hook>/handler.ts     — code: export default (ctx) => { inject?: string }
// Đăng ký hook trong `hooks/index.ts` (import tĩnh — an toàn cho bundler/Vercel).

export type HookTiming = "before" | "after";

export type HookConfig = {
  // Mô tả ngắn hook làm gì (chỉ để người đọc).
  description: string;
  // Hook gắn vào tool nào (tên tool agent gọi, vd "read_skills").
  tool: string;
  // Chạy TRƯỚC hay SAU khi tool thực thi.
  timing: HookTiming;
  // (Tuỳ chọn) chỉ kích hoạt khi tham số tool khớp. Mỗi key = tên field trong
  // input của tool; value = danh sách giá trị chấp nhận. Khớp nếu input[key]
  // (chuỗi hoặc mảng) GIAO với danh sách này khác rỗng. Bỏ trống = luôn khớp.
  match?: Record<string, string[]>;
};

export type HookContext = {
  tool: string;
  input: Record<string, unknown>;
  role: string;
  token: string;
  timing: HookTiming;
  // Kết quả tool — chỉ có ở timing "after".
  result?: string;
};

// Hook trả về đoạn text để chèn kèm tool_result (bỏ trống = không chèn gì).
export type HookResult = { inject?: string } | null | void;

export type HookHandler = (
  ctx: HookContext
) => Promise<HookResult> | HookResult;
