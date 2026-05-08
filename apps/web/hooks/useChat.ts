"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Message,
  ModelKey,
  ToolCall,
  ToolRefresh,
} from "@pr_hospitalagent/types";
import { readSSEStream } from "@/lib/stream";
import { API_URL } from "@/lib/api";
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

type UseChatOptions = {
  onToolRefresh?: (refresh: ToolRefresh | undefined) => void;
  onToolCommand?: (command: string, args: unknown) => Promise<unknown>;
};

export function useChat(opts: UseChatOptions = {}) {
  const { token, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [model, setModel] = useState<ModelKey>("haiku");

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
        const res = await fetch(`${API_URL}/api/conversations/${id}`, {
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
    [isStreaming, token, logout]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

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
        const res = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId, message: text, model }),
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
            updateAssistant((m) => ({ ...m, content: m.content + ev.content }));
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
              }));
            } else {
              updateAssistant((m) => ({
                ...m,
                toolCalls: (m.toolCalls ?? []).map((t) =>
                  t.id === ev.id
                    ? { ...t, status: "done", result: ev.result }
                    : t
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
                `${API_URL}/api/chat/tool-callback/${ev.commandId}`,
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
                m.content +
                (m.content ? "\n\n" : "") +
                `⚠ Lỗi: ${ev.message}`,
            }));
            setIsStreaming(false);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updateAssistant((m) => ({
          ...m,
          content:
            m.content +
            (m.content ? "\n\n" : "") +
            `⚠ Không kết nối được tới máy chủ: ${msg}`,
        }));
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, isStreaming, model, token, logout]
  );

  return {
    messages,
    isStreaming,
    isLoadingConversation,
    conversationId,
    model,
    setModel,
    sendMessage,
    selectConversation,
  };
}

export type UseChatReturn = ReturnType<typeof useChat>;
