"use client";

import type { Message } from "@pr_hospitalagent/types";
import { useAuth } from "@/app/providers/AuthProvider";
import { EmptyGreeting, MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import type { ChatMode } from "@/hooks/useChat";

type Props = {
  messages: Message[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
  chatMode?: ChatMode;
};

export function ChatWindow({
  messages,
  isStreaming,
  onSend,
  isPanelOpen,
  onTogglePanel,
  chatMode = "ai",
}: Props) {
  const { doctor, manager, patient, expert, role } = useAuth();
  const bareName =
    doctor?.fullName ?? manager?.fullName ?? expert?.fullName ?? patient?.name ?? "";
  const isPatientMode = chatMode === "patient";
  return (
    <div className="relative flex-1 min-w-0 flex flex-col h-full bg-[#F8F9F6]">
      {onTogglePanel && !isPanelOpen && (
        <button
          type="button"
          onClick={onTogglePanel}
          aria-label="Mở bảng làm việc"
          className="absolute top-4 right-6 z-10 w-8 h-8 rounded-md border border-gray-200 text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center transition-colors"
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
          {isPatientMode ? (
            <p className="text-sm text-gray-500">
              Chọn một cuộc trò chuyện ở thanh bên để xem nội dung.
            </p>
          ) : (
            <div className="w-full max-w-3xl flex flex-col items-center gap-8">
              <EmptyGreeting role={role} userName={bareName} />
              <div className="w-full">
                <ChatInput
                  onSend={onSend}
                  disabled={isStreaming}
                  role={role}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <MessageList messages={messages} flipped={isPatientMode} />
          <ChatInput
            onSend={onSend}
            disabled={isStreaming}
            role={role}
            placeholder={
              isPatientMode ? "Trả lời bệnh nhân…" : undefined
            }
          />
        </>
      )}
    </div>
  );
}
