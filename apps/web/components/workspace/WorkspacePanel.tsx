"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ROLE_TABS,
  type PatientFormValues,
  type SubmitPatientResult,
  type WorkspaceTab,
} from "@/hooks/useWorkspace";
import { PatientsTab } from "./tabs/PatientsTab";
import { PatientDetailTab } from "./tabs/PatientDetailTab";
import { LabsTab } from "./tabs/LabsTab";
import { AppointmentsTab } from "./tabs/AppointmentsTab";
import { DrugCheckTab } from "./tabs/DrugCheckTab";
import { StatsTab } from "./tabs/StatsTab";
import { DoctorsTab } from "./tabs/DoctorsTab";
import { ExpertsTab } from "./tabs/ExpertsTab";
import { SkillsTab } from "./tabs/SkillsTab";

const MIN_WIDTH = 400;
const MAX_WIDTH = MIN_WIDTH * 1.5;

const TAB_LABELS: Record<WorkspaceTab, string> = {
  patients: "Bệnh nhân",
  patient: "Hồ sơ",
  lab: "Lab",
  appointments: "Lịch hẹn",
  "drug-check": "Tương tác thuốc",
  stats: "Thống kê",
  doctors: "Bác sĩ",
  experts: "Chuyên gia",
  skills: "Skill",
};

type PatientFormControl = {
  open: boolean;
  values: PatientFormValues;
  submitting: boolean;
  onOpen: (partial?: Partial<PatientFormValues>) => void;
  onClose: () => void;
  onChange: <K extends keyof PatientFormValues>(
    key: K,
    value: PatientFormValues[K]
  ) => void;
  onSubmit: () => Promise<SubmitPatientResult>;
};

type Props = {
  isOpen: boolean;
  activeTab: WorkspaceTab;
  versions: Record<WorkspaceTab, number>;
  selectedPatientId: string | null;
  role: string | null;
  onClose: () => void;
  onTabChange: (tab: WorkspaceTab) => void;
  onSelectPatient: (id: string | null) => void;
  bumpTab: (tab: WorkspaceTab) => void;
  patientFormControl?: PatientFormControl;
};

export function WorkspacePanel({
  isOpen,
  activeTab,
  versions,
  selectedPatientId,
  role,
  onClose,
  onTabChange,
  onSelectPatient,
  bumpTab,
  patientFormControl,
}: Props) {
  const [width, setWidth] = useState(MIN_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const tabs = role && ROLE_TABS[role] ? ROLE_TABS[role] : [];

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

  // Ensure activeTab is valid for the current role
  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.includes(activeTab)) {
      onTabChange(tabs[0]!);
    }
  }, [tabs, activeTab, onTabChange]);

  // Wrap onSelectPatient so doctor list can switch to detail tab
  const handleSelectPatient = useCallback(
    (id: string) => {
      onSelectPatient(id);
      onTabChange("patient");
    },
    [onSelectPatient, onTabChange]
  );

  // Cross-tab refresh helper after a tab's mutation: refetch dependent tabs too.
  const onChanged = useCallback(() => {
    if (role === "doctor") {
      bumpTab("patients");
      bumpTab("patient");
      bumpTab("lab");
    } else if (role === "manager") {
      bumpTab("doctors");
      bumpTab("experts");
      bumpTab("patients");
      bumpTab("stats");
    }
  }, [bumpTab, role]);

  if (tabs.length === 0) return null;

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
            isResizing ? "bg-[#087E8B]" : "bg-transparent hover:bg-[#C8E7E9]"
          }`}
        />
      )}
      <div className="h-full flex flex-col" style={{ width }}>
        <header className="flex items-center gap-2 px-4 pt-3 pb-0 border-b border-gray-200">
          <div
            className="flex gap-1 min-w-0 flex-1 overflow-x-auto workspace-tabs-scroll"
            onWheel={(e) => {
              if (e.deltaY !== 0 && e.deltaX === 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            {tabs.map((tab) => {
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onTabChange(tab)}
                  className={`shrink-0 whitespace-nowrap text-sm px-3 py-2 -mb-px border-b-2 transition-colors ${
                    isActive
                      ? "border-[#087E8B] text-gray-900 font-medium"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {role === "doctor" && activeTab === "patients" && (
            <PatientsTab
              role="doctor"
              version={versions.patients}
              active={isOpen && activeTab === "patients"}
              onSelect={handleSelectPatient}
              onChanged={onChanged}
              createForm={
                patientFormControl
                  ? {
                      open: patientFormControl.open,
                      values: patientFormControl.values,
                      submitting: patientFormControl.submitting,
                      onOpen: () => patientFormControl.onOpen(),
                      onClose: patientFormControl.onClose,
                      onChange: patientFormControl.onChange,
                      onSubmit: patientFormControl.onSubmit,
                    }
                  : undefined
              }
            />
          )}
          {role === "doctor" && activeTab === "patient" && (
            <PatientDetailTab
              patientId={selectedPatientId}
              version={versions.patient}
              active={isOpen && activeTab === "patient"}
              onChanged={onChanged}
            />
          )}
          {role === "doctor" && activeTab === "lab" && (
            <LabsTab
              patientId={selectedPatientId}
              version={versions.lab}
              active={isOpen && activeTab === "lab"}
              onChanged={onChanged}
            />
          )}
          {role === "doctor" && activeTab === "appointments" && (
            <AppointmentsTab
              version={versions.appointments}
              active={isOpen && activeTab === "appointments"}
              onChanged={onChanged}
            />
          )}
          {role === "doctor" && activeTab === "drug-check" && <DrugCheckTab />}

          {role === "manager" && activeTab === "stats" && (
            <StatsTab
              version={versions.stats}
              active={isOpen && activeTab === "stats"}
            />
          )}
          {role === "manager" && activeTab === "patients" && (
            <PatientsTab
              role="manager"
              version={versions.patients}
              active={isOpen && activeTab === "patients"}
              onChanged={onChanged}
            />
          )}
          {role === "manager" && activeTab === "doctors" && (
            <DoctorsTab
              version={versions.doctors}
              active={isOpen && activeTab === "doctors"}
              onChanged={onChanged}
            />
          )}
          {role === "manager" && activeTab === "experts" && (
            <ExpertsTab
              version={versions.experts}
              active={isOpen && activeTab === "experts"}
              onChanged={onChanged}
            />
          )}

          {role === "expert" && activeTab === "skills" && (
            <SkillsTab
              version={versions.skills}
              active={isOpen && activeTab === "skills"}
              onChanged={onChanged}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
