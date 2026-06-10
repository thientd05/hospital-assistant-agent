"use client";

import { useState, type ReactNode } from "react";
import type { Message } from "@pr_hospitalagent/types";
import { useAuth } from "@/app/providers/AuthProvider";
import { EmptyGreeting, MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { GreetingSuggestions } from "./GreetingSuggestions";
import type { ChatMode } from "@/hooks/useChat";

type Props = {
  messages: Message[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
  chatMode?: ChatMode;
  /** Mode "patient": đã chọn 1 đối phương trong sidebar hay chưa. */
  hasSelection?: boolean;
  /** Có lịch hẹn mới chưa xem → chấm trên nút mở bảng làm việc. */
  panelHasAlert?: boolean;
  /** Mobile (< lg): mở sidebar full-screen. */
  onOpenSidebar?: () => void;
  /** Hiện list nút gợi ý dưới lời chào (bệnh nhân vừa vào app). */
  showSuggestions?: boolean;
  /** Footer dưới mỗi câu trả lời AI (vd chấm sao) — chỉ mode "ai". */
  renderMessageFooter?: (message: Message, turnIndex: number) => ReactNode;
  /** id lời chào fake-stream (loại khỏi đếm turnIndex chấm sao). */
  greetingId?: string | null;
  /** Sửa & gửi lại lượt user thứ `turnIndex` (chỉ mode "ai"). */
  onEditMessage?: (turnIndex: number, text: string) => void;
};

export function ChatWindow({
  messages,
  isStreaming,
  onSend,
  isPanelOpen,
  onTogglePanel,
  chatMode = "ai",
  hasSelection = false,
  panelHasAlert = false,
  onOpenSidebar,
  showSuggestions = false,
  renderMessageFooter,
  greetingId,
  onEditMessage,
}: Props) {
  // Tăng để yêu cầu ChatInput focus (bấm "Câu hỏi khác").
  const [focusSignal, setFocusSignal] = useState(0);
  const handlePickSuggestion = (message: string | null) => {
    if (message === null) setFocusSignal((v) => v + 1);
    else onSend(message);
  };
  const { doctor, manager, patient, expert, role } = useAuth();
  const bareName =
    doctor?.fullName ?? manager?.fullName ?? expert?.fullName ?? patient?.name ?? "";
  const isPatientMode = chatMode === "patient";
  // Đối phương trong mode tin nhắn: bác sĩ ↔ bệnh nhân, bệnh nhân ↔ bác sĩ.
  const isDoctorViewer = !!doctor;
  const directCap = isDoctorViewer ? "Bệnh Nhân" : "Bác Sĩ";
  const directLower = isDoctorViewer ? "bệnh nhân" : "bác sĩ";
  const panelIcon = (
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
  );

  return (
    <div className="relative flex-1 min-w-0 flex flex-col h-full bg-white">
      {/* Mobile-only top bar: hamburger (mở sidebar) + tiêu đề + mở panel */}
      <div className="lg:hidden flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 shrink-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Mở danh sách hội thoại"
          className="w-9 h-9 -ml-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center transition-colors"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-700 truncate">
          {isPatientMode ? directCap : "Trợ Lý Ảo"}
        </span>
        {onTogglePanel && !isPanelOpen ? (
          <button
            type="button"
            onClick={onTogglePanel}
            aria-label="Mở bảng làm việc"
            className="relative w-9 h-9 -mr-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center transition-colors"
          >
            {panelIcon}
            {panelHasAlert && (
              <span
                aria-hidden
                className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white"
              />
            )}
          </button>
        ) : (
          <span className="w-9" />
        )}
      </div>

      {onTogglePanel && !isPanelOpen && (
        <button
          type="button"
          onClick={onTogglePanel}
          aria-label="Mở bảng làm việc"
          className="hidden lg:flex absolute top-4 right-6 z-10 w-8 h-8 rounded-md border border-gray-200 text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-700 items-center justify-center transition-colors"
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
          {panelHasAlert && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white"
            />
          )}
        </button>
      )}

      {isPatientMode ? (
        !hasSelection ? (
          // Chưa chọn đối phương → nhắc chọn ở sidebar.
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <p className="text-sm text-gray-500">
              Chọn một {directLower} ở thanh bên để nhắn tin.
            </p>
          </div>
        ) : (
          // Đã chọn → hiển thị hội thoại (có thể rỗng) + ô nhập để chủ động nhắn.
          <>
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center px-6">
                <p className="text-sm text-gray-400">
                  Chưa có tin nhắn nào. Hãy gửi lời nhắn đầu tiên.
                </p>
              </div>
            ) : (
              <MessageList messages={messages} bubbles />
            )}
            <ChatInput
              onSend={onSend}
              disabled={isStreaming}
              role={role}
              placeholder={`Nhắn cho ${directLower}…`}
            />
          </>
        )
      ) : messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-3xl flex flex-col items-center gap-8">
            <EmptyGreeting role={role} userName={bareName} />
            <div className="w-full">
              <ChatInput onSend={onSend} disabled={isStreaming} role={role} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <MessageList
            messages={messages}
            renderMessageFooter={renderMessageFooter}
            greetingId={greetingId}
            onEditUser={onEditMessage}
            canEditUser={!isStreaming}
            footer={
              showSuggestions ? (
                <GreetingSuggestions
                  onPick={handlePickSuggestion}
                  disabled={isStreaming}
                />
              ) : undefined
            }
          />
          <ChatInput
            onSend={onSend}
            disabled={isStreaming}
            role={role}
            focusSignal={focusSignal}
          />
        </>
      )}
    </div>
  );
}
