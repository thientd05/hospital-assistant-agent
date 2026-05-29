"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AssistantAvatar } from "@/components/AssistantAvatar";
import { useAuth } from "@/app/providers/AuthProvider";
import { SettingsModal } from "@/components/sidebar/SettingsModal";

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

export type AdminNavItem = {
  key: string;
  label: string;
  icon?: ReactNode;
};

type Props = {
  title: string;
  items: AdminNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
};

const EXPANDED_WIDTH = 288;
const COLLAPSED_WIDTH = 52;

export function AdminSidebar({ title, items, activeKey, onSelect }: Props) {
  const router = useRouter();
  const { manager, expert, logout } = useAuth();
  const profileName = manager?.fullName ?? expert?.fullName ?? "—";
  const profileSubtitle = manager
    ? manager.title || manager.clinicName || ""
    : expert
    ? expert.title || expert.expertise || "Chuyên gia"
    : "";

  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <>
      <aside
        className="relative shrink-0 border-r border-gray-200 bg-white overflow-hidden transition-[width] duration-300 ease-in-out h-full"
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      >
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
        </div>

        <div
          className={`flex flex-col h-full transition-opacity duration-200 ${
            collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          style={{ width: EXPANDED_WIDTH }}
        >
          <div className="flex items-center justify-between px-4 py-[14px]">
            <span className="flex items-center gap-2 font-semibold text-gray-900">
              <AssistantAvatar size={24} className="shrink-0" />
              {title}
            </span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Thu gọn sidebar"
              aria-label="Thu gọn sidebar"
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="16" height="16" rx="2" />
                <path d="M7 2v16" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto thin-scrollbar px-2 pt-2 pb-1 space-y-0.5">
            {items.map((item) => {
              const isActive = item.key === activeKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect(item.key)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-md flex items-center gap-2 transition-colors ${
                    isActive
                      ? "bg-[#C8E7E9] text-[#066671] font-medium"
                      : "text-gray-700 hover:bg-[#EFEFEB] hover:text-gray-900"
                  }`}
                >
                  {item.icon && (
                    <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 px-3 py-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Mở cài đặt"
              aria-label="Mở cài đặt"
              className="flex items-center gap-3 flex-1 min-w-0 -mx-1 px-1 py-1 rounded-md hover:bg-white/70 transition-colors text-left"
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
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="text-gray-400 hover:text-gray-700 p-1 rounded transition-colors shrink-0"
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4H4v12h3" />
                <path d="M13 14l4-4-4-4" />
                <path d="M17 10H8" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
