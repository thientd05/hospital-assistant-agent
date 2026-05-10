"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  AdminShell,
  type AdminSection,
} from "@/components/admin/AdminShell";
import { StatsTab } from "@/components/workspace/tabs/StatsTab";
import { PatientsTab } from "@/components/workspace/tabs/PatientsTab";
import { DoctorsTab } from "@/components/workspace/tabs/DoctorsTab";
import { ExpertsTab } from "@/components/workspace/tabs/ExpertsTab";
import { AssetsTab } from "@/components/workspace/tabs/AssetsTab";
import { UtilitiesTab } from "@/components/workspace/tabs/UtilitiesTab";
import { PayrollTab } from "@/components/workspace/tabs/PayrollTab";
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
      key: "patients",
      label: "Bệnh nhân",
      render: ({ version, bump }) => (
        <PatientsTab
          version={version}
          active={true}
          role="manager"
          onChanged={bump}
        />
      ),
    },
    {
      key: "doctors",
      label: "Bác sĩ",
      render: ({ version, bump }) => (
        <DoctorsTab version={version} active={true} onChanged={bump} />
      ),
    },
    {
      key: "experts",
      label: "Chuyên gia",
      render: ({ version, bump }) => (
        <ExpertsTab version={version} active={true} onChanged={bump} />
      ),
    },
    {
      key: "assets",
      label: "Cơ sở vật chất",
      render: ({ version, bump }) => (
        <AssetsTab version={version} active={true} onChanged={bump} />
      ),
    },
    {
      key: "utilities",
      label: "Điện nước",
      render: ({ version, bump }) => (
        <UtilitiesTab version={version} active={true} onChanged={bump} />
      ),
    },
    {
      key: "payroll",
      label: "Lương",
      render: ({ version, bump }) => (
        <PayrollTab version={version} active={true} onChanged={bump} />
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
