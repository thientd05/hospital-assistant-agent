"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabResult, Patient } from "@pr_hospitalagent/types";
import type { WorkspaceTab } from "@/hooks/useWorkspace";
import { PatientRecord } from "./PatientRecord";
import { LabResults } from "./LabResults";
import { Appointments, type AppointmentRow } from "./Appointments";
import { CustomerStats, type CustomerStatsData } from "./CustomerStats";
import { SkillContent, type SkillData } from "./SkillContent";
import { PatientList, type PatientListData } from "./PatientList";

const MIN_WIDTH = 380;
const MAX_WIDTH = MIN_WIDTH * 2;

type Props = {
  isOpen: boolean;
  activeTab: WorkspaceTab;
  patientData: Patient | null;
  labData: LabResult[] | null;
  labPatientId?: string | null;
  appointmentsData: AppointmentRow[] | null;
  customerStatsData: CustomerStatsData | null;
  skillData: SkillData | null;
  patientListData: PatientListData | null;
  role: string | null;
  onClose: () => void;
  onTabChange: (tab: WorkspaceTab) => void;
  onSendMessage: (text: string) => void;
  isStreaming: boolean;
};

const TABS: { key: WorkspaceTab; label: string; expertOnly?: boolean }[] = [
  { key: "patient", label: "Hồ sơ" },
  { key: "patients", label: "Bệnh nhân" },
  { key: "lab", label: "Lab" },
  { key: "appointments", label: "Lịch hẹn" },
  { key: "stats", label: "Thống kê" },
  { key: "skill", label: "Skill", expertOnly: true },
];

function hasTabData(
  tab: WorkspaceTab,
  patientData: Patient | null,
  labData: LabResult[] | null,
  appointmentsData: AppointmentRow[] | null,
  customerStatsData: CustomerStatsData | null,
  skillData: SkillData | null,
  patientListData: PatientListData | null
) {
  if (tab === "patient") return patientData !== null;
  if (tab === "patients") return patientListData !== null;
  if (tab === "lab") return labData !== null;
  if (tab === "appointments") return appointmentsData !== null;
  if (tab === "stats") return customerStatsData !== null;
  if (tab === "skill") return skillData !== null;
  return true;
}

export function WorkspacePanel({
  isOpen,
  activeTab,
  patientData,
  labData,
  labPatientId,
  appointmentsData,
  customerStatsData,
  skillData,
  patientListData,
  role,
  onClose,
  onTabChange,
  onSendMessage,
  isStreaming,
}: Props) {
  const [width, setWidth] = useState(MIN_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const visibleTabs = TABS.filter((t) => {
    if (t.expertOnly && role !== "expert") return false;
    return hasTabData(
      t.key,
      patientData,
      labData,
      appointmentsData,
      customerStatsData,
      skillData,
      patientListData
    );
  });

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const next = window.innerWidth - e.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [isResizing]);

  return (
    <aside
      className={`relative shrink-0 h-full overflow-hidden border-l border-gray-200 bg-white ${
        isResizing ? "" : "transition-[width] duration-300 ease-in-out"
      }`}
      style={{ width: isOpen ? width : 0 }}
      aria-hidden={!isOpen}
    >
      {isOpen && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Kéo để thay đổi kích thước bảng làm việc"
          onMouseDown={startResize}
          className={`absolute top-0 left-0 h-full w-1 cursor-col-resize z-10 transition-colors ${
            isResizing ? "bg-purple-400" : "bg-transparent hover:bg-purple-300"
          }`}
        />
      )}
      <div className="h-full flex flex-col" style={{ width }}>
        <header className="flex items-center justify-between px-4 pt-3 pb-0 border-b border-gray-200">
          <div className="flex gap-1">
            {visibleTabs.map((t) => {
              const active = t.key === activeTab;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onTabChange(t.key)}
                  className={`text-sm px-3 py-2 -mb-px border-b-2 transition-colors ${
                    active
                      ? "border-purple-500 text-gray-900 font-medium"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "patient" && patientData && (
            <PatientRecord patient={patientData} />
          )}
          {activeTab === "patients" && (
            <PatientList
              data={patientListData}
              onViewDetail={(id) =>
                onSendMessage(`Xem hồ sơ bệnh nhân ${id}`)
              }
              disabled={isStreaming}
            />
          )}
          {activeTab === "lab" && labData && (
            <LabResults
              results={labData}
              patientId={labPatientId}
              patientName={
                patientData && patientData.id === labPatientId
                  ? patientData.name
                  : null
              }
            />
          )}
          {activeTab === "appointments" && (
            <Appointments data={appointmentsData} />
          )}
          {activeTab === "stats" && (
            <CustomerStats data={customerStatsData} />
          )}
          {activeTab === "skill" && skillData && (
            <SkillContent data={skillData} />
          )}
        </div>
      </div>
    </aside>
  );
}
