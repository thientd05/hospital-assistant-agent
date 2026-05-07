"use client";

import { useCallback, useEffect } from "react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { useAuth } from "@/app/providers/AuthProvider";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { useWorkspace } from "@/hooks/useWorkspace";

export default function ChatPage() {
  const { role } = useAuth();
  const workspace = useWorkspace();
  const handleToolDone = useCallback(
    (name: string, result: string | undefined) => {
      if (
        (name === "get_patient_record" ||
          name === "create_patient" ||
          name === "update_patient" ||
          name === "get_lab_results" ||
          name === "get_appointments" ||
          name === "get_customer_stats" ||
          name === "list_patients" ||
          name === "delete_patient" ||
          (name === "read_skill" && role === "expert") ||
          (name === "delete_skill" && role === "expert")) &&
        result
      ) {
        workspace.openWorkspace(name, result);
      }
    },
    [workspace, role]
  );
  const chat = useChat({ onToolDone: handleToolDone });
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
        onOpenWorkspace={workspace.openWorkspace}
        isPanelOpen={workspace.isOpen}
        onTogglePanel={workspace.togglePanel}
        model={chat.model}
        onModelChange={chat.setModel}
      />
      <WorkspacePanel
        isOpen={workspace.isOpen}
        activeTab={workspace.activeTab}
        patientData={workspace.patientData}
        labData={workspace.labData}
        labPatientId={workspace.labPatientId}
        appointmentsData={workspace.appointmentsData}
        customerStatsData={workspace.customerStatsData}
        skillData={workspace.skillData}
        skillsListData={workspace.skillsListData}
        patientListData={workspace.patientListData}
        role={role}
        onClose={workspace.closeWorkspace}
        onTabChange={workspace.setTab}
        onSendMessage={chat.sendMessage}
        isStreaming={chat.isStreaming}
      />
    </>
  );
}
