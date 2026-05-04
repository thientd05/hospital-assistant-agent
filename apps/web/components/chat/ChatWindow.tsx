"use client";

import type { Message, ModelKey } from "@pr_hospitalagent/types";
import { useAuth } from "@/app/providers/AuthProvider";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

type Props = {
  messages: Message[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  onOpenWorkspace?: (name: string, result: string) => void;
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
  model: ModelKey;
  onModelChange: (m: ModelKey) => void;
};

export function ChatWindow({
  messages,
  isStreaming,
  onSend,
  onOpenWorkspace,
  isPanelOpen,
  onTogglePanel,
  model,
  onModelChange,
}: Props) {
  const { doctor, manager, patient, expert, role } = useAuth();
  const doctorName = doctor
    ? [doctor.title, doctor.fullName].filter(Boolean).join(" ")
    : manager
    ? [manager.title, manager.fullName].filter(Boolean).join(" ")
    : patient
    ? patient.name
    : expert
    ? [expert.title, expert.fullName].filter(Boolean).join(" ")
    : "Hospital AI";
  const specialty = doctor
    ? doctor.specialty || doctor.department || ""
    : manager
    ? manager.clinicName || ""
    : patient
    ? "Bệnh nhân"
    : expert
    ? expert.expertise || ""
    : "";
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-white">
      <header className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
        <span className="font-semibold text-gray-900">{doctorName}</span>
        {specialty && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {specialty}
          </span>
        )}
        {onTogglePanel && (
          <button
            type="button"
            onClick={onTogglePanel}
            aria-pressed={isPanelOpen}
            aria-label={isPanelOpen ? "Đóng bảng làm việc" : "Mở bảng làm việc"}
            className={`ml-auto w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
              isPanelOpen
                ? "border-purple-500 text-purple-600 bg-purple-50"
                : "border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="15" y1="4" x2="15" y2="20" />
            </svg>
          </button>
        )}
      </header>

      <MessageList messages={messages} role={role} onOpenWorkspace={onOpenWorkspace} />

      <ChatInput
        onSend={onSend}
        disabled={isStreaming}
        model={model}
        onModelChange={onModelChange}
      />
    </div>
  );
}
