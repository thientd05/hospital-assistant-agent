"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Message,
  MessagePart,
  ToolCall,
  ToolRefresh,
} from "@pr_hospitalagent/types";
import { readSSEStream } from "@/lib/stream";
import { AGENT_URL, API_URL } from "@/lib/api";
import { authFetch } from "@/lib/tokenStore";
import { useAuth } from "@/app/providers/AuthProvider";
import { dedupedFetch, getCached, setCached } from "@/lib/resourceCache";

// Nội dung hội thoại lưu cache ở dạng "thô" (createdAt là chuỗi ISO) để serialize
// được vào sessionStorage; chuyển về Date khi đọc ra.
type RawMessage = Omit<Message, "createdAt"> & { createdAt: string };
type RawConversation = { id: string; messages: RawMessage[] };

// Tin nhắn trực tiếp lưu dạng { sender, content, createdAt } — KHÁC hội thoại AI.
type DirectRole = "doctor" | "patient";
type RawDirectMessage = {
  sender: DirectRole;
  content: string;
  createdAt: string;
};
type RawDirect = { messages: RawDirectMessage[] };

// Hội thoại AI (mode "ai") theo conversationId.
function aiPath(id: string): string {
  return `/api/conversations/${id}`;
}

// Thread tin nhắn trực tiếp (mode "patient") theo id đối phương; route phụ vai trò.
function directPath(role: DirectRole, counterpartId: string): string {
  const base =
    role === "doctor" ? "/api/direct-messages" : "/api/me/direct-messages";
  return `${base}/${counterpartId}`;
}

function toMessages(raw: RawConversation): Message[] {
  return raw.messages.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }));
}

