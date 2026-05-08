"use client";

import { useCallback, useEffect } from "react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { useAuth } from "@/app/providers/AuthProvider";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
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
    onToolRefresh: workspace.handleToolRefresh,
    onToolCommand: executeToolCommand,
  });
  const list = useConversations();

  useEffect(() => {
    if (!chat.isStreaming) list.refresh();
  }, [chat.isStreaming, list.refresh]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (chat.conversationId === id) {
        await chat.selectConversation(null);
      }
      await list.deleteConversation(id);
    },
    [chat, list]
  );

  const hasPanel = Boolean(role && (ROLE_TABS[role] ?? []).length > 0);

  return (
    <>
      <Sidebar
        conversations={list.conversations}
        activeId={chat.conversationId}
        onSelect={chat.selectConversation}
        onNew={() => chat.selectConversation(null)}
        onDelete={handleDelete}
        disabled={chat.isStreaming}
      />
      <ChatWindow
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        onSend={chat.sendMessage}
        isPanelOpen={workspace.isOpen}
        onTogglePanel={hasPanel ? workspace.togglePanel : undefined}
        model={chat.model}
        onModelChange={chat.setModel}
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
