"use client";

import type { ToolCall } from "@pr_hospitalagent/types";

function previewResult(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error) return String(parsed.error);
  } catch {
    // ignore — fall through to raw slice
  }
  return raw.slice(0, 80).replace(/\s+/g, " ");
}

type Props = {
  toolCall: ToolCall;
};

export function ToolCallCard({ toolCall }: Props) {
  const label = toolCall.name;

  return (
    <div
      className="my-1.5 border-l-2 rounded-r-lg pl-3 pr-3 py-2 text-sm"
      style={{
        borderLeftColor: "#7F77DD",
        backgroundColor: "rgba(127, 119, 221, 0.06)",
      }}
    >
      {toolCall.status === "running" && (
        <div className="flex items-center gap-2 text-gray-500">
          <svg
            className="animate-spin h-3.5 w-3.5"
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
          <span>Đang chạy {label}...</span>
        </div>
      )}

      {toolCall.status === "done" && (
        <div className="flex items-start gap-2">
          <svg
            className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
            <path
              d="M8 12.5l2.5 2.5L16 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-800">{label}</div>
            <div className="text-gray-500 text-xs truncate">
              {previewResult(toolCall.result)}
            </div>
          </div>
        </div>
      )}

      {toolCall.status === "error" && (
        <div className="text-red-600">Lỗi khi gọi {label}</div>
      )}
    </div>
  );
}
