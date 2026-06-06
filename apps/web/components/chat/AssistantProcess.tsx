"use client";

import { useState } from "react";
import type { MessagePart } from "@pr_hospitalagent/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolCallCard, toolLabel } from "./ToolCallCard";

type Props = {
  /** Các part TRƯỚC câu trả lời cuối: text trung gian + tool, theo đúng thứ tự. */
  parts: MessagePart[];
  /** Tiền tố key ổn định (id message) để React giữ state expanded khi đang stream. */
  idPrefix: string;
};

// Khối "quá trình thực hiện" — mặc định thu gọn còn MỘT dòng trạng thái (kiểu Claude
// web). Mở rộng được bất cứ lúc nào, kể cả khi agent đang chạy: bấm để xem toàn bộ
// text trung gian + các thẻ tool. KHÔNG xoá dữ liệu, chỉ ẩn/hiện.
export function AssistantProcess({ parts, idPrefix }: Props) {
  const [expanded, setExpanded] = useState(false);

  const toolParts = parts.filter(
    (p): p is Extract<MessagePart, { type: "tool" }> => p.type === "tool"
  );
  const toolCount = toolParts.length;
  const working = toolParts.some((p) => p.toolCall.status === "running");
  const runningTool = [...toolParts]
    .reverse()
    .find((p) => p.toolCall.status === "running")?.toolCall;

  // Dòng trạng thái thu gọn: đang chạy → tên tool hiện tại; xong → tổng số bước.
  const summary = working
    ? `Đang ${
        runningTool ? toolLabel(runningTool.name).toLowerCase() : "xử lý"
      }…`
    : `Đã thực hiện ${toolCount} thao tác`;

  return (
    <div className="my-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        {working ? (
          <svg
            className="animate-spin h-3.5 w-3.5 shrink-0 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              opacity="0.25"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg
            className="h-3.5 w-3.5 shrink-0 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 6h16M4 12h16M4 18h10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
        <span className="flex-1 min-w-0 truncate">{summary}</span>
        <svg
          className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {expanded && (
        <div className="mt-1.5 pl-2 border-l-2 border-gray-200">
          {parts.map((part, i) => {
            const key = `${idPrefix}_p${i}`;
            if (part.type === "tool") {
              return <ToolCallCard key={key} toolCall={part.toolCall} />;
            }
            if (!part.text) return null;
            return (
              <div
                key={key}
                className="text-gray-600 break-words leading-relaxed markdown-body text-sm px-1 py-1"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
