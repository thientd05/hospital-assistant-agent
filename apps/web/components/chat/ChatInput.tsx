"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type Props = {
  onSend: (text: string) => void;
  disabled: boolean;
  role?: string | null;
  placeholder?: string;
};

const ROLE_LABEL_VI: Record<string, string> = {
  doctor: "bác sĩ",
  manager: "quản lý",
  expert: "chuyên gia",
  patient: "bệnh nhân",
};

function placeholderByRole(role?: string | null): string {
  const label = role ? ROLE_LABEL_VI[role] ?? "bạn" : "bạn";
  return `Tôi có thể giúp gì cho ${label} hôm nay?`;
}

const MAX_ROWS = 5;
const LINE_HEIGHT = 22;
const PADDING_Y = 8;

export function ChatInput({
  onSend,
  disabled,
  role,
  placeholder,
}: Props) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxHeight = LINE_HEIGHT * MAX_ROWS + PADDING_Y * 2;
    const next = Math.min(ta.scrollHeight, maxHeight);
    ta.style.height = `${next}px`;
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="px-6 pb-6 pt-3">
      <div className="max-w-3xl mx-auto">
        <div className="border border-gray-200 rounded-2xl px-3 pt-2 pb-2 bg-white focus-within:border-gray-400 transition-colors">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            disabled={disabled}
            rows={1}
            placeholder={placeholder ?? placeholderByRole(role)}
            className="w-full resize-none outline-none bg-transparent text-sm leading-[22px] py-[8px] disabled:opacity-50"
          />

          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              disabled
              aria-label="Tải lên (chưa khả dụng)"
              title="Tải lên (chưa khả dụng)"
              className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <svg
                viewBox="0 0 20 20"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 4v12" />
                <path d="M4 10h12" />
              </svg>
            </button>

            <div className="flex-1" />

            <button
              type="button"
              onClick={submit}
              disabled={disabled || !value.trim()}
              className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-opacity"
              aria-label="Gửi"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
