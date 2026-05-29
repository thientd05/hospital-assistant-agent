"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  AdminShell,
  type AdminSection,
} from "@/components/admin/AdminShell";
import { SkillsTab } from "@/components/workspace/tabs/SkillsTab";
import { BootsTab } from "@/components/workspace/tabs/BootsTab";
import { ConversationAuditTab } from "@/components/workspace/tabs/ConversationAuditTab";

export default function ExpertAdminPage() {
  const router = useRouter();
  const { role, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!role) {
      router.replace("/login");
      return;
    }
    if (role !== "expert") {
      router.replace(role === "manager" ? "/admin/manager" : "/chat");
    }
  }, [role, isLoading, router]);

  if (isLoading || role !== "expert") {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-sm text-gray-400">
        Đang tải…
      </div>
    );
  }

  const sections: AdminSection[] = [
    {
      key: "skills",
      label: "Skill",
      render: ({ version, bump }) => (
        <SkillsTab version={version} active={true} onChanged={bump} />
      ),
    },
    {
      key: "boots",
      label: "Prompt gốc (AGENT.md)",
      render: ({ version, bump }) => (
        <BootsTab version={version} active={true} onChanged={bump} />
      ),
    },
    {
      key: "conversations",
      label: "Hội thoại chatbot",
      render: ({ version }) => (
        <ConversationAuditTab version={version} active={true} />
      ),
    },
  ];

  return <AdminShell title="Huấn luyện AI" sections={sections} />;
}
