"use client";

import type { Message, MessagePart } from "@pr_hospitalagent/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolCallCard } from "./ToolCallCard";

type Props = {
  message: Message;
  /** Bố cục tin nhắn trực tiếp 1-1: tin của mình ("user") phải, đối phương ("assistant") trái — đều bong bóng. */
  bubbles?: boolean;
};

// Suy ra danh sách part có thứ tự cho assistant message. Ưu tiên `parts`
// (giữ xen kẽ text↔tool đúng thứ tự); nếu thiếu (dữ liệu cũ) thì dựng lại từ
// content/toolCalls theo hành vi cũ (tool trước, text sau) làm fallback.
function assistantParts(message: Message): MessagePart[] {
  if (message.parts && message.parts.length > 0) return message.parts;
  const parts: MessagePart[] = [];
  for (const tc of message.toolCalls ?? []) {
    parts.push({ type: "tool", toolCall: tc });
  }
  if (message.content) parts.push({ type: "text", text: message.content });
  return parts;
}

export function MessageBubble({ message, bubbles = false }: Props) {
  const isUser = message.role === "user";

  // === Mode tin nhắn trực tiếp 1-1: cả hai phía đều là bong bóng văn bản thuần ===
  if (bubbles) {
    if (isUser) {
      return (
        <div className="flex items-start justify-end">
          <div className="bg-[#EFEFEB] text-gray-900 rounded-2xl px-3.5 py-2.5 max-w-[75%] whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start">
        <div className="bg-brand-50 text-gray-900 rounded-2xl px-3.5 py-2.5 max-w-[75%] whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  // user-message bên phải
  if (isUser) {
    return (
      <div className="flex items-start justify-end">
        <div className="bg-[#EFEFEB] text-gray-900 rounded-2xl px-3.5 py-2.5 max-w-[75%] whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  // assistant-message bên trái. Render các part theo đúng thứ tự để text↔tool xen kẽ chuẩn.
  const parts = assistantParts(message);
  const renderPart = (part: MessagePart, key: string) => {
    if (part.type === "tool") {
      return <ToolCallCard key={key} toolCall={part.toolCall} />;
    }
    if (!part.text) return null;
    return (
      <div
        key={key}
        className="text-gray-900 break-words leading-relaxed markdown-body"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="flex items-start">
      <div className="max-w-[85%] flex-1 min-w-0">
        {parts.map((p, i) => renderPart(p, `${message.id}_${i}`))}
      </div>
    </div>
  );
}
