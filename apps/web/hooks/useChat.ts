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
import { useAuth } from "@/app/providers/AuthProvider";

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

type UseChatOptions = {
  mode?: ChatMode;
  onToolRefresh?: (refresh: ToolRefresh | undefined) => void;
  onToolCommand?: (command: string, args: unknown) => Promise<unknown>;
};

export function useChat(opts: UseChatOptions = {}) {
  const { token, logout } = useAuth();
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

  const selectConversation = useCallback(
    async (id: string | null) => {
      if (isStreaming) return;
      if (id === null) {
        setMessages([]);
        setConversationId(null);
        return;
      }
      setIsLoadingConversation(true);
      setMessages([]);
      setConversationId(id);
      try {
        const path =
          mode === "patient"
            ? `/api/conversations/patients/${id}`
            : `/api/conversations/${id}`;
        const res = await fetch(`${API_URL}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          logout();
          return;
        }
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = (await res.json()) as {
          id: string;
          messages: Array<
            Omit<Message, "createdAt"> & { createdAt: string }
          >;
        };
        setMessages(
          data.messages.map((m) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          }))
        );
      } catch (err) {
        console.error("Failed to load conversation", err);
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [isStreaming, token, logout, mode]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      if (mode === "patient") {
        if (!conversationId) return;
        setIsStreaming(true);
        const optimistic: Message = {
          id: newId(),
          role: "assistant",
          content: text,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, optimistic]);
        try {
          const res = await fetch(
            `${API_URL}/api/conversations/patients/${conversationId}/reply`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
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
          const data = (await res.json()) as {
            ok: boolean;
            message?: { content?: string };
          };
          const finalContent = data.message?.content;
          if (typeof finalContent === "string" && finalContent !== text) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === optimistic.id ? { ...m, content: finalContent } : m
              )
            );
          }
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

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const updateAssistant = (mutate: (m: Message) => Message) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? mutate(m) : m))
        );
      };

      try {
        const res = await fetch(`${AGENT_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId, message: text }),
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
              await fetch(
                `${AGENT_URL}/api/chat/tool-callback/${ev.commandId}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ result }),
                }
              );
            } catch (e) {
              console.error("Failed to POST tool-callback", e);
            }
          } else if (ev.type === "done") {
            setConversationId(ev.conversationId);
            setIsStreaming(false);
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
    [conversationId, isStreaming, token, logout, mode]
  );

  return {
    messages,
    isStreaming,
    isLoadingConversation,
    conversationId,
    sendMessage,
    selectConversation,
  };
}

export type UseChatReturn = ReturnType<typeof useChat>;
