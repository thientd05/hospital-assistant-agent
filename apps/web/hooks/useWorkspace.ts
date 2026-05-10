"use client";

import { useCallback, useRef, useState } from "react";
import type {
  PatientCreateInput,
  PatientPublic,
  ToolRefresh,
} from "@pr_hospitalagent/types";
import { patientsApi } from "@/hooks/usePatients";

type PatientFormVitalsPartial = NonNullable<PatientCreateInput["vitals"]>;

export type WorkspaceTab =
  | "patients"
  | "patient"
  | "lab"
  | "appointments"
  | "drug-check";

export const ROLE_TABS: Record<string, WorkspaceTab[]> = {
  doctor: ["patients", "patient", "lab", "appointments", "drug-check"],
  patient: [],
};

const REFRESH_TO_TAB: Partial<Record<Exclude<ToolRefresh, false>, WorkspaceTab>> = {
  patients: "patients",
  patient: "patient",
  lab: "lab",
  appointments: "appointments",
};

type Versions = Record<WorkspaceTab, number>;

const ZERO_VERSIONS: Versions = {
  patients: 0,
  patient: 0,
  lab: 0,
  appointments: 0,
  "drug-check": 0,
};

export type PatientFormValues = {
  name: string;
  age: string;
  gender: "Nam" | "Nữ";
  ward: string;
  medications: string;
  spO2: string;
  heartRate: string;
  bloodPressure: string;
  temperature: string;
};

const EMPTY_PATIENT_FORM: PatientFormValues = {
  name: "",
  age: "",
  gender: "Nam",
  ward: "",
  medications: "",
  spO2: "",
  heartRate: "",
  bloodPressure: "",
  temperature: "",
};

export type SubmitPatientResult =
  | { ok: true; patient: PatientPublic }
  | { ok: false; error: string };

export function useWorkspace() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("patients");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [versions, setVersions] = useState<Versions>(ZERO_VERSIONS);

  // Patient create-form state — controlled here so the agent (panel bridge)
  // and the doctor can both read/write. Refs kept in sync for synchronous
  // reads inside actions (avoids stale-closure issues).
  const [patientFormOpen, setPatientFormOpen] = useState(false);
  const [patientFormValues, setPatientFormValues] =
    useState<PatientFormValues>(EMPTY_PATIENT_FORM);
  const [patientFormSubmitting, setPatientFormSubmitting] = useState(false);
  const formOpenRef = useRef(false);
  const formValuesRef = useRef<PatientFormValues>(EMPTY_PATIENT_FORM);

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

  const openPatientForm = useCallback(
    (partial?: Partial<PatientFormValues>): PatientFormValues => {
      const next: PatientFormValues = {
        ...formValuesRef.current,
        ...(partial ?? {}),
      };
      formValuesRef.current = next;
      formOpenRef.current = true;
      setPatientFormValues(next);
      setPatientFormOpen(true);
      return next;
    },
    []
  );

  const closePatientForm = useCallback(() => {
    formValuesRef.current = EMPTY_PATIENT_FORM;
    formOpenRef.current = false;
    setPatientFormValues(EMPTY_PATIENT_FORM);
    setPatientFormOpen(false);
  }, []);

  const setPatientFormField = useCallback(
    <K extends keyof PatientFormValues>(
      key: K,
      value: PatientFormValues[K]
    ) => {
      const next = { ...formValuesRef.current, [key]: value };
      formValuesRef.current = next;
      setPatientFormValues(next);
    },
    []
  );

  const submitPatientForm = useCallback(async (): Promise<SubmitPatientResult> => {
    if (!formOpenRef.current) {
      return { ok: false, error: "Form chưa được mở." };
    }
    const v = formValuesRef.current;
    const hasAnyValue = [
      v.name,
      v.age,
      v.ward,
      v.medications,
      v.spO2,
      v.heartRate,
      v.bloodPressure,
      v.temperature,
    ].some((s) => s.trim().length > 0);
    if (!hasAnyValue) {
      return {
        ok: false,
        error: "Form trống — không có giá trị nào để lưu.",
      };
    }
    const ageNum = Number(v.age);
    if (
      !v.name.trim() ||
      !v.ward.trim() ||
      !Number.isInteger(ageNum) ||
      ageNum < 0
    ) {
      return {
        ok: false,
        error:
          "Field bắt buộc thiếu hoặc sai: cần Họ tên, Khoa, và Tuổi (số nguyên ≥ 0).",
      };
    }

    const vitals: Record<string, number | string> = {};
    if (v.spO2.trim()) {
      const n = Number(v.spO2);
      if (Number.isFinite(n)) vitals.spO2 = n;
    }
    if (v.heartRate.trim()) {
      const n = Number(v.heartRate);
      if (Number.isFinite(n)) vitals.heartRate = n;
    }
    if (v.bloodPressure.trim()) vitals.bloodPressure = v.bloodPressure.trim();
    if (v.temperature.trim()) {
      const n = Number(v.temperature);
      if (Number.isFinite(n)) vitals.temperature = n;
    }

    setPatientFormSubmitting(true);
    try {
      const created = await patientsApi.create({
        name: v.name.trim(),
        age: ageNum,
        gender: v.gender,
        ward: v.ward.trim(),
        medications: v.medications
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        ...(Object.keys(vitals).length > 0
          ? { vitals: vitals as PatientFormVitalsPartial }
          : {}),
      });
      formValuesRef.current = EMPTY_PATIENT_FORM;
      formOpenRef.current = false;
      setPatientFormValues(EMPTY_PATIENT_FORM);
      setPatientFormOpen(false);
      bumpTab("patients");
      return { ok: true, patient: created };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    } finally {
      setPatientFormSubmitting(false);
    }
  }, [bumpTab]);

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
    // patient create form
    patientFormOpen,
    patientFormValues,
    patientFormSubmitting,
    openPatientForm,
    closePatientForm,
    setPatientFormField,
    submitPatientForm,
  };
}

export type UseWorkspaceReturn = ReturnType<typeof useWorkspace>;
