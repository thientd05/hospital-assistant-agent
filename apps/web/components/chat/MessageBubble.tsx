"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
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

// Phòng thủ: đôi khi model lỡ bọc khối ```svg (hoặc ```exam-dashboard) trong một
// fence 4-backtick bên ngoài (bắt chước cách boot trình bày ví dụ). Khi đó
// react-markdown coi cả cụm là code-block THƯỜNG (không có info-string) và nội dung
// literal bắt đầu bằng ```svg. Bóc lớp ngoài để vẫn render trực quan thay vì hiện
// code. Khoá đóng `​```` có thể chưa stream tới → vẫn lấy phần thân đang lớn dần.
function unwrapNestedFence(
  code: string
): { lang: "svg" | "exam-dashboard"; inner: string } | null {
  const head = /^```(svg|exam-dashboard)[ \t]*\r?\n/.exec(code.trimStart());
  if (!head) return null;
  const lang = head[1] as "svg" | "exam-dashboard";
  const inner = code
    .trimStart()
    .slice(head[0].length)
    .replace(/\r?\n```[ \t]*$/, "");
  return { lang, inner };
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
    let code = nodeText(
      (child as { props?: { children?: unknown } }).props?.children
    ).replace(/\n$/, "");
    let isDash = /language-exam-dashboard/.test(className);
    let isSvg = /language-svg/.test(className);
    // Code-block thường (không info-string) nhưng thân lại là một fence ```svg lồng
    // → bóc lớp ngoài rồi xử lý như fence đúng.
    if (!isDash && !isSvg && !className) {
      const nested = unwrapNestedFence(code);
      if (nested) {
        code = nested.inner;
        isDash = nested.lang === "exam-dashboard";
        isSvg = nested.lang === "svg";
      }
    }
    if (isDash) {
      const data = parseExamDashboard(code);
      return data ? <ExamDashboard patientId={data.patientId} patientName={data.patientName} /> : null;
    }
    if (isSvg) return <VizBlock code={code} />;
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
  /** Nội dung hiện ngay dưới câu trả lời cuối (assistant) — vd icon chấm sao. */
  footer?: ReactNode;
  /** Thứ tự lượt user (0-based) — cần để sửa & gửi lại; chỉ set ở mode "ai". */
  userTurnIndex?: number;
  /** Sửa & gửi lại tin user thứ `turnIndex` với nội dung mới. */
  onEditUser?: (turnIndex: number, text: string) => void;
  /** Cho phép hiện nút sửa (tắt khi đang stream). */
  canEdit?: boolean;
};

// Bong bóng tin của user (mode "ai"): hover hiện nút bút bên dưới (căn phải); bấm
// → ô sửa; Enter gửi lại (cắt hội thoại từ lượt này về sau rồi sinh lại). Như
// cách các web chat AI phổ biến làm.
function UserBubble({
  message,
  turnIndex,
  onEditUser,
  canEdit,
}: {
  message: Message;
  turnIndex?: number;
  onEditUser?: (turnIndex: number, text: string) => void;
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const editable = canEdit && !!onEditUser && turnIndex !== undefined;

  useEffect(() => {
    if (!editing) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    // Con trỏ về cuối + auto-grow chiều cao.
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [editing]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setEditing(false);
    onEditUser!(turnIndex!, trimmed);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col items-end">
        <div className="w-full max-w-[75%] rounded-2xl border border-gray-300 bg-white px-3.5 py-2.5 focus-within:border-gray-400 transition-colors">
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const ta = e.target;
              ta.style.height = "auto";
              ta.style.height = `${ta.scrollHeight}px`;
            }}
            onKeyDown={handleKey}
            rows={1}
            className="w-full resize-none outline-none bg-transparent text-sm leading-[22px] text-gray-900"
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1 text-sm rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              className="px-3 py-1 text-sm rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Gửi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-end">
      <div className="bg-[#EFEFEB] text-gray-900 rounded-2xl px-3.5 py-2.5 max-w-[75%] whitespace-pre-wrap break-words">
        {message.content}
      </div>
      {editable && (
        <button
          type="button"
          onClick={() => {
            setDraft(message.content);
            setEditing(true);
          }}
          aria-label="Sửa tin nhắn"
          title="Sửa tin nhắn"
          className="mt-1 p-1 rounded-md text-gray-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-gray-100 hover:text-gray-600 transition-opacity"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
      )}
    </div>
  );
}

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

function MessageBubbleInner({
  message,
  bubbles = false,
  footer,
  userTurnIndex,
  onEditUser,
  canEdit,
}: Props) {
  const isUser = message.role === "user";

  // === Mode tin nhắn trực tiếp 1-1: cả hai phía đều là bong bóng văn bản thuần ===
  if (bubbles) {
    if (isUser) {
      return (
        <div className="flex items-start justify-end">
          <div className="bg-[#F4F4F0] text-gray-900 rounded-2xl px-3.5 py-2.5 max-w-[75%] whitespace-pre-wrap break-words">
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

  // user-message bên phải (mode "ai") — hover hiện nút sửa & gửi lại.
  if (isUser) {
    return (
      <UserBubble
        message={message}
        turnIndex={userTurnIndex}
        onEditUser={onEditUser}
        canEdit={canEdit}
      />
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
        {footer}
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
    prev.canEdit === next.canEdit &&
    prev.userTurnIndex === next.userTurnIndex &&
    // null↔non-null footer phải re-render (vd lúc stream xong mới hiện chấm sao);
    // còn khi cùng có footer thì StarRating tự cập nhật qua context (khỏi re-render).
    (prev.footer == null) === (next.footer == null) &&
    a.id === b.id &&
    a.role === b.role &&
    a.content === b.content &&
    renderSig(a) === renderSig(b)
  );
});
