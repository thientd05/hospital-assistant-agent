"use client";

import type { Message, MessagePart } from "@pr_hospitalagent/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolCallCard } from "./ToolCallCard";

type Props = {
  message: Message;
  flipped?: boolean;
};

// Loại bỏ tiền tố "**Bác sĩ … (nhắn thay AI)**: " mà server tự gắn — chỉ
// dùng phía bác sĩ để bác sĩ không thấy lại tên mình. DB và phía bệnh nhân
// vẫn giữ nguyên.
const DOCTOR_PREFIX_RE = /^\*\*Bác sĩ .+? \(nhắn thay AI\)\*\*:\s*/;

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

export function MessageBubble({ message, flipped = false }: Props) {
  const isUser = message.role === "user";

  // user-message bên phải bình thường, bên trái khi flipped
  if (isUser) {
    if (flipped) {
      return (
        <div className="flex items-start">
          <div className="bg-[#EFEFEB] text-gray-900 rounded-2xl px-3.5 py-2.5 max-w-[75%] whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start justify-end">
        <div className="bg-[#EFEFEB] text-gray-900 rounded-2xl px-3.5 py-2.5 max-w-[75%] whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  // assistant-message bên trái bình thường, bên phải khi flipped.
  // Render các part theo đúng thứ tự để text↔tool xen kẽ chuẩn.
  const parts = assistantParts(message);
  let textSeen = false;
  const renderPart = (part: MessagePart, key: string) => {
    if (part.type === "tool") {
      return <ToolCallCard key={key} toolCall={part.toolCall} />;
    }
    // Strip tiền tố bác sĩ ở text part đầu tiên khi xem flipped.
    let text = part.text;
    if (flipped && !textSeen) text = text.replace(DOCTOR_PREFIX_RE, "");
    textSeen = true;
    if (!text) return null;
    const className = flipped
      ? "bg-[#EFEFEB] text-gray-900 rounded-2xl px-3.5 py-2.5 break-words markdown-body"
      : "text-gray-900 break-words leading-relaxed markdown-body";
    return (
      <div key={key} className={className}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    );
  };

  if (flipped) {
    return (
      <div className="flex items-start justify-end">
        <div className="max-w-[75%] min-w-0 flex flex-col items-end gap-1.5">
          {parts.map((p, i) => renderPart(p, `${message.id}_${i}`))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start">
      <div className="max-w-[85%] flex-1 min-w-0">
        {parts.map((p, i) => renderPart(p, `${message.id}_${i}`))}
      </div>
    </div>
  );
}