function toRaw(id: string, messages: Message[]): RawConversation {
  return {
    id,
    messages: messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

// Tin của chính mình (sender === role) → bubble phải ("user"); đối phương → trái.
function directToMessages(raw: RawDirect, role: DirectRole): Message[] {
  return raw.messages.map((m, i) => ({
    id: `dm_${i}`,
    role: m.sender === role ? "user" : "assistant",
    content: m.content,
    createdAt: new Date(m.createdAt),
  }));
}

function toRawDirect(messages: Message[], role: DirectRole): RawDirect {
  const other: DirectRole = role === "doctor" ? "patient" : "doctor";
  return {
    messages: messages.map((m) => ({
      sender: m.role === "user" ? role : other,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

type SSEEvent =
  | { type: "text"; content: string }
  | {
      type: "tool_call";
      id: string;
      name: string;
      input: Record<string, unknown>;
      status: "running" | "done";
      result?: string;
      refresh?: ToolRefresh;
    }
  | {
      type: "tool_command";
      commandId: string;
      command: string;
      args: unknown;
    }
  | { type: "done"; conversationId: string }
  | { type: "error"; message: string };

function newId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Nối thêm text vào danh sách part, gộp vào text part cuối nếu có (giữ thứ tự
// xen kẽ thật: text trước tool trong cùng turn, và xen kẽ giữa các turn).
function appendTextPart(
  parts: MessagePart[] | undefined,
  text: string
): MessagePart[] {
  const next = [...(parts ?? [])];
  const last = next[next.length - 1];
  if (last && last.type === "text") {
    next[next.length - 1] = { type: "text", text: last.text + text };
  } else {
    next.push({ type: "text", text });
  }
  return next;
}

export type ChatMode = "ai" | "patient";

// Cắt danh sách tin về TRƯỚC lượt user thứ `turn` (0-based, đếm role==="user").
// Khớp cách agent cắt lịch sử khi sửa & gửi lại.
function truncateBeforeUserTurn(messages: Message[], turn: number): Message[] {
  let seen = 0;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "user") {
      if (seen === turn) return messages.slice(0, i);
      seen += 1;
    }
  }
  return messages;
}

type UseChatOptions = {
  mode?: ChatMode;
  onToolRefresh?: (refresh: ToolRefresh | undefined) => void;
  onToolCommand?: (command: string, args: unknown) => Promise<unknown>;
};

export function useChat(opts: UseChatOptions = {}) {
  const { logout, role } = useAuth();
  // Vai trò cho route tin nhắn trực tiếp (chỉ doctor/patient ở mode "patient").
  const directRole: DirectRole = role === "doctor" ? "doctor" : "patient";
  const mode: ChatMode = opts.mode ?? "ai";
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  const onToolRefreshRef = useRef(opts.onToolRefresh);
  useEffect(() => {
    onToolRefreshRef.current = opts.onToolRefresh;
  }, [opts.onToolRefresh]);

  const onToolCommandRef = useRef(opts.onToolCommand);
  useEffect(() => {
    onToolCommandRef.current = opts.onToolCommand;
  }, [opts.onToolCommand]);

  // ── Lời chào "fake gen token" (xem lib/greetings.ts) ──────────────────────
  // Render từng chữ một như AI đang sinh token, nhưng KHÔNG gọi máy chủ. Chỉ là
  // tin nhắn assistant cục bộ (không lưu server); biến mất tự nhiên khi user mở
  // hội thoại khác. Nếu user gửi tin trong lúc đang chạy → snap lời chào về đủ.
  const greetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetRef = useRef<{ id: string; full: string } | null>(null);
  // id lời chào đang hiển thị (null = không có); cờ đang gõ chữ. Suy ra lúc nào
  // hiện list nút gợi ý: lời chào còn đó + đã gõ xong.
  const [greetingId, setGreetingId] = useState<string | null>(null);
  const [greetingStreaming, setGreetingStreaming] = useState(false);

  const finalizeGreeting = useCallback(() => {
    if (greetTimerRef.current) {
      clearTimeout(greetTimerRef.current);
      greetTimerRef.current = null;
    }
    const g = greetRef.current;
    greetRef.current = null;
    setGreetingId(null);
    setGreetingStreaming(false);
    if (g) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === g.id
            ? { ...m, content: g.full, parts: [{ type: "text", text: g.full }] }
            : m
        )
      );
    }
  }, []);

  const showGreeting = useCallback(
    (fullText: string) => {
      if (greetTimerRef.current) clearTimeout(greetTimerRef.current);
      const id = newId();
      greetRef.current = { id, full: fullText };
      setGreetingId(id);
      setGreetingStreaming(true);
      const base: Message = {
        id,
        role: "assistant",
        content: "",
        parts: [{ type: "text", text: "" }],
        createdAt: new Date(),
      };
      setMessages([base]);
      let i = 0;
      const step = () => {
        // Tốc độ "sinh token": nhích vài ký tự mỗi nhịp.
        i = Math.min(fullText.length, i + 2);
        const slice = fullText.slice(0, i);
        setMessages((prev) => {
          // User đã thao tác (gửi tin/đổi hội thoại) → ngừng can thiệp.
          if (prev.length !== 1 || prev[0].id !== id) return prev;
          return [
            { ...prev[0], content: slice, parts: [{ type: "text", text: slice }] },
          ];
        });
        if (i < fullText.length) {
          greetTimerRef.current = setTimeout(step, 18);
        } else {
          greetTimerRef.current = null;
          greetRef.current = null;
          setGreetingStreaming(false); // gõ xong → hiện nút gợi ý
        }
      };
      greetTimerRef.current = setTimeout(step, 18);
    },
    []
  );

  useEffect(() => () => finalizeGreeting(), [finalizeGreeting]);

  // Hiện list nút gợi ý khi lời chào đã gõ xong và vẫn là tin duy nhất.
  const showGreetingSuggestions = greetingId !== null && !greetingStreaming;

  const selectConversation = useCallback(
    async (id: string | null) => {
      if (isStreaming) return;
      // Rời màn hình chào → dừng hiệu ứng gõ chữ (lời chào không thuộc hội thoại nào).
      finalizeGreeting();
      if (id === null) {
        setMessages([]);
        setConversationId(null);
        return;
      }
      // === Mode "patient" = tin nhắn trực tiếp 1-1 (id = đối phương) ===
      if (mode === "patient") {
        const path = directPath(directRole, id);
        const cached = getCached<RawDirect>(path);
        setConversationId(id);
        if (cached) {
          setMessages(directToMessages(cached, directRole));
          setIsLoadingConversation(false);
        } else {
          setMessages([]);
          setIsLoadingConversation(true);
        }
        try {
          const data = await dedupedFetch<RawDirect>(path, async () => {
            const res = await authFetch(`${API_URL}${path}`);
            if (res.status === 401) {
              logout();
              throw new Error("unauthorized");
            }
            if (!res.ok) throw new Error(`API ${res.status}`);
            return (await res.json()) as RawDirect;
          });
          setMessages(directToMessages(data, directRole));
        } catch (err) {
          console.error("Failed to load direct thread", err);
        } finally {
          setIsLoadingConversation(false);
        }
        return;
      }

      const path = aiPath(id);
      // Có cache → hiện nội dung ngay, revalidate nền (không hiện "đang tải").
      const cached = getCached<RawConversation>(path);
      setConversationId(id);
      if (cached) {
        setMessages(toMessages(cached));
        setIsLoadingConversation(false);
      } else {
        setMessages([]);
        setIsLoadingConversation(true);
      }
      try {
        const data = await dedupedFetch<RawConversation>(path, async () => {
          const res = await authFetch(`${API_URL}${path}`);
          if (res.status === 401) {
            logout();
            throw new Error("unauthorized");
          }
          if (!res.ok) throw new Error(`API ${res.status}`);
          return (await res.json()) as RawConversation;
        });
        // Revalidate nền: nếu data y hệt cache vừa hiển thị thì BỎ QUA setMessages
        // để khỏi re-render (re-parse markdown) lần hai — chuyển hội thoại đỡ giật.
        if (!cached || JSON.stringify(cached) !== JSON.stringify(data)) {
          setMessages(toMessages(data));
        }
      } catch (err) {
        // Lỗi revalidate → giữ nội dung cache đang hiển thị (nếu có).
        console.error("Failed to load conversation", err);
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [isStreaming, logout, mode, directRole, finalizeGreeting]
  );

  const sendMessage = useCallback(
    // `editUserTurn` (chỉ mode "ai"): sửa & gửi lại lượt user thứ N → cắt cả tin
    // local lẫn lịch sử server về trước lượt đó, rồi gửi `text` làm lượt thay thế.
    async (text: string, editUserTurn?: number) => {
      if (!text.trim() || isStreaming) return;
      // User bắt đầu chat thật → chốt lời chào về đủ (giữ làm tin đầu đoạn).
      finalizeGreeting();

      if (mode === "patient") {
        if (!conversationId) return;
        setIsStreaming(true);
        // Tin của mình → bubble phải ("user").
        const optimistic: Message = {
          id: newId(),
          role: "user",
          content: text,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, optimistic]);
        try {
          const res = await authFetch(
            `${API_URL}${directPath(directRole, conversationId)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: text }),
            }
          );
          if (res.status === 401) {
            logout();
            return;
          }
          if (!res.ok) {
            throw new Error(`API ${res.status}: ${await res.text()}`);
          }
          await res.json();
          // Lưu cache để mở lại thread thấy ngay lượt vừa gửi.
          setMessages((prev) => {
            setCached(
              directPath(directRole, conversationId),
              toRawDirect(prev, directRole)
            );
            return prev;
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimistic.id
                ? {
                    ...m,
                    content:
                      m.content +
                      (m.content ? "\n\n" : "") +
                      `⚠ Không gửi được: ${errMsg}`,
                  }
                : m
            )
          );
        } finally {
          setIsStreaming(false);
        }
        return;
      }

      const userMsg: Message = {
        id: newId(),
        role: "user",
        content: text,
        createdAt: new Date(),
      };
      const assistantId = newId();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        toolCalls: [],
        parts: [],
        createdAt: new Date(),
      };

      setMessages((prev) => {
        // Sửa & gửi lại → bỏ lượt user cũ + mọi tin sau nó trước khi nối lượt mới.
        const base =
          editUserTurn != null
            ? truncateBeforeUserTurn(prev, editUserTurn)
            : prev;
        return [...base, userMsg, assistantMsg];
      });
      setIsStreaming(true);

      const updateAssistant = (mutate: (m: Message) => Message) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? mutate(m) : m))
        );
      };

      try {
        const res = await authFetch(`${AGENT_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message: text,
            ...(editUserTurn != null ? { editUserTurn } : {}),
          }),
        });

        if (res.status === 401) {
          logout();
          return;
        }
        if (!res.ok) {
          throw new Error(`API ${res.status}: ${await res.text()}`);
        }

        for await (const raw of readSSEStream(res)) {
          const ev = raw as SSEEvent;
          if (ev.type === "text") {
            updateAssistant((m) => ({
              ...m,
              content: m.content + ev.content,
              parts: appendTextPart(m.parts, ev.content),
            }));
          } else if (ev.type === "tool_call") {
            if (ev.status === "running") {
              const tc: ToolCall = {
                id: ev.id,
                name: ev.name,
                input: ev.input,
                status: "running",
              };
              updateAssistant((m) => ({
                ...m,
                toolCalls: [...(m.toolCalls ?? []), tc],
                parts: [...(m.parts ?? []), { type: "tool", toolCall: tc }],
              }));
            } else {
              updateAssistant((m) => ({
                ...m,
                toolCalls: (m.toolCalls ?? []).map((t) =>
                  t.id === ev.id
                    ? { ...t, status: "done", result: ev.result }
                    : t
                ),
                parts: (m.parts ?? []).map((p) =>
                  p.type === "tool" && p.toolCall.id === ev.id
                    ? {
                        type: "tool",
                        toolCall: {
                          ...p.toolCall,
                          status: "done",
                          result: ev.result,
                        },
                      }
                    : p
                ),
              }));
              onToolRefreshRef.current?.(ev.refresh);
            }
          } else if (ev.type === "tool_command") {
            const handler = onToolCommandRef.current;
            let result: unknown;
            if (handler) {
              try {
                result = await handler(ev.command, ev.args);
              } catch (e) {
                result = {
                  error: e instanceof Error ? e.message : String(e),
                };
              }
            } else {
              result = {
                error: "Frontend chưa đăng ký handler cho tool command.",
              };
            }
            try {
              await authFetch(
                `${AGENT_URL}/api/chat/tool-callback/${ev.commandId}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ result }),
                }
              );
            } catch (e) {
              console.error("Failed to POST tool-callback", e);
            }
          } else if (ev.type === "done") {
            const cid = ev.conversationId;
            setConversationId(cid);
            setIsStreaming(false);
            // Cập nhật cache nội dung hội thoại để lần sau mở lại thấy bản mới nhất.
            setMessages((prev) => {
              setCached(aiPath(cid), toRaw(cid, prev));
              return prev;
            });
          } else if (ev.type === "error") {
            updateAssistant((m) => ({
              ...m,
              content:
                m.content + (m.content ? "\n\n" : "") + `⚠ Lỗi: ${ev.message}`,
              parts: appendTextPart(
                m.parts,
                (m.parts && m.parts.length ? "\n\n" : "") +
                  `⚠ Lỗi: ${ev.message}`
              ),
            }));
            setIsStreaming(false);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const errText = `⚠ Không kết nối được tới máy chủ: ${msg}`;
        updateAssistant((m) => ({
          ...m,
          content: m.content + (m.content ? "\n\n" : "") + errText,
          parts: appendTextPart(
            m.parts,
            (m.parts && m.parts.length ? "\n\n" : "") + errText
          ),
        }));
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, isStreaming, logout, mode, directRole, finalizeGreeting]
  );

  return {
    messages,
    isStreaming,
    isLoadingConversation,
    conversationId,
    sendMessage,
    selectConversation,
    showGreeting,
    showGreetingSuggestions,
    greetingId,
  };
}

export type UseChatReturn = ReturnType<typeof useChat>;
