"use client";

import { useState } from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { formatDate } from "@/lib/format";
import {
  useConversationAuditDetail,
  useConversationAuditList,
  type ConversationOwnerRole,
} from "@/hooks/useConversationAudit";

type Props = {
  version: number;
  active: boolean;
};

type Mode = "list" | "view";

const ROLE_BADGE: Record<
  ConversationOwnerRole,
  { label: string; className: string }
> = {
  doctor: { label: "Bác sĩ", className: "bg-[#C8E7E9] text-[#066671]" },
  patient: { label: "Bệnh nhân", className: "bg-amber-100 text-amber-700" },
  unknown: { label: "Khác", className: "bg-gray-100 text-gray-500" },
};

function RoleBadge({ role }: { role: ConversationOwnerRole }) {
  const b = ROLE_BADGE[role];
  return (
    <span
      className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded font-medium ${b.className}`}
    >
      {b.label}
    </span>
  );
}

export function ConversationAuditTab({ version, active }: Props) {
  const list = useConversationAuditList(version, active);
  const [mode, setMode] = useState<Mode>("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const q = filter.trim().toLowerCase();
  const filtered = (list.data?.conversations ?? []).filter((c) =>
    !q
      ? true
      : (c.ownerId ?? "").toLowerCase().includes(q) ||
        (c.ownerName ?? "").toLowerCase().includes(q)
  );
  const detail = useConversationAuditDetail(
    selected,
    version,
    active && Boolean(selected) && mode === "view"
  );

  function open(id: string) {
    setSelected(id);
    setMode("view");
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {mode === "list"
            ? "Hội thoại chatbot"
            : detail.data?.title ?? "Chi tiết hội thoại"}
        </div>
        {mode !== "list" && (
          <button
            type="button"
            onClick={() => {
              setMode("list");
              setSelected(null);
            }}
            className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            ← Danh sách
          </button>
        )}
      </div>

      {mode === "list" && (
        <>
          <p className="text-xs text-gray-500 leading-relaxed">
            Xem lại các cuộc trò chuyện giữa AI với bác sĩ và bệnh nhân để đánh
            giá chất lượng trả lời (chỉ đọc).
          </p>
          <div className="relative">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Lọc theo mã bệnh nhân/bác sĩ (BN001, BS002…) hoặc tên"
              className="w-full text-sm border border-gray-200 rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#087E8B]"
            />
            {filter && (
              <button
                type="button"
                onClick={() => setFilter("")}
                aria-label="Xoá bộ lọc"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm leading-none"
              >
                ✕
              </button>
            )}
          </div>
          {list.loading && (
            <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
          )}
          {list.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {list.error}
            </div>
          )}
          {list.data && (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
              {list.data.conversations.length === 0 && (
                <li className="px-3 py-3 text-sm text-gray-500">
                  Chưa có hội thoại nào.
                </li>
              )}
              {list.data.conversations.length > 0 && filtered.length === 0 && (
                <li className="px-3 py-3 text-sm text-gray-500">
                  Không có hội thoại khớp “{filter.trim()}”.
                </li>
              )}
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => open(c.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <RoleBadge role={c.ownerRole} />
                      <span className="text-sm text-gray-900 font-medium truncate flex-1 min-w-0">
                        {c.title}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500 truncate">
                      {c.ownerName ?? c.ownerId ?? "—"} · {formatDate(c.updatedAt)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {mode === "view" && (
        <>
          {detail.loading && (
            <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
          )}
          {detail.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {detail.error}
            </div>
          )}
          {detail.data && (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-500 border-b border-gray-100 pb-2">
                <RoleBadge role={detail.data.ownerRole} />
                <span className="truncate">
                  {detail.data.ownerName ?? detail.data.ownerId ?? "—"}
                </span>
                <span className="ml-auto shrink-0">
                  {formatDate(detail.data.updatedAt)}
                </span>
              </div>
              <div className="flex flex-col gap-5 py-2">
                {detail.data.messages.length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-4">
                    Hội thoại trống.
                  </div>
                )}
                {detail.data.messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
