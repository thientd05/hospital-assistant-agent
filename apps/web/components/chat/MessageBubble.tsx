"use client";

import { memo, useCallback, useState } from "react";
import type { Message, MessagePart } from "@pr_hospitalagent/types";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolCallCard } from "./ToolCallCard";
import { AssistantProcess } from "./AssistantProcess";
import { VizBlock } from "./VizBlock";
import { ExamDashboard, ExamDashboardGate } from "./ExamDashboard";

// Khối ```exam-dashboard``` chứa JSON {patientId, patientName}. Trong lúc stream
// JSON có thể còn dở → parse fail thì trả null (chờ delta sau). Agent chỉ phát data
// nhỏ xíu; UI tự dựng dashboard (ExamDashboard).
function parseExamDashboard(code: string): { patientId: string; patientName?: string } | null {
  try {
    const obj = JSON.parse(code.trim());
    if (obj && typeof obj.patientId === "string" && obj.patientId) return obj;
  } catch {
    /* JSON chưa khép — bỏ qua tới khi đủ */
  }
  return null;
}

// Gom text thô từ một React node (children của <code>) thành chuỗi.
function nodeText(node: unknown): string {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in node) {
    return nodeText((node as { props?: { children?: unknown } }).props?.children);
  }
  return "";
}

// Override <pre>: khối ```svg → render trực quan tăng dần (VizBlock) thay vì code
// thường. react-markdown bọc fenced code trong <pre><code class="language-x">, nên
// ta bắt ở tầng <pre> để không lồng <div> SVG vào trong <pre>. Khối khác giữ
// nguyên. Khi đang stream khối chưa khép, remark vẫn dựng code block tới cuối chuỗi
// → VizBlock nhận `code` lớn dần và vẽ dần từng phần tử (xem VizBlock).
const markdownComponents: Components = {
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children;
    const className =
      child && typeof child === "object" && "props" in child
        ? ((child as { props?: { className?: string } }).props?.className ?? "")
        : "";
    const code = nodeText(
      (child as { props?: { children?: unknown } }).props?.children
    ).replace(/\n$/, "");
    if (/language-exam-dashboard/.test(className)) {
      const data = parseExamDashboard(code);
      return data ? <ExamDashboard patientId={data.patientId} patientName={data.patientName} /> : null;
    }
    if (/language-svg/.test(className)) return <VizBlock code={code} />;
    return <pre>{children}</pre>;
  },
};

// Khối ```exam-dashboard``` (fenced) trong một text part. Dùng để tách phần TRƯỚC +
// dashboard khỏi văn bản phía SAU nó.
const EXAM_FENCE = /```exam-dashboard\s*\n[\s\S]*?\n```/;

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {text}
    </ReactMarkdown>
  );
}

// Render một text part. Nếu chứa khối exam-dashboard: hiện phần trước + dashboard,
// rồi CHẶN văn bản phía sau cho tới khi dashboard báo đã reveal xong (ExamDashboardGate)
// — giữ đúng thứ tự "fake stream": dashboard gen xong mới tới text. Không có dashboard
// thì render thẳng như thường.
function GatedMarkdown({ text }: { text: string }) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const m = text.match(EXAM_FENCE);
  if (!m || m.index === undefined) return <Markdown text={text} />;
  const before = text.slice(0, m.index);
  const fence = m[0];
  const after = text.slice(m.index + fence.length);
  const head = before.trim() ? `${before}\n\n${fence}` : fence;
  return (
    <ExamDashboardGate.Provider value={onReady}>
      <Markdown text={head} />
      {ready && after.trim() ? <Markdown text={after} /> : null}
    </ExamDashboardGate.Provider>
  );
}

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

// Tách part thành phần "quá trình" (đến hết tool cuối cùng) và "câu trả lời cuối"
// (các part sau tool cuối). Không có tool → tất cả là câu trả lời cuối.
function splitParts(parts: MessagePart[]): {
  process: MessagePart[];
  final: MessagePart[];
} {
  let lastToolIdx = -1;
  parts.forEach((p, i) => {
    if (p.type === "tool") lastToolIdx = i;
  });
  if (lastToolIdx === -1) return { process: [], final: parts };
  return {
    process: parts.slice(0, lastToolIdx + 1),
    final: parts.slice(lastToolIdx + 1),
  };
}

function MessageBubbleInner({ message, bubbles = false }: Props) {
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

  // assistant-message bên trái. Tách "quá trình" (mọi part đến hết tool cuối) khỏi
  // "câu trả lời cuối" (các text part sau tool cuối). Quá trình thu gọn còn 1 dòng
  // qua AssistantProcess; câu trả lời cuối hiển thị bình thường. Nếu không có tool
  // nào (Q&A thuần) thì toàn bộ là câu trả lời cuối.
  const parts = assistantParts(message);
  const { process, final } = splitParts(parts);
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
        <GatedMarkdown text={part.text} />
      </div>
    );
  };

  return (
    <div className="flex items-start">
      <div className="max-w-[85%] flex-1 min-w-0">
        {process.length > 0 && (
          <AssistantProcess parts={process} idPrefix={message.id} />
        )}
        {final.map((p, i) => renderPart(p, `${message.id}_f${i}`))}
      </div>
    </div>
  );
}

// Chữ ký phần render được của assistant message (parts + toolCalls). Dùng để memo
// bỏ qua re-render khi nội dung không đổi — tránh re-parse markdown thừa (vd lúc
// revalidate nền trả về data y hệt cache, hay khi component cha re-render).
function renderSig(m: Message): string {
  return JSON.stringify(m.parts ?? m.toolCalls ?? null);
}

// memo theo GIÁ TRỊ (không theo reference) — toMessages() tạo object mới mỗi lần
// fetch, nên so sánh tham chiếu sẽ luôn fail và parse lại markdown vô ích.
export const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  const a = prev.message;
  const b = next.message;
  return (
    prev.bubbles === next.bubbles &&
    a.id === b.id &&
    a.role === b.role &&
    a.content === b.content &&
    renderSig(a) === renderSig(b)
  );
});
