"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  AdminShell,
  type AdminSection,
} from "@/components/admin/AdminShell";
import { StatsTab } from "@/components/workspace/tabs/StatsTab";
import { AccountsTab } from "@/components/workspace/tabs/AccountsTab";
import { ExpensesTab } from "@/components/workspace/tabs/ExpensesTab";
import { RevenueTab } from "@/components/workspace/tabs/RevenueTab";

export default function ManagerAdminPage() {
  const router = useRouter();
  const { role, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!role) {
      router.replace("/login");
      return;
    }
    if (role !== "manager") {
      router.replace(role === "expert" ? "/admin/expert" : "/chat");
    }
  }, [role, isLoading, router]);

  if (isLoading || role !== "manager") {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-sm text-gray-400">
        Đang tải…
      </div>
    );
  }

  const sections: AdminSection[] = [
    {
      key: "stats",
      label: "Thống kê",
      render: ({ version }) => <StatsTab version={version} active={true} />,
    },
    {
      key: "accounts",
      label: "Quản lý tài khoản",
      render: ({ version, bump }) => (
        <AccountsTab version={version} active={true} onChanged={bump} />
      ),
    },
    {
      key: "expenses",
      label: "Chi phí",
      render: ({ version, bump }) => (
        <ExpensesTab version={version} active={true} onChanged={bump} />
      ),
    },
    {
      key: "revenue",
      label: "Doanh thu",
      render: ({ version, bump }) => (
        <RevenueTab version={version} active={true} onChanged={bump} />
      ),
    },
  ];

  return <AdminShell title="Quản trị phòng khám" sections={sections} />;
}
