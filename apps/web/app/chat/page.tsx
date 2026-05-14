"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { useAuth } from "@/app/providers/AuthProvider";
import { useChat, type ChatMode } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { usePatientConversations } from "@/hooks/usePatientConversations";
import {
  useWorkspace,
  ROLE_TABS,
  type PatientFormValues,
} from "@/hooks/useWorkspace";

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
  const {
    openPanel,
    setTab,
    openPatientForm,
    submitPatientForm,
  } = workspace;
  const [chatMode, setChatMode] = useState<ChatMode>("ai");
  const savedConvIdsRef = useRef<Record<ChatMode, string | null>>({
    ai: null,
    patient: null,
  });
  const isDoctor = role === "doctor";

  const executeToolCommand = useCallback(
    async (command: string, rawArgs: unknown): Promise<unknown> => {
      const args = (rawArgs ?? {}) as Record<string, unknown>;
      if (command === "open_patient_form") {
        const partial: Partial<PatientFormValues> = {};
        if (typeof args.name === "string") partial.name = args.name;
        if (args.age !== undefined && args.age !== null) {
          partial.age = String(args.age);
        }
        if (args.gender === "Nam" || args.gender === "Nữ") {
          partial.gender = args.gender;
        }
        if (typeof args.ward === "string") partial.ward = args.ward;
        if (typeof args.medications === "string")
          partial.medications = args.medications;
        if (args.spO2 !== undefined && args.spO2 !== null) {
          partial.spO2 = String(args.spO2);
        }
        if (args.heartRate !== undefined && args.heartRate !== null) {
          partial.heartRate = String(args.heartRate);
        }
        if (typeof args.bloodPressure === "string") {
          partial.bloodPressure = args.bloodPressure;
        }
        if (args.temperature !== undefined && args.temperature !== null) {
          partial.temperature = String(args.temperature);
        }
        openPanel();
        setTab("patients");
        const filled = openPatientForm(partial);
        return {
          opened: true,
          fields: filled,
          note: "Form đã mở. Có thể gọi open_patient_form lần nữa để cập nhật từng field, sau đó submit_patient_form để lưu.",
        };
      }
      if (command === "submit_patient_form") {
        const result = await submitPatientForm();
        if (result.ok) {
          return {
            ok: true,
            patient: {
              id: result.patient.id,
              name: result.patient.name,
              age: result.patient.age,
              gender: result.patient.gender,
              ward: result.patient.ward,
            },
          };
        }
        return { ok: false, error: result.error };
      }
      return { error: `Unknown tool command: ${command}` };
    },
    [openPanel, setTab, openPatientForm, submitPatientForm]
  );

  const chat = useChat({
    mode: chatMode,
    onToolRefresh: workspace.handleToolRefresh,
    onToolCommand: executeToolCommand,
  });
  const aiList = useConversations();
  const patientList = usePatientConversations({
    enabled: isDoctor && chatMode === "patient",
  });

  useEffect(() => {
    if (chatMode !== "ai") return;
    if (!chat.isStreaming) aiList.refresh();
  }, [chatMode, chat.isStreaming, aiList.refresh]);

  const sidebarConversations = useMemo(() => {
    if (chatMode === "patient") {
      return patientList.conversations.map((c) => ({
        id: c.id,
        title: c.ownerName
          ? `${c.ownerName} · ${c.title}`
          : c.ownerId
          ? `${c.ownerId} · ${c.title}`
          : c.title,
        updatedAt: c.updatedAt,
      }));
    }
    return aiList.conversations;
  }, [chatMode, patientList.conversations, aiList.conversations]);

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
        saved.mode === "patient" && isDoctor ? "patient" : "ai";
      if (targetMode !== chatMode) {
        prevModeRef.current = targetMode;
        setChatMode(targetMode);
      }
    }
    setIsRestored(true);
  }, [authLoading, storageKey, isDoctor, chatMode, isRestored]);

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
        onSelect={chat.selectConversation}
        onNew={() => chat.selectConversation(null)}
        onDelete={handleDelete}
        disabled={chat.isStreaming}
        mode={chatMode}
        onModeChange={isDoctor ? handleChatModeChange : undefined}
      />
      <ChatWindow
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        onSend={chat.sendMessage}
        isPanelOpen={workspace.isOpen}
        onTogglePanel={hasPanel ? workspace.togglePanel : undefined}
        chatMode={chatMode}
      />
      <WorkspacePanel
        isOpen={workspace.isOpen}
        activeTab={workspace.activeTab}
        versions={workspace.versions}
        selectedPatientId={workspace.selectedPatientId}
        role={role}
        onClose={workspace.closePanel}
        onTabChange={workspace.setTab}
        onSelectPatient={workspace.selectPatient}
        bumpTab={workspace.bumpTab}
        patientFormControl={
          role === "doctor"
            ? {
                open: workspace.patientFormOpen,
                values: workspace.patientFormValues,
                submitting: workspace.patientFormSubmitting,
                onOpen: workspace.openPatientForm,
                onClose: workspace.closePatientForm,
                onChange: workspace.setPatientFormField,
                onSubmit: workspace.submitPatientForm,
              }
            : undefined
        }
      />
    </>
  );
}
