"use client";

import { useState } from "react";
import type { ToolCall } from "@pr_hospitalagent/types";

// Tên tool hiển thị bằng tiếng Việt
const TOOL_LABELS: Record<string, string> = {
  read_skills: "Đọc kỹ năng",
  read_panel: "Đọc cửa sổ làm việc",
  act: "Thao tác",
  read_service_prices: "Xem giá dịch vụ khám",
};

// Tên kỹ năng bằng tiếng Việt — hiển thị dưới tên tool
const SKILL_LABELS: Record<string, string> = {
  "edit-lab-results": "Sửa kết quả xét nghiệm",
  "edit-vitals": "Sửa sinh hiệu",
  "edit-diagnoses": "Sửa chẩn đoán",
  "prescribe-medications": "Chọn thuốc & chỉ định dùng",
  "assign-ward": "Phân khoa",
  "collect-patient-info": "Thu thập thông tin bệnh nhân",
  "book-appointment": "Đặt lịch khám",
};

// Nhãn tiếng Việt của tool (fallback về tên thô) — dùng chung cho dòng trạng thái thu gọn.
export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name;
}

// Dòng phụ dưới tên tool (chỉ read_skills hiển thị tên (các) kỹ năng; còn lại để trống)
function subtitleFor(toolCall: ToolCall): string {
  if (toolCall.name === "read_skills") {
    const names = toolCall.input?.names;
    if (Array.isArray(names)) {
      return names
        .filter((n): n is string => typeof n === "string")
        .map((n) => SKILL_LABELS[n] ?? n)
        .join(", ");
    }
  }
  return "";
}

function prettyResult(raw: string | undefined): string {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

type Props = {
  toolCall: ToolCall;
};

export function ToolCallCard({ toolCall }: Props) {
  const label = TOOL_LABELS[toolCall.name] ?? toolCall.name;
  const subtitle = subtitleFor(toolCall);
  const [expanded, setExpanded] = useState(false);
  const hasInput = Object.keys(toolCall.input ?? {}).length > 0;
  const canExpand =
    toolCall.status === "done" || toolCall.status === "error";

  return (
    <div
      className="my-1.5 border-l-2 rounded-r-lg pl-3 pr-3 py-2 text-sm"
      style={{
        borderLeftColor: "#087E8B",
        backgroundColor: "rgba(8, 126, 139, 0.08)",
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
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-start gap-2 w-full text-left"
        >
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
            {!expanded && subtitle && (
              <div className="text-gray-500 text-xs truncate">{subtitle}</div>
            )}
          </div>
          <Chevron expanded={expanded} />
        </button>
      )}

      {toolCall.status === "error" && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 w-full text-left text-red-600"
        >
          <span className="flex-1">Lỗi khi gọi {label}</span>
          <Chevron expanded={expanded} />
        </button>
      )}

      {canExpand && expanded && (
        <div className="mt-2 space-y-2">
          {hasInput && (
            <DebugBlock
              title="Tham số"
              content={JSON.stringify(toolCall.input, null, 2)}
            />
          )}
          {toolCall.result && (
            <DebugBlock
              title="Kết quả"
              content={prettyResult(toolCall.result)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-gray-400 mt-0.5 shrink-0 transition-transform ${
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
  );
}

function DebugBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-0.5">
        {title}
      </div>
      <pre className="text-[11px] leading-snug whitespace-pre-wrap break-all max-h-72 overflow-auto bg-gray-900/90 text-gray-100 rounded-md px-2.5 py-2">
        {content}
      </pre>
    </div>
  );
}
