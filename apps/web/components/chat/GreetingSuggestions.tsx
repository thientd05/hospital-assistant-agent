"use client";

// List nút gợi ý hiện dưới lời chào của bệnh nhân. Bấm 1 nút → gửi ngay câu hỏi
// tương ứng tới chatbot; riêng "Câu hỏi khác" chỉ đưa con trỏ về ô nhập để bệnh
// nhân tự gõ (message = null). Viền đậm, nền trắng, chữ màu đặc trưng (brand).

type Suggestion = { label: string; message: string | null };

const SUGGESTIONS: Suggestion[] = [
  { label: "Tư vấn bệnh", message: "Tôi muốn được tư vấn về bệnh" },
  { label: "Gặp bác sĩ", message: "Tôi muốn gặp bác sĩ" },
  { label: "Xem kết quả khám", message: "Tôi muốn xem đầy đủ kết quả khám" },
  { label: "Xem lịch hẹn", message: "Tôi muốn xem lịch hẹn" },
  { label: "Câu hỏi khác", message: null },
];

export function GreetingSuggestions({
  onPick,
  disabled,
}: {
  /** message=null → chỉ focus ô nhập (Câu hỏi khác); ngược lại gửi luôn. */
  onPick: (message: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s.message)}
          className="rounded-lg border border-gray-900 bg-white px-3.5 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-50"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
