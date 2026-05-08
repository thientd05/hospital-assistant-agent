"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { Message } from "@pr_hospitalagent/types";
import { MessageBubble } from "./MessageBubble";
import claudeAvt from "@/public/claude_avt.png";

type Props = {
  messages: Message[];
  flipped?: boolean;
};

export function MessageList({ messages, flipped }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} flipped={flipped} />
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
      <Image
        src={claudeAvt}
        alt="Hospital AI"
        width={35}
        height={35}
        className="shrink-0"
        priority
      />
      <h1 className="text-4xl sm:text-4xl font-medium tracking-tight leading-tight">
        Xin chào {roleLabel} {userName}
      </h1>
    </div>
  );
}
