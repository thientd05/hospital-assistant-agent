// Date helpers cho chế độ xem lịch hẹn Tháng / Tuần / Ngày (tuần bắt đầu Thứ Hai).
// Thuần, không phụ thuộc React — dùng chung cho panel bác sĩ lẫn bệnh nhân.

export type CalView = "month" | "week" | "day";

export const CAL_VIEWS: { key: CalView; label: string }[] = [
  { key: "month", label: "Tháng" },
  { key: "week", label: "Tuần" },
  { key: "day", label: "Ngày" },
];

// Nhãn thứ trong tuần (Thứ Hai → Chủ Nhật) cho header bảng lịch tháng.
export const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

// Khoá ngày theo giờ ĐỊA PHƯƠNG ("YYYY-MM-DD") — không dùng toISOString (lệch UTC).
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b);
}

// Chỉ số ngày trong tuần với Thứ Hai = 0 … Chủ Nhật = 6.
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

// Thứ Hai của tuần chứa `d`.
export function startOfWeek(d: Date): Date {
  return startOfDay(addDays(d, -mondayIndex(d)));
}

// 7 ngày của tuần chứa `d` (Thứ Hai → Chủ Nhật).
export function weekDays(d: Date): Date[] {
  const s = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

// Ma trận 6×7 (Thứ Hai trước) phủ kín tháng chứa `d`, gồm ngày tràn của tháng kề.
export function monthMatrix(d: Date): Date[][] {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i)));
  }
  return weeks;
}

export function isSameMonth(d: Date, ref: Date): boolean {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function isSameWeek(d: Date, ref: Date): boolean {
  return ymd(startOfWeek(d)) === ymd(startOfWeek(ref));
}

// Một lịch hẹn có nằm trong phạm vi hiển thị hiện tại không?
export function inView(
  scheduledAt: string | Date,
  view: CalView,
  cursor: Date
): boolean {
  const dt = new Date(scheduledAt);
  if (Number.isNaN(dt.getTime())) return false;
  if (view === "day") return isSameDay(dt, cursor);
  if (view === "week") return isSameWeek(dt, cursor);
  return isSameMonth(dt, cursor); // month
}

// Bước trước/sau theo chế độ đang xem.
export function step(view: CalView, cursor: Date, dir: 1 | -1): Date {
  if (view === "day") return addDays(cursor, dir);
  if (view === "week") return addDays(cursor, dir * 7);
  return addMonths(cursor, dir);
}

const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];
const FULL_WEEKDAYS = [
  "Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy",
];

function dm(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Nhãn phạm vi hiển thị cho thanh điều hướng.
export function rangeLabel(view: CalView, cursor: Date): string {
  if (view === "day") {
    return `${FULL_WEEKDAYS[cursor.getDay()]}, ${dm(cursor)}/${cursor.getFullYear()}`;
  }
  if (view === "week") {
    const days = weekDays(cursor);
    const a = days[0]!;
    const b = days[6]!;
    return `${dm(a)} – ${dm(b)}/${b.getFullYear()}`;
  }
  return `${MONTHS[cursor.getMonth()]}, ${cursor.getFullYear()}`;
}
