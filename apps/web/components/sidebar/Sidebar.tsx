"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "./ConfirmModal";
import { ConversationItem } from "./ConversationItem";
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
};

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  disabled,
}: Props) {
  const router = useRouter();
  const { doctor, manager, patient, logout } = useAuth();
  const profileName =
    doctor?.fullName ?? manager?.fullName ?? patient?.name ?? "—";
  const profileSubtitle = doctor
    ? doctor.specialty || doctor.department || ""
    : manager
    ? manager.title || manager.clinicName || ""
    : patient
    ? "Bệnh nhân"
    : "";
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

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
      <aside className="w-[220px] shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
        <div className="px-4 py-4">
          <span className="font-semibold text-gray-900">Hospital AI</span>
        </div>

        <div className="px-2">
          <button
            type="button"
            onClick={onNew}
            disabled={disabled}
            className="w-full text-left text-sm px-3 py-2 rounded-md flex items-center gap-2 text-gray-700 hover:bg-white/60 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        <div className="px-4 pt-4 pb-1">
          <span className="text-xs text-gray-400">Các đoạn chat gần đây</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">
              Chưa có hội thoại nào
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
              />
            ))
          )}
        </div>

        <div className="border-t border-gray-200 px-3 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-semibold shrink-0">
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
          <button
            type="button"
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="text-gray-400 hover:text-gray-700 p-1 rounded transition-colors shrink-0"
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
              <path d="M7 4H4v12h3" />
              <path d="M13 14l4-4-4-4" />
              <path d="M17 10H8" />
            </svg>
          </button>
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
    </>
  );
}
