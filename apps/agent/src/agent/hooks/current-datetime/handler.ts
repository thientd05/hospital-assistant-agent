import type { HookContext, HookResult } from "../types.ts";

// Lấy giờ TƯỜNG (wall-clock) Việt Nam bất kể server chạy ở timezone nào, qua
// Intl.formatToParts (không dùng toISOString — lệch UTC).
function nowInVietnam(): { weekday: string; date: string; time: string } {
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    weekday: get("weekday"),
    date: `${get("day")}/${get("month")}/${get("year")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

// Hook "before" cho read_skills(book-appointment): chèn mốc thời gian hiện tại
// đứng TRƯỚC body skill trong cùng tool_result, để agent neo theo đó khi quy đổi
// các diễn đạt tương đối ("thứ 6 tuần này", "tuần sau"…) thành ngày giờ cụ thể.
export default function currentDatetime(_ctx: HookContext): HookResult {
  const { weekday, date, time } = nowInVietnam();
  const inject =
    `# THỜI GIAN HIỆN TẠI (hook current-datetime)\n` +
    `Bây giờ là ${weekday}, ${date}, ${time} (giờ Việt Nam, UTC+7).\n` +
    `Hãy NEO theo mốc này để tự quy đổi mọi diễn đạt tương đối của bệnh nhân ` +
    `("hôm nay", "ngày mai", "thứ mấy", "tuần này", "tuần sau"…) thành ngày giờ ` +
    `cụ thể — KHÔNG đoán theo trí nhớ và KHÔNG hỏi lại bệnh nhân ngày tháng cụ thể.`;
  return { inject };
}
