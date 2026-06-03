"use client";

import { useCallback, useState } from "react";
import type { ToolRefresh } from "@pr_hospitalagent/types";

export type WorkspaceTab =
  | "patients"
  | "patient"
  | "appointments"
  | "my-record"
  | "my-appointments";

export const ROLE_TABS: Record<string, WorkspaceTab[]> = {
  // "patient" (Hồ sơ) đã gộp vào "patients" (Bệnh nhân): chọn BN → tab Bệnh nhân
  // hiện hồ sơ ngay (master-detail), không còn tab Hồ sơ riêng. Tương tác thuốc
  // không còn là tab — kiểm tra tự động khi lưu form chọn thuốc trong hồ sơ.
  doctor: ["patients", "appointments"],
  patient: ["my-record", "my-appointments"],
};

const REFRESH_TO_TAB: Partial<Record<Exclude<ToolRefresh, false>, WorkspaceTab>> = {
  patients: "patients",
  patient: "patient",
  // Xét nghiệm đã gộp vào tab Hồ sơ (bác sĩ) → refresh "lab" bump tab Hồ sơ.
  lab: "patient",
  appointments: "appointments",
};

type Versions = Record<WorkspaceTab, number>;

const ZERO_VERSIONS: Versions = {
  patients: 0,
  patient: 0,
  appointments: 0,
  "my-record": 0,
  "my-appointments": 0,
};

export function useWorkspace() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("patients");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [versions, setVersions] = useState<Versions>(ZERO_VERSIONS);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((v) => !v), []);
  const setTab = useCallback((tab: WorkspaceTab) => setActiveTab(tab), []);

  const bumpTab = useCallback((tab: WorkspaceTab) => {
    setVersions((v) => ({ ...v, [tab]: v[tab] + 1 }));
  }, []);

  const handleToolRefresh = useCallback(
    (refresh: ToolRefresh | undefined) => {
      if (!refresh) return;
      const tab = REFRESH_TO_TAB[refresh];
      if (tab) bumpTab(tab);
    },
    [bumpTab]
  );

  const selectPatient = useCallback((id: string | null) => {
    setSelectedPatientId(id);
  }, []);

  return {
    isOpen,
    activeTab,
    versions,
    selectedPatientId,
    openPanel,
    closePanel,
    togglePanel,
    setTab,
    bumpTab,
    handleToolRefresh,
    selectPatient,
  };
}
