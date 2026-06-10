"use client";

import { useState } from "react";

// Một ngôi sao SVG. `fill`: tô vàng cả viền lẫn nền; ngược lại viền đen, nền trắng.
function Star({
  filled,
  size = 16,
}: {
  filled: boolean;
  size?: number;
}) {
  const color = filled ? "#f59e0b" : "none";
  const stroke = filled ? "#f59e0b" : "#1f2937";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      stroke={stroke}
      strokeWidth="1.6"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <polygon points="12 2.5 15.09 8.76 22 9.77 17 14.64 18.18 21.52 12 18.27 5.82 21.52 7 14.64 2 9.77 8.91 8.76" />
    </svg>
  );
}

type Props = {
  /** Số sao đã chấm (0 = chưa chấm). */
  value: number;
  /** Chấm sao (1..5). Bỏ qua khi readOnly. */
  onRate?: (stars: number) => void;
  /** Chế độ chỉ đọc (chuyên gia xem) — không hover mở rộng, không chấm. */
  readOnly?: boolean;
};

// Icon sao thu gọn (viền đen nền trắng khi chưa chấm; vàng + ×N khi đã chấm) —
// di chuột vào sẽ mở rộng thành hàng 5 sao để bệnh nhân chấm câu trả lời chatbot.
export function StarRating({ value, onRate, readOnly = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState(0);

  // === Chế độ chỉ đọc (chuyên gia) ===
  if (readOnly) {
    if (!value) {
      return (
        <div className="mt-1.5 text-[11px] text-gray-400">Chưa đánh giá</div>
      );
    }
    return (
      <div className="mt-1.5 flex items-center gap-0.5" aria-label={`Đánh giá ${value} sao`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= value} size={15} />
        ))}
        <span className="ml-1 text-[11px] font-medium text-amber-500">×{value}</span>
      </div>
    );
  }

  // === Chế độ bệnh nhân chấm ===
  const handleRate = (n: number) => {
    onRate?.(n);
    setExpanded(false);
    setHover(0);
  };

  return (
    <div
      className="mt-1.5 inline-flex items-center"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        setExpanded(false);
        setHover(0);
      }}
    >
      {expanded ? (
        // Mở rộng: hàng 5 sao. Rê tới sao nào → tô vàng tới đó (xem trước).
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Đánh giá ${n} sao`}
              onMouseEnter={() => setHover(n)}
              onClick={() => handleRate(n)}
              className="p-0.5 leading-none transition-transform hover:scale-110"
            >
              <Star filled={n <= (hover || value)} size={17} />
            </button>
          ))}
        </div>
      ) : value ? (
        // Thu gọn (đã chấm): sao vàng + ×N.
        <button
          type="button"
          aria-label={`Đã đánh giá ${value} sao — sửa`}
          className="inline-flex items-center gap-1"
        >
          <Star filled size={16} />
          <span className="text-[11px] font-medium text-amber-500">×{value}</span>
        </button>
      ) : (
        // Thu gọn (chưa chấm): sao viền đen nền trắng.
        <button
          type="button"
          aria-label="Đánh giá câu trả lời"
          className="inline-flex items-center opacity-70 hover:opacity-100 transition-opacity"
        >
          <Star filled={false} size={16} />
        </button>
      )}
    </div>
  );
}
