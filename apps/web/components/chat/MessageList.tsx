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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto thin-scrollbar px-6 py-6">
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
