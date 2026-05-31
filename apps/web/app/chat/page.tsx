"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { useAuth } from "@/app/providers/AuthProvider";
import { useChat, type ChatMode } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { useDirectThreads } from "@/hooks/useDirectThreads";
import {
  useWorkspace,
  ROLE_TABS,
  type WorkspaceTab,
} from "@/hooks/useWorkspace";
import {
  buildSnapshot,
  runActions,
  waitForRoot,
  type PanelAction,
} from "@/lib/panel-agent";

const CHAT_STATE_KEY_PREFIX = "chat:lastState:";

type SavedChatState = {
  mode?: ChatMode;
  aiConvId?: string | null;
  patientConvId?: string | null;
};

export default function ChatPage() {
  const router = useRouter();
  const { role, account, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (role === "manager") router.replace("/admin/manager");
    else if (role === "expert") router.replace("/admin/expert");
  }, [role, authLoading, router]);

  const workspace = useWorkspace();
  const { openPanel, setTab } = workspace;
  const [chatMode, setChatMode] = useState<ChatMode>("ai");
  // Mobile (< lg): chỉ 1 trong 3 (sidebar | chat | panel) hiện full-screen 1 lúc.
  // Desktop (lg+) bỏ qua state này, vẫn hiển thị cả 3 cột như cũ.
  const [mobileView, setMobileView] = useState<"sidebar" | "chat" | "panel">(
    "chat"
  );
  const savedConvIdsRef = useRef<Record<ChatMode, string | null>>({
    ai: null,
    patient: null,
  });
  const isDoctor = role === "doctor";
  // Bác sĩ + bệnh nhân đều có mode "tin nhắn trực tiếp" (đối phương khác nhau).
  const canDirect = role === "doctor" || role === "patient";
  const directRole: "doctor" | "patient" = isDoctor ? "doctor" : "patient";

  const executeToolCommand = useCallback(
    async (command: string, rawArgs: unknown): Promise<unknown> => {
      const args = (rawArgs ?? {}) as Record<string, unknown>;
      if (command === "open_panel") {
        openPanel();
        // Mobile: đưa panel lên full-screen để bác sĩ thấy agent thao tác.
        setMobileView("panel");
        const tab = args.tab;
        const validTabs = (role && ROLE_TABS[role]) || [];
        if (
          typeof tab === "string" &&
          validTabs.includes(tab as WorkspaceTab)
        ) {
          setTab(tab as WorkspaceTab);
        }
        await waitForRoot();
        // Cho React render xong nội dung tab vừa chuyển trước khi chụp snapshot.
        await new Promise((r) => setTimeout(r, 200));
        return buildSnapshot();
      }
      if (command === "read_panel") {
        return buildSnapshot();
      }
      if (command === "act") {
        const actions = Array.isArray(args.actions)
          ? (args.actions as PanelAction[])
          : [];
        if (actions.length === 0) {
          return { ok: false, error: "Mảng `actions` rỗng." };
        }
        return await runActions(actions);
      }
      return { error: `Unknown tool command: ${command}` };
    },
    [openPanel, setTab, role]
  );

  const chat = useChat({
    mode: chatMode,
    onToolRefresh: workspace.handleToolRefresh,
    onToolCommand: executeToolCommand,
  });
  const aiList = useConversations();
  const directList = useDirectThreads({
    role: directRole,
    enabled: canDirect && chatMode === "patient",
  });

  useEffect(() => {
    if (chatMode !== "ai") return;
    if (!chat.isStreaming) aiList.refresh();
  }, [chatMode, chat.isStreaming, aiList.refresh]);

  // Sau khi gửi tin trực tiếp → cập nhật "tin nhắn cuối" trong sidebar.
  useEffect(() => {
    if (chatMode !== "patient") return;
    if (!chat.isStreaming) directList.refresh();
  }, [chatMode, chat.isStreaming, directList.refresh]);

  const sidebarConversations = useMemo(() => {
    if (chatMode === "patient") {
      // Mode tin nhắn: mỗi dòng = đối phương (tên BN với bác sĩ / tên BS với BN).
      return directList.threads.map((t) => ({
        id: t.counterpartId,
        title: t.counterpartName,
        updatedAt: t.updatedAt ?? "",
      }));
    }
    return aiList.conversations;
  }, [chatMode, directList.threads, aiList.conversations]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (chatMode !== "ai") return;
      if (chat.conversationId === id) {
        await chat.selectConversation(null);
      }
      await aiList.deleteConversation(id);
    },
    [chat, aiList, chatMode]
  );

  // Bác sĩ duyệt/nhận lịch hẹn → mở ngay đoạn chat trực tiếp với BN đó.
  // Lần đầu ghép cặp: thread chưa có cache → selectConversation hiện "đang tải"
  // rồi nạp thread (rỗng) khi xong; đã ghép trước đó → có cache, chuyển tức thì.
  const goToDirectChat = useCallback(
    (patientId: string) => {
      if (!isDoctor || chat.isStreaming) return;
      // Ghi trước để effect [chatMode] + persistence chọn đúng BN.
      savedConvIdsRef.current.patient = patientId;
      setMobileView("chat");
      if (chatMode === "patient") {
        // Đã ở chế độ tin nhắn → đổi thread + làm mới danh sách (BN mới xuất hiện).
        directList.refresh();
        chat.selectConversation(patientId);
      } else {
        // Đổi sang chế độ tin nhắn; effect [chatMode] tự chọn savedConvIdsRef.current.patient,
        // và useDirectThreads tự refresh khi enabled bật.
        setChatMode("patient");
      }
    },
    [isDoctor, chat, chatMode, directList]
  );

  const handleChatModeChange = useCallback(
    (mode: ChatMode) => {
      if (chat.isStreaming) return;
      if (mode === chatMode) return;
      // Lưu cuộc trò chuyện đang xem ở mode hiện tại trước khi rời đi.
      savedConvIdsRef.current[chatMode] = chat.conversationId;
      setChatMode(mode);
    },
    [chat.isStreaming, chat.conversationId, chatMode]
  );

  // Storage key per user; null cho tới khi auth load xong.
  const storageKey = useMemo(() => {
    if (!account) return null;
    const id =
      account.role === "doctor"
        ? account.doctor.id
        : account.role === "manager"
        ? account.manager.id
        : account.role === "expert"
        ? account.expert.id
        : account.patient.id;
    return `${CHAT_STATE_KEY_PREFIX}${id}`;
  }, [account]);

  const [isRestored, setIsRestored] = useState(false);
  const prevModeRef = useRef<ChatMode>(chatMode);

  // One-shot: sau khi auth sẵn sàng, đọc state đã lưu, set ref + (nếu cần) đổi mode,
  // rồi bật cờ isRestored để chatMode-effect bên dưới mới bắt đầu chạy.
  useEffect(() => {
    if (isRestored) return;
    if (authLoading || !storageKey) return;
    let saved: SavedChatState | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw) as SavedChatState;
    } catch {
      // bỏ qua dữ liệu hỏng
    }
    if (saved) {
      if (saved.aiConvId !== undefined) {
        savedConvIdsRef.current.ai = saved.aiConvId ?? null;
      }
      if (saved.patientConvId !== undefined) {
        savedConvIdsRef.current.patient = saved.patientConvId ?? null;
      }
      const targetMode: ChatMode =
        saved.mode === "patient" && canDirect ? "patient" : "ai";
      if (targetMode !== chatMode) {
        prevModeRef.current = targetMode;
        setChatMode(targetMode);
      }
    }
    setIsRestored(true);
  }, [authLoading, storageKey, canDirect, chatMode, isRestored]);

  // Khi mode đổi (hoặc khi restore xong), khôi phục cuộc trò chuyện đã lưu của mode đó.
  // Trước restore, không gọi gì để tránh ghi đè state đang chờ khôi phục.
  useEffect(() => {
    if (!isRestored) return;
    chat.selectConversation(savedConvIdsRef.current[chatMode]);
    // chat object đổi mỗi render nhưng không cần re-trigger ở đây.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMode, isRestored]);

  // Persist mode + per-mode conv id sau khi đã restore xong.
  // Bỏ qua trong lúc đang load conversation để tránh ghi đè ref bằng id null tạm thời.
  useEffect(() => {
    if (!isRestored || !storageKey) return;
    if (chat.isLoadingConversation) return;
    if (prevModeRef.current === chatMode) {
      savedConvIdsRef.current[chatMode] = chat.conversationId;
    } else {
      prevModeRef.current = chatMode;
    }
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          mode: chatMode,
          aiConvId: savedConvIdsRef.current.ai,
          patientConvId: savedConvIdsRef.current.patient,
        } satisfies SavedChatState)
      );
    } catch {
      // bỏ qua khi storage đầy / disabled
    }
  }, [
    storageKey,
    chatMode,
    chat.conversationId,
    chat.isLoadingConversation,
    isRestored,
  ]);

  const hasPanel = Boolean(role && (ROLE_TABS[role] ?? []).length > 0);

  return (
    <>
      <Sidebar
        conversations={sidebarConversations}
        activeId={chat.conversationId}
        onSelect={(id) => {
          chat.selectConversation(id);
          setMobileView("chat");
        }}
        onNew={() => {
          chat.selectConversation(null);
          setMobileView("chat");
        }}
        onDelete={handleDelete}
        disabled={chat.isStreaming}
        mode={chatMode}
        onModeChange={canDirect ? handleChatModeChange : undefined}
        mobileActive={mobileView === "sidebar"}
        onCloseMobile={() => setMobileView("chat")}
      />
      <ChatWindow
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        onSend={chat.sendMessage}
        isPanelOpen={workspace.isOpen}
        onTogglePanel={
          hasPanel
            ? () => {
                workspace.togglePanel();
                setMobileView("panel");
              }
            : undefined
        }
        chatMode={chatMode}
        hasSelection={chat.conversationId !== null}
        onOpenSidebar={() => setMobileView("sidebar")}
      />
      <WorkspacePanel
        isOpen={workspace.isOpen}
        activeTab={workspace.activeTab}
        versions={workspace.versions}
        selectedPatientId={workspace.selectedPatientId}
        role={role}
        mobileActive={mobileView === "panel"}
        onClose={() => {
          workspace.closePanel();
          setMobileView("chat");
        }}
        onTabChange={workspace.setTab}
        onSelectPatient={workspace.selectPatient}
        bumpTab={workspace.bumpTab}
        onAcceptAppointment={isDoctor ? goToDirectChat : undefined}
      />
    </>
  );
}
