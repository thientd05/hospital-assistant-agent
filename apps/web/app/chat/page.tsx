"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function ChatPage() {
  const { role } = useAuth();
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

  // Khi mode đổi, khôi phục cuộc trò chuyện đã lưu của mode đó.
  useEffect(() => {
    chat.selectConversation(savedConvIdsRef.current[chatMode]);
    // chỉ chạy khi chatMode đổi; chat object đổi mỗi render nhưng không cần re-trigger ở đây.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMode]);

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
      />
      <ChatWindow
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        onSend={chat.sendMessage}
        isPanelOpen={workspace.isOpen}
        onTogglePanel={hasPanel ? workspace.togglePanel : undefined}
        model={chat.model}
        onModelChange={chat.setModel}
        chatMode={chatMode}
        onChatModeChange={isDoctor ? handleChatModeChange : undefined}
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
