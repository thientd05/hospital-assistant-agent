"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { useAuth } from "@/app/providers/AuthProvider";
import { useChat, type ChatMode } from "@/hooks/useChat";
import { useRatingsState, RatingsProvider } from "@/hooks/useRatings";
import { RateMessageStars } from "@/components/chat/RateMessageStars";
import { useConversations } from "@/hooks/useConversations";
import { useDirectThreads } from "@/hooks/useDirectThreads";
import { useDirectAlerts } from "@/hooks/useDirectAlerts";
import { useAppointments } from "@/hooks/useAppointments";
import { useAppointmentAlerts } from "@/hooks/useAppointmentAlerts";
import {
  useWorkspace,
  ROLE_TABS,
  type WorkspaceTab,
} from "@/hooks/useWorkspace";
import {
  buildSnapshot,
  runActions,
  waitForRoot,
  waitForLoadingSettled,
  type PanelAction,
} from "@/lib/panel-agent";
import { CHAT_STATE_KEY_PREFIX } from "@/lib/api";
import { pickPatientGreeting } from "@/lib/greetings";

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
  const { openPanel, mountHidden, setTab } = workspace;
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
      if (command === "read_panel") {
        // 2 chế độ: "public" mở panel cho người dùng thấy (chuẩn bị act/sửa);
        // "silent" đọc ngầm — gắn panel vào DOM để đọc snapshot nhưng KHÔNG hiển
        // thị (panel vô hình). Mặc định/không hợp lệ = public (tương thích cũ).
        const silent = args.mode === "silent";
        if (silent) {
          mountHidden();
        } else {
          openPanel();
          // Mobile: đưa panel lên full-screen để bác sĩ thấy agent thao tác.
          setMobileView("panel");
        }
        const tab = args.tab;
        const validTabs = (role && ROLE_TABS[role]) || [];
        if (
          typeof tab === "string" &&
          validTabs.includes(tab as WorkspaceTab)
        ) {
          setTab(tab as WorkspaceTab);
        }
        await waitForRoot();
        // Cho React render xong nội dung tab vừa chuyển, rồi CHỜ data tab nạp
        // xong (tab còn "Đang tải…" → snapshot rỗng/sai trên mạng chậm).
        await new Promise((r) => setTimeout(r, 80));
        await waitForLoadingSettled();
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
    [openPanel, mountHidden, setTab, role]
  );

  const chat = useChat({
    mode: chatMode,
    onToolRefresh: workspace.handleToolRefresh,
    onToolCommand: executeToolCommand,
  });
  const aiList = useConversations();
  // Bật cả khi đang ở mode AI (poll nền) → chấm "tin mới" hiện trên nút đổi mode.
  const directList = useDirectThreads({
    role: directRole,
    enabled: canDirect,
    pollMs: canDirect ? 20000 : undefined,
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

  // Mode "ai": có hội thoại đang chọn là đủ. Mode "tin nhắn": chỉ coi là đã chọn
  // khi đối phương THỰC SỰ nằm trong danh sách thread (đã ghép cặp) — tránh ô nhập
  // trỏ vào đối phương "ma" (id cũ khôi phục từ localStorage khi chưa ai ghép cặp).
  const hasSelection = useMemo(() => {
    if (chat.conversationId === null) return false;
    if (chatMode !== "patient") return true;
    return directList.threads.some(
      (t) => t.counterpartId === chat.conversationId
    );
  }, [chatMode, chat.conversationId, directList.threads]);

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
      // Panel cũng nhảy sang hồ sơ chi tiết của BN vừa nhận (tab Bệnh nhân,
      // master-detail). bumpTab để list nạp lại → BN mới xuất hiện + chọn được.
      workspace.openPanel();
      workspace.setTab("patients");
      workspace.bumpTab("patients");
      workspace.selectPatient(patientId);
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
    [isDoctor, chat, chatMode, directList, workspace]
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

  // Id user đang đăng nhập; null cho tới khi auth load xong.
  const accountId = useMemo(() => {
    if (!account) return null;
    return account.role === "doctor"
      ? account.doctor.id
      : account.role === "manager"
      ? account.manager.id
      : account.role === "expert"
      ? account.expert.id
      : account.patient.id;
  }, [account]);

  // Storage key per user.
  const storageKey = accountId ? `${CHAT_STATE_KEY_PREFIX}${accountId}` : null;

  // ── Chấm thông báo ───────────────────────────────────────────────────────
  // Tin nhắn trực tiếp mới chưa đọc (mode tin nhắn + nút đổi mode).
  const directAlerts = useDirectAlerts({
    threads: directList.threads,
    viewerRole: directRole,
    storageKey: accountId ? `dm:seen:${accountId}` : null,
  });

  // Lịch hẹn mới cho bác sĩ — poll nền để chấm hiện cả khi panel đang đóng.
  const [apptPollTick, setApptPollTick] = useState(0);
  useEffect(() => {
    if (!isDoctor) return;
    const t = setInterval(() => setApptPollTick((v) => v + 1), 20000);
    return () => clearInterval(t);
  }, [isDoctor]);
  const apptList = useAppointments(apptPollTick, isDoctor);
  const apptAlerts = useAppointmentAlerts({
    appointments: apptList.data,
    storageKey: accountId ? `appt:seen:${accountId}` : null,
  });

  // Mở/xem một thread tin nhắn trực tiếp → đánh dấu đã đọc thread đó.
  useEffect(() => {
    if (chatMode !== "patient" || !chat.conversationId) return;
    directAlerts.markSeen(chat.conversationId);
  }, [chatMode, chat.conversationId, directAlerts.markSeen]);

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

  // Lời chào tự động cho bệnh nhân khi vừa VÀO APP: render fake-stream MỘT lần,
  // ngay sau khi khôi phục xong và CHỈ KHI lượt vào này không có hội thoại AI cũ
  // để tiếp tục (savedConvIdsRef.current.ai === null). Bấm "đoạn chat mới" SAU đó
  // không kích hoạt lại — greetedRef giữ one-shot cho cả phiên.
  const greetedRef = useRef(false);
  useEffect(() => {
    if (!isRestored || greetedRef.current) return;
    greetedRef.current = true;
    if (role !== "patient" || chatMode !== "ai") return;
    if (savedConvIdsRef.current.ai !== null) return;
    const name = account?.role === "patient" ? account.patient.name : "";
    chat.showGreeting(pickPatientGreeting(name));
    // chat đổi mỗi render; one-shot greetedRef đã chặn chạy lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestored, role, chatMode]);

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

  // Hội thoại AI hiện tại (để hook đặt lịch nhờ trợ lý ảo tóm tắt). Ở mode "ai" là
  // hội thoại đang xem; ở mode tin nhắn trực tiếp lấy hội thoại AI đã lưu gần nhất.
  const aiConversationId =
    chatMode === "ai" ? chat.conversationId : savedConvIdsRef.current.ai;

  // ── Đánh giá sao câu trả lời chatbot — chỉ bệnh nhân ở chế độ AI ──────────
  const ratingsEnabled = role === "patient" && chatMode === "ai";
  const ratings = useRatingsState(ratingsEnabled ? chat.conversationId : null);
  const lastMessageId = chat.messages[chat.messages.length - 1]?.id;
  const renderMessageFooter = useMemo(() => {
    // Cần conversationId để lưu đánh giá → lượt đầu (chưa lưu) chưa hiện sao.
    if (!ratingsEnabled || !chat.conversationId) return undefined;
    return (message: (typeof chat.messages)[number], turnIndex: number) => {
      // Ẩn trên câu trả lời đang stream dở + tin chưa có nội dung text.
      if (chat.isStreaming && message.id === lastMessageId) return null;
      if (!message.content?.trim()) return null;
      return <RateMessageStars turnIndex={turnIndex} />;
    };
  }, [ratingsEnabled, chat.conversationId, chat.isStreaming, lastMessageId]);

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
        hasUnreadDirect={canDirect && directAlerts.hasUnseen}
        unreadThreadIds={directAlerts.unseenIds}
        mobileActive={mobileView === "sidebar"}
        onCloseMobile={() => setMobileView("chat")}
      />
      <RatingsProvider value={ratings}>
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
          hasSelection={hasSelection}
          panelHasAlert={isDoctor && apptAlerts.hasNew}
          onOpenSidebar={() => setMobileView("sidebar")}
          showSuggestions={chatMode === "ai" && chat.showGreetingSuggestions}
          renderMessageFooter={renderMessageFooter}
          greetingId={chat.greetingId}
          onEditMessage={(turnIndex, text) => chat.sendMessage(text, turnIndex)}
        />
      </RatingsProvider>
      <WorkspacePanel
        isOpen={workspace.isOpen}
        isMounted={workspace.isMounted}
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
        aiConversationId={aiConversationId}
        appointmentsAlert={isDoctor && apptAlerts.hasNew}
        newApptDays={apptAlerts.newDays}
        onApptDaySeen={apptAlerts.markDaySeen}
      />
    </>
  );
}
