"use client";

import type { Message, ModelKey } from "@pr_hospitalagent/types";
import { useAuth } from "@/app/providers/AuthProvider";
import { EmptyGreeting, MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

type Props = {
  messages: Message[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
  model: ModelKey;
  onModelChange: (m: ModelKey) => void;
};

export function ChatWindow({
  messages,
  isStreaming,
  onSend,
  isPanelOpen,
  onTogglePanel,
  model,
  onModelChange,
}: Props) {
  const { doctor, manager, patient, expert, role } = useAuth();
  const bareName =
    doctor?.fullName ?? manager?.fullName ?? expert?.fullName ?? patient?.name ?? "";
  return (
    <div className="relative flex-1 min-w-0 flex flex-col h-full bg-white">
      {onTogglePanel && (
        <button
          type="button"
          onClick={onTogglePanel}
          aria-pressed={isPanelOpen}
          aria-label={isPanelOpen ? "Đóng bảng làm việc" : "Mở bảng làm việc"}
          className={`absolute top-4 right-6 z-10 w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
            isPanelOpen
              ? "border-purple-500 text-purple-600 bg-purple-50"
              : "border-gray-200 text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-700"
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

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-3xl flex flex-col items-center gap-8">
            <EmptyGreeting role={role} userName={bareName} />
            <div className="w-full">
              <ChatInput
                onSend={onSend}
                disabled={isStreaming}
                model={model}
                onModelChange={onModelChange}
                role={role}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <MessageList messages={messages} />
          <ChatInput
            onSend={onSend}
            disabled={isStreaming}
            model={model}
            onModelChange={onModelChange}
            role={role}
          />
        </>
      )}
    </div>
  );
}
