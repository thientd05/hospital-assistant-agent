"use client";

import { useCallback, useState } from "react";
import type { LabResult, Patient } from "@pr_hospitalagent/types";
import type { AppointmentRow } from "@/components/workspace/Appointments";
import type { CustomerStatsData } from "@/components/workspace/CustomerStats";
import type { SkillData } from "@/components/workspace/SkillContent";

export type WorkspaceTab =
  | "patient"
  | "lab"
  | "appointments"
  | "stats"
  | "skill";

export function useWorkspace() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("patient");
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [labData, setLabData] = useState<LabResult[] | null>(null);
  const [labPatientId, setLabPatientId] = useState<string | null>(null);
  const [appointmentsData, setAppointmentsData] = useState<
    AppointmentRow[] | null
  >(null);
  const [customerStatsData, setCustomerStatsData] =
    useState<CustomerStatsData | null>(null);
  const [skillData, setSkillData] = useState<SkillData | null>(null);

  const openWorkspace = useCallback(
    (toolName: string, rawResult: string) => {
      try {
        const parsed = JSON.parse(rawResult);
        if (
          toolName === "get_patient_record" ||
          toolName === "create_patient" ||
          toolName === "update_patient"
        ) {
          if (parsed?.error) return;
          setPatientData(parsed as Patient);
          setActiveTab("patient");
          setIsOpen(true);
        } else if (toolName === "get_lab_results") {
          if (parsed?.error) return;
          const labs = (parsed?.labResults ?? []) as LabResult[];
          setLabData(labs);
          setLabPatientId(
            typeof parsed?.patientId === "string" ? parsed.patientId : null
          );
          setActiveTab("lab");
          setIsOpen(true);
        } else if (toolName === "get_appointments") {
          if (!Array.isArray(parsed)) return;
          setAppointmentsData(parsed as AppointmentRow[]);
          setActiveTab("appointments");
          setIsOpen(true);
        } else if (toolName === "get_customer_stats") {
          if (parsed?.error || !parsed?.patients || !parsed?.appointments)
            return;
          setCustomerStatsData(parsed as CustomerStatsData);
          setActiveTab("stats");
          setIsOpen(true);
        } else if (toolName === "read_skill") {
          if (parsed?.error || !parsed?.skill || !parsed?.content) return;
          setSkillData({ name: parsed.skill as string, content: parsed.content as string });
          setActiveTab("skill");
          setIsOpen(true);
        }
      } catch {
        // ignore non-JSON results
      }
    },
    []
  );

  const closeWorkspace = useCallback(() => setIsOpen(false), []);
  const setTab = useCallback((tab: WorkspaceTab) => setActiveTab(tab), []);

  const togglePanel = useCallback(() => {
    setIsOpen((open) => !open);
  }, []);

  return {
    isOpen,
    activeTab,
    patientData,
    labData,
    labPatientId,
    appointmentsData,
    customerStatsData,
    skillData,
    openWorkspace,
    closeWorkspace,
    setTab,
    togglePanel,
  };
}

export type UseWorkspaceReturn = ReturnType<typeof useWorkspace>;
