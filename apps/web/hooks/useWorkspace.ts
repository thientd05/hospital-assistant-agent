"use client";

import { useCallback, useState } from "react";
import type {
  DoctorPublic,
  ExpertPublic,
  LabResult,
  Patient,
} from "@pr_hospitalagent/types";
import type { AppointmentRow } from "@/components/workspace/Appointments";
import type { CustomerStatsData } from "@/components/workspace/CustomerStats";
import type { SkillData } from "@/components/workspace/SkillContent";
import type { SkillsListData } from "@/components/workspace/SkillsList";
import type { PatientListData } from "@/components/workspace/PatientList";
import type { DoctorListData } from "@/components/workspace/DoctorList";
import type { ExpertListData } from "@/components/workspace/ExpertList";

export type WorkspaceTab =
  | "patient"
  | "patients"
  | "doctors"
  | "experts"
  | "doctor"
  | "expert"
  | "lab"
  | "appointments"
  | "stats"
  | "skill"
  | "skills";

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
  const [skillsListData, setSkillsListData] =
    useState<SkillsListData | null>(null);
  const [patientListData, setPatientListData] =
    useState<PatientListData | null>(null);
  const [doctorListData, setDoctorListData] =
    useState<DoctorListData | null>(null);
  const [expertListData, setExpertListData] =
    useState<ExpertListData | null>(null);
  const [doctorData, setDoctorData] = useState<DoctorPublic | null>(null);
  const [expertData, setExpertData] = useState<ExpertPublic | null>(null);

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
        } else if (
          toolName === "list_patients" ||
          toolName === "delete_patient"
        ) {
          if (parsed?.error || !Array.isArray(parsed?.patients)) return;
          setPatientListData(parsed as PatientListData);
          setActiveTab("patients");
          setIsOpen(true);
        } else if (toolName === "list_doctors") {
          if (parsed?.error || !Array.isArray(parsed?.doctors)) return;
          setDoctorListData(parsed as DoctorListData);
          setActiveTab("doctors");
          setIsOpen(true);
        } else if (toolName === "list_experts") {
          if (parsed?.error || !Array.isArray(parsed?.experts)) return;
          setExpertListData(parsed as ExpertListData);
          setActiveTab("experts");
          setIsOpen(true);
        } else if (toolName === "get_doctor") {
          if (parsed?.error || !parsed?.id) return;
          setDoctorData(parsed as DoctorPublic);
          setActiveTab("doctor");
          setIsOpen(true);
        } else if (toolName === "get_expert") {
          if (parsed?.error || !parsed?.id) return;
          setExpertData(parsed as ExpertPublic);
          setActiveTab("expert");
          setIsOpen(true);
        } else if (toolName === "read_skill" || toolName === "write_skill") {
          if (parsed?.error || !parsed?.skill || !parsed?.content) return;
          setSkillData({ name: parsed.skill as string, content: parsed.content as string });
          setActiveTab("skill");
          setIsOpen(true);
        } else if (toolName === "delete_skill") {
          if (parsed?.error || !Array.isArray(parsed?.skills)) return;
          setSkillsListData({
            skills: parsed.skills as SkillsListData["skills"],
            deleted:
              typeof parsed.deleted === "string" ? parsed.deleted : undefined,
          });
          setActiveTab("skills");
          setIsOpen(true);
        } else if (toolName === "list_skills") {
          if (parsed?.error || !Array.isArray(parsed?.skills)) return;
          setSkillsListData({
            skills: parsed.skills as SkillsListData["skills"],
          });
          setActiveTab("skills");
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
    skillsListData,
    patientListData,
    doctorListData,
    expertListData,
    doctorData,
    expertData,
    openWorkspace,
    closeWorkspace,
    setTab,
    togglePanel,
  };
}

export type UseWorkspaceReturn = ReturnType<typeof useWorkspace>;
