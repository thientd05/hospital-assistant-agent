"use client";

import { useCallback, useState } from "react";
import type { ToolRefresh } from "@pr_hospitalagent/types";

export type WorkspaceTab =
  | "patients"
  | "patient"
  | "appointments"
  | "exam-history"
  | "my-record"
  | "my-appointments";

export const ROLE_TABS: Record<string, WorkspaceTab[]> = {
  // "patient" (Hồ sơ) + "exam-history" (Lịch sử khám) đã gộp vào "patients" (Bệnh
  // nhân): chọn BN → tab Bệnh nhân hiện hồ sơ + bộ chọn các lần khám lịch sử ngay
  // trong hồ sơ (master-detail). Tương tác thuốc không còn là tab — kiểm tra tự
  // động khi lưu form chọn thuốc trong hồ sơ.
  doctor: ["patients", "appointments"],
  patient: ["my-record", "my-appointments"],
};

const REFRESH_TO_TAB: Partial<Record<Exclude<ToolRefresh, false>, WorkspaceTab>> = {
  patients: "patients",
  patient: "patient",
  // Xét nghiệm đã gộp vào tab Hồ sơ (bác sĩ) → refresh "lab" bump tab Hồ sơ.
  lab: "patient",
  appointments: "appointments",
  examHistory: "exam-history",
};

type Versions = Record<WorkspaceTab, number>;

const ZERO_VERSIONS: Versions = {
  patients: 0,
  patient: 0,
  appointments: 0,
  "exam-history": 0,
  "my-record": 0,
  "my-appointments": 0,
};

export function useWorkspace() {
  // `isOpen` = panel ĐANG HIỂN THỊ cho người dùng. `isMounted` = panel root đã
  // gắn vào DOM (để agent đọc snapshot ngầm + tab fetch data) dù chưa hiển thị.
  // Đọc ngầm (silent): mount mà không mở → panel vô hình (width 0). Đọc công khai
  // (public) / mở tay: cả hai cùng true.
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("patients");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [versions, setVersions] = useState<Versions>(ZERO_VERSIONS);

  const openPanel = useCallback(() => {
    setIsMounted(true);
    setIsOpen(true);
  }, []);
  // Đọc ngầm: gắn panel vào DOM nhưng KHÔNG hiển thị (giữ vô hình).
  const mountHidden = useCallback(() => setIsMounted(true), []);
  // Đóng = ẩn khỏi mắt người dùng; giữ isMounted để khỏi fetch lại (đằng nào cũng
  // vô hình khi !isOpen).
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(
    () =>
      setIsOpen((v) => {
        if (!v) setIsMounted(true);
        return !v;
      }),
    []
  );
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
    isMounted,
    activeTab,
    versions,
    selectedPatientId,
    openPanel,
    mountHidden,
    closePanel,
    togglePanel,
    setTab,
    bumpTab,
    handleToolRefresh,
    selectPatient,
  };
}
