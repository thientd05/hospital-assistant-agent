"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@pr_hospitalagent/types";
import { MessageBubble } from "./MessageBubble";
import { AssistantAvatar } from "@/components/AssistantAvatar";

type Props = {
  messages: Message[];
  /** Bố cục tin nhắn trực tiếp 1-1: tin của mình bên phải, đối phương bên trái (đều có bong bóng). */
  bubbles?: boolean;
};

export function MessageList({ messages, bubbles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Chỉ TỰ cuộn xuống cuối khi người dùng đang ở sát đáy. Kéo lên (vd để xem dashboard
  // đang vẽ dần) → ngừng ghim; cuộn lại sát đáy → ghim tiếp.
  const stickRef = useRef(true);

  function onScroll() {
    const el = containerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = dist < 80;
  }

  useEffect(() => {
    if (!stickRef.current) return;
    // Cuộn tức thời (không "smooth") để không tạo animation kéo dài tranh chấp với
    // thao tác cuộn tay của người dùng giữa các delta stream.
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto thin-scrollbar px-6 py-6"
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} bubbles={bubbles} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

const ROLE_LABEL_VI: Record<string, string> = {
  doctor: "bác sĩ",
  manager: "quản lý",
  expert: "chuyên gia",
  patient: "bệnh nhân",
};

export function EmptyGreeting({
  role,
  userName,
}: {
  role?: string | null;
  userName: string;
}) {
  const roleLabel = role ? ROLE_LABEL_VI[role] ?? "" : "";
  return (
    <div className="flex items-center gap-5 text-gray-900">
      <AssistantAvatar size={47} className="shrink-0" />
      <h1 className="text-4xl sm:text-4xl font-medium tracking-tight leading-tight">
        Xin chào {roleLabel} {userName}
      </h1>
    </div>
  );
}
