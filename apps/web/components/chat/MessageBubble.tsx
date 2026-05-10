"use client";

import type { Message } from "@pr_hospitalagent/types";
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

export function MessageBubble({ message, flipped = false }: Props) {
  const isUser = message.role === "user";
  const displayContent =
    flipped && !isUser
      ? message.content.replace(DOCTOR_PREFIX_RE, "")
      : message.content;

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

  // assistant-message bên trái bình thường, bên phải khi flipped
  if (flipped) {
    return (
      <div className="flex items-start justify-end">
        <div className="max-w-[75%] min-w-0 flex flex-col items-end gap-1.5">
          {(message.toolCalls ?? []).map((tc) => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}
          {displayContent && (
            <div className="bg-[#EFEFEB] text-gray-900 rounded-2xl px-3.5 py-2.5 break-words markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start">
      <div className="max-w-[85%] flex-1 min-w-0">
        {(message.toolCalls ?? []).map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
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
