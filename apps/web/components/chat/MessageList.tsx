"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@pr_hospitalagent/types";
import { MessageBubble } from "./MessageBubble";

type Props = {
  messages: Message[];
  role?: string | null;
  onOpenWorkspace?: (name: string, result: string) => void;
};

export function MessageList({ messages, role, onOpenWorkspace }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Bắt đầu hỏi để được hỗ trợ tra cứu bệnh nhân, kết quả xét nghiệm hoặc
        tương tác thuốc.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            role={role}
            onOpenWorkspace={onOpenWorkspace}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
