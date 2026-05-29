"use client";

import { useState } from "react";
import { ConfirmModal } from "./ConfirmModal";
import { AssistantAvatar } from "@/components/AssistantAvatar";
import { ConversationItem } from "./ConversationItem";
import { SettingsModal } from "./SettingsModal";
import type { ConversationListItem } from "@/hooks/useConversations";
import { useAuth } from "@/app/providers/AuthProvider";

function initials(fullName: string): string {
  let s = fullName.trim();
  while (/^[A-Za-z]+\.\s*/.test(s)) {
    s = s.replace(/^[A-Za-z]+\.\s*/, "");
  }
  const parts = s.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (
    parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
  ).toUpperCase();
}

type Props = {
  conversations: ConversationListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void>;
  disabled?: boolean;
  mode?: "ai" | "patient";
  onModeChange?: (mode: "ai" | "patient") => void;
};

const EXPANDED_WIDTH = 288;
const COLLAPSED_WIDTH = 52;

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  disabled,
  mode = "ai",
  onModeChange,
}: Props) {
  const isPatientMode = mode === "patient";
  const { doctor, patient } = useAuth();
  const profileName = doctor?.fullName ?? patient?.name ?? "—";
  const profileSubtitle = doctor
    ? doctor.specialty || doctor.department || ""
    : patient
    ? "Bệnh nhân"
    : "";
  const [collapsed, setCollapsed] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pendingTitle =
    conversations.find((c) => c.id === pendingDeleteId)?.title ?? "";

  const handleConfirm = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await onDelete(pendingDeleteId);
      setPendingDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <aside
        className="relative shrink-0 border-r border-gray-200 bg-white overflow-hidden transition-[width] duration-300 ease-in-out h-full"
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      >
        {/* Collapsed overlay — toggle + new chat, shown only when collapsed */}
        <div
          className={`absolute inset-0 flex flex-col items-center pt-3 gap-2 z-10 transition-opacity duration-200 ${
            collapsed ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Mở rộng sidebar"
            aria-label="Mở rộng sidebar"
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="16" height="16" rx="2" />
              <path d="M7 2v16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onNew}
            disabled={disabled}
            title="Cuộc trò chuyện mới"
            aria-label="Cuộc trò chuyện mới"
            className="p-2 rounded-md text-gray-500 hover:bg-[#EFEFEB] hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4v12" />
              <path d="M4 10h12" />
            </svg>
          </button>
        </div>

        {/* Inner container fixed at expanded width so children never reflow */}
        <div
          className={`flex flex-col h-full transition-opacity duration-200 ${
            collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          style={{ width: EXPANDED_WIDTH }}
        >

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-[10px]">
            {onModeChange ? (
              <button
                type="button"
                onClick={() =>
                  onModeChange(mode === "ai" ? "patient" : "ai")
                }
                disabled={disabled}
                aria-pressed={isPatientMode}
                aria-label={
                  isPatientMode
                    ? "Chuyển sang chat với AI"
                    : "Chuyển sang chat với bệnh nhân"
                }
                className="flex items-center gap-2 font-semibold text-gray-900 rounded-md -mx-2 px-2 py-1 hover:bg-[#EFEFEB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
              >
                <AssistantAvatar size={24} className="shrink-0" />
                {isPatientMode ? "Bệnh Nhân" : "Trợ Lý Ảo"}
                <svg
                  viewBox="0 0 20 20"
                  className="w-3.5 h-3.5 text-gray-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 8l5 5 5-5" />
                </svg>
              </button>
            ) : (
              <span className="flex items-center gap-2 font-semibold text-gray-900 py-1">
                <AssistantAvatar size={24} className="shrink-0" />
                AI Gia Đình
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Thu gọn sidebar"
              aria-label="Thu gọn sidebar"
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
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
                <rect x="2" y="2" width="16" height="16" rx="2" />
                <path d="M7 2v16" />
              </svg>
            </button>
          </div>

          {/* New chat (chỉ ở AI mode) */}
          {!isPatientMode && (
            <div className="px-2">
              <button
                type="button"
                onClick={onNew}
                disabled={disabled}
                className="w-full text-left text-sm px-3 py-2 rounded-md flex items-center gap-2 text-gray-700 hover:bg-[#EFEFEB] hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 4v12" />
                  <path d="M4 10h12" />
                </svg>
                New chat
              </button>
            </div>
          )}

          {/* Conversations */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 pt-4 pb-1">
              <span className="text-xs text-gray-400">
                {isPatientMode
                  ? "Hội thoại bệnh nhân"
                  : "Các đoạn chat gần đây"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto thin-scrollbar px-2 py-1 space-y-0.5">
              {conversations.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2">
                  {isPatientMode
                    ? "Chưa có hội thoại bệnh nhân nào"
                    : "Chưa có hội thoại nào"}
                </p>
              ) : (
                conversations.map((c) => (
                  <ConversationItem
                    key={c.id}
                    id={c.id}
                    title={c.title}
                    isActive={c.id === activeId}
                    menuOpen={openMenuId === c.id}
                    onClick={() => onSelect(c.id)}
                    onToggleMenu={() =>
                      setOpenMenuId(openMenuId === c.id ? null : c.id)
                    }
                    onCloseMenu={() => setOpenMenuId(null)}
                    onRequestDelete={() => {
                      setOpenMenuId(null);
                      setPendingDeleteId(c.id);
                    }}
                    hideMenu={isPatientMode}
                  />
                ))
              )}
            </div>
          </div>

          {/* Profile */}
          <div className="border-t border-gray-200 px-3 py-3">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Mở cài đặt"
              aria-label="Mở cài đặt"
              className="flex items-center gap-3 w-full min-w-0 -mx-1 px-1 py-1 rounded-md hover:bg-gray-100 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-[#C8E7E9] text-[#087E8B] flex items-center justify-center text-xs font-semibold shrink-0">
                {profileName !== "—" ? initials(profileName) : "?"}
              </div>
              <div className="flex flex-col leading-tight flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {profileName}
                </span>
                <span className="text-xs text-gray-500 truncate">
                  {profileSubtitle}
                </span>
              </div>
            </button>
          </div>

        </div>
      </aside>

      <ConfirmModal
        open={pendingDeleteId !== null}
        title="Xóa hội thoại?"
        message={`Hội thoại "${pendingTitle}" sẽ bị xóa vĩnh viễn. Bạn có chắc chắn không?`}
        busy={deleting}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={handleConfirm}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
