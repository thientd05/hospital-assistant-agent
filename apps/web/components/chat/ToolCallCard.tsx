"use client";

import type { ToolCall } from "@pr_hospitalagent/types";

const TOOL_LABELS: Record<string, string> = {
  get_patient_record: "Hồ sơ bệnh nhân",
  create_patient: "Tạo bệnh nhân",
  update_patient: "Cập nhật bệnh nhân",
  get_lab_results: "Kết quả xét nghiệm",
  check_drug_interaction: "Kiểm tra tương tác thuốc",
  get_appointments: "Lịch hẹn",
  get_customer_stats: "Thống kê khách hàng",
  read_skill: "Đọc skill",
};

const SKILL_LABELS: Record<string, string> = {
  "patient-intake": "quy trình tiếp nhận bệnh nhân",
  "lab-result-entry": "quy trình nhập kết quả xét nghiệm",
  "write-user-md": "quy trình cập nhật hồ sơ người dùng",
  "write-soul-md": "quy trình cập nhật phong cách làm việc",
  "create-skill": "quy trình tạo skill mới",
};

function readSkillSlug(toolCall: ToolCall): string | null {
  const fromInput = toolCall.input?.name;
  if (typeof fromInput === "string" && fromInput) return fromInput;
  if (toolCall.result) {
    try {
      const parsed = JSON.parse(toolCall.result);
      if (typeof parsed?.skill === "string") return parsed.skill;
    } catch {
      // ignore
    }
  }
  return null;
}

function toolLabel(toolCall: ToolCall): string {
  if (toolCall.name === "read_skill") {
    const slug = readSkillSlug(toolCall);
    const skillLabel = slug ? SKILL_LABELS[slug] : null;
    if (skillLabel) return `Đọc ${skillLabel}`;
  }
  return TOOL_LABELS[toolCall.name] ?? toolCall.name;
}

const OPENABLE_TOOLS = new Set([
  "get_patient_record",
  "create_patient",
  "update_patient",
  "get_lab_results",
  "get_appointments",
  "get_customer_stats",
]);

const EXPERT_OPENABLE_TOOLS = new Set(["read_skill"]);

function previewResult(name: string, raw: string | undefined): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error) return String(parsed.error);
    if (
      (name === "get_patient_record" ||
        name === "create_patient" ||
        name === "update_patient") &&
      parsed?.name
    ) {
      return `${parsed.name} — ${parsed.ward ?? ""}`.trim();
    }
    if (name === "get_lab_results" && Array.isArray(parsed?.labResults)) {
      return `${parsed.labResults.length} kết quả`;
    }
    if (name === "get_appointments" && Array.isArray(parsed)) {
      return `${parsed.length} cuộc hẹn`;
    }
    if (
      name === "get_customer_stats" &&
      parsed?.patients?.total !== undefined
    ) {
      return `${parsed.patients.total} BN · ${parsed.appointments?.total ?? 0} cuộc hẹn`;
    }
    if (name === "read_skill" && parsed?.skill) {
      return parsed.skill as string;
    }
    return raw.slice(0, 80).replace(/\s+/g, " ");
  } catch {
    return raw.slice(0, 80);
  }
}

type Props = {
  toolCall: ToolCall;
  role?: string | null;
  onOpenWorkspace?: (name: string, result: string) => void;
};

export function ToolCallCard({ toolCall, role, onOpenWorkspace }: Props) {
  const label = toolLabel(toolCall);
  const canOpen =
    toolCall.status === "done" &&
    !!toolCall.result &&
    (OPENABLE_TOOLS.has(toolCall.name) ||
      (role === "expert" && EXPERT_OPENABLE_TOOLS.has(toolCall.name)));

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
          <span>Đang tra cứu {label.toLowerCase()}...</span>
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
              {previewResult(toolCall.name, toolCall.result)}
            </div>
            {canOpen && onOpenWorkspace && toolCall.result && (
              <button
                type="button"
                onClick={() =>
                  onOpenWorkspace(toolCall.name, toolCall.result as string)
                }
                className="mt-1 text-xs text-purple-700 underline cursor-pointer hover:text-purple-900"
              >
                Xem chi tiết →
              </button>
            )}
          </div>
        </div>
      )}

      {toolCall.status === "error" && (
        <div className="text-red-600">Lỗi khi gọi {label}</div>
      )}
    </div>
  );
}
