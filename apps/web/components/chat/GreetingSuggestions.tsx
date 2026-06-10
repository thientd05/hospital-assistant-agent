"use client";

// List nút gợi ý hiện dưới lời chào của bệnh nhân. Bấm 1 nút → gửi ngay câu hỏi
// tương ứng tới chatbot; riêng "Câu hỏi khác" chỉ đưa con trỏ về ô nhập để bệnh
// nhân tự gõ (message = null). Nút tông brand đồng nhất (viền/nền/chữ cùng hệ
// màu), có đổ bóng + nhấc nhẹ khi hover + lún khi bấm để trông bấm được. Khi mount
// (lời chào vừa gõ xong) các nút hiện DẦN từ trái qua phải (.chip-in + delay so le).

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
      {SUGGESTIONS.map((s, i) => (
        // Wrapper lo hiệu ứng hiện dần (delay so le); nút lo hover/active riêng.
        <span
          key={s.label}
          className="chip-in inline-flex"
          style={{ animationDelay: `${i * 200}ms` }}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(s.message)}
            className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 shadow-sm transition-all hover:-translate-y-px hover:border-brand-300 hover:bg-brand-100 hover:shadow active:translate-y-0 active:shadow-sm disabled:opacity-50"
          >
            {s.label}
          </button>
        </span>
      ))}
    </div>
  );
}
