"use client";

import type { Message } from "@pr_hospitalagent/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolCallCard } from "./ToolCallCard";

type Props = {
  message: Message;
  onOpenWorkspace?: (name: string, result: string) => void;
};

function Avatar({ kind }: { kind: "user" | "assistant" }) {
  const bg =
    kind === "user"
      ? "bg-blue-100 text-blue-800"
      : "bg-purple-100 text-purple-800";
  const label = kind === "user" ? "BS" : "AI";
  return (
    <div
      className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${bg}`}
    >
      {label}
    </div>
  );
}

export function MessageBubble({ message, onOpenWorkspace }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex items-start gap-2 justify-end">
        <div className="bg-gray-100 text-gray-900 rounded-2xl px-3.5 py-2.5 max-w-[75%] whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <Avatar kind="user" />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <Avatar kind="assistant" />
      <div className="max-w-[85%] flex-1 min-w-0">
        {(message.toolCalls ?? []).map((tc) => (
          <ToolCallCard
            key={tc.id}
            toolCall={tc}
            onOpenWorkspace={onOpenWorkspace}
          />
        ))}
        {message.content && (
          <div className="text-gray-900 break-words leading-relaxed markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
