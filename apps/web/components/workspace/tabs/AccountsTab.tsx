"use client";

import { useMemo, useState } from "react";
import type { DoctorPublic, ExpertPublic } from "@pr_hospitalagent/types";
import { useDoctors, doctorsApi } from "@/hooks/useDoctors";
import { useExperts, expertsApi } from "@/hooks/useExperts";
import { usePatients } from "@/hooks/usePatients";
import { DoctorForm } from "../forms/DoctorForm";
import { ExpertForm } from "../forms/ExpertForm";

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

type AccountKind = "doctor" | "expert" | "patient";
type RoleFilter = "all" | AccountKind;

type Account = {
  kind: AccountKind;
  id: string;
  name: string;
  subtitle: string;
  phone?: string;
  email?: string;
  tags: string[];
};

const ROLE_META: Record<
  AccountKind,
  { label: string; badge: string; dot: string; ring: string }
> = {
  doctor: {
    label: "Bác sĩ",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
    ring: "border-sky-200",
  },
  expert: {
    label: "Chuyên gia",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
    ring: "border-violet-200",
  },
  patient: {
    label: "Bệnh nhân",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    ring: "border-amber-200",
  },
};

export function AccountsTab({ version, active, onChanged }: Props) {
  const doctors = useDoctors(version, active);
  const experts = useExperts(version, active);
  const patients = usePatients(version, active);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState<"doctor" | "expert" | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<DoctorPublic | null>(null);
  const [editingExpert, setEditingExpert] = useState<ExpertPublic | null>(null);

  const accounts = useMemo<Account[]>(() => {
    const list: Account[] = [];
    for (const d of doctors.data?.doctors ?? []) {
      list.push({
        kind: "doctor",
        id: d.id,
        name: `${d.title} ${d.fullName}`.trim(),
        subtitle: [d.department, d.specialty].filter(Boolean).join(" · "),
        phone: d.phone,
        email: d.email,
        tags: [],
      });
    }
    for (const e of experts.data?.experts ?? []) {
      list.push({
        kind: "expert",
        id: e.id,
        name: `${e.title} ${e.fullName}`.trim(),
        subtitle: e.expertise,
        phone: e.phone,
        email: e.email,
        tags: [],
      });
    }
    for (const p of patients.data?.patients ?? []) {
      list.push({
        kind: "patient",
        id: p.id,
        name: p.name,
        subtitle: `${p.gender} · ${p.age} tuổi · ${p.ward}`,
        tags: p.diagnoses,
      });
    }
    return list;
  }, [doctors.data, experts.data, patients.data]);

  const counts = useMemo(
    () => ({
      all: accounts.length,
      doctor: accounts.filter((a) => a.kind === "doctor").length,
      expert: accounts.filter((a) => a.kind === "expert").length,
      patient: accounts.filter((a) => a.kind === "patient").length,
    }),
    [accounts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (roleFilter !== "all" && a.kind !== roleFilter) return false;
      if (!q) return true;
      return (
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        (a.phone ?? "").toLowerCase().includes(q) ||
        (a.email ?? "").toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [accounts, query, roleFilter]);

  const loading = doctors.loading || experts.loading || patients.loading;
  const error = doctors.error || experts.error || patients.error;

  function refetchAll() {
    doctors.refetch();
    experts.refetch();
    patients.refetch();
  }

  async function handleDelete(kind: "doctor" | "expert", id: string) {
    const label = ROLE_META[kind].label.toLowerCase();
    if (!confirm(`Xoá ${label} ${id}?`)) return;
    setBusy(id);
    try {
      await (kind === "doctor" ? doctorsApi : expertsApi).remove(id);
      refetchAll();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function openEdit(kind: "doctor" | "expert", id: string) {
    try {
      const { http } = await import("@/lib/apiClient");
      if (kind === "doctor") {
        setEditingDoctor(await http.get<DoctorPublic>(`/api/doctors/${id}`));
      } else {
        setEditingExpert(await http.get<ExpertPublic>(`/api/experts/${id}`));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  const FILTERS: { key: RoleFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "doctor", label: ROLE_META.doctor.label },
    { key: "expert", label: ROLE_META.expert.label },
    { key: "patient", label: ROLE_META.patient.label },
  ];

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên, mã, khoa, lĩnh vực, SĐT, email…"
          className="flex-1 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#087E8B]"
        />
        <button
          type="button"
          onClick={() => setShowCreate("doctor")}
          className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671] whitespace-nowrap"
        >
          + Bác sĩ
        </button>
        <button
          type="button"
          onClick={() => setShowCreate("expert")}
          className="text-sm px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700 whitespace-nowrap"
        >
          + Chuyên gia
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const isActive = roleFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setRoleFilter(f.key)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isActive
                  ? "border-[#087E8B] bg-[#C8E7E9] text-[#066671] font-medium"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.key !== "all" && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ROLE_META[f.key].dot
                  }`}
                />
              )}
              {f.label}
              <span className="tabular-nums text-gray-400">
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
        {filtered.length} / {counts.all} tài khoản
      </div>

      <ul className="space-y-2">
        {filtered.map((a) => {
          const meta = ROLE_META[a.kind];
          const editable = a.kind === "patient" ? null : a.kind;
          return (
            <li
              key={`${a.kind}:${a.id}`}
              className={`rounded-lg border-l-4 ${meta.ring} border border-gray-200 px-3 py-2.5 hover:bg-gray-50`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-sm text-gray-900 font-medium truncate">
                    {a.name}
                  </span>
                </div>
                <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums">
                  {a.id}
                </span>
              </div>
              {a.subtitle && (
                <div className="mt-0.5 text-xs text-gray-500">{a.subtitle}</div>
              )}
              {a.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {a.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-[#C8E7E9] text-[#087E8B]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {(a.phone || a.email) && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                  {a.phone && <span>📞 {a.phone}</span>}
                  {a.email && <span>✉ {a.email}</span>}
                </div>
              )}
              {editable && (
                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(editable, a.id)}
                    className="text-[11px] px-2 py-1 rounded-md border border-[#C8E7E9] text-[#087E8B] hover:bg-[#C8E7E9]"
                  >
                    Chi tiết
                  </button>
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => handleDelete(editable, a.id)}
                    className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy === a.id ? "Đang xoá…" : "Xoá"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {showCreate === "doctor" && (
        <DoctorForm
          onClose={() => setShowCreate(null)}
          onSaved={() => {
            setShowCreate(null);
            refetchAll();
            onChanged();
          }}
        />
      )}
      {showCreate === "expert" && (
        <ExpertForm
          onClose={() => setShowCreate(null)}
          onSaved={() => {
            setShowCreate(null);
            refetchAll();
            onChanged();
          }}
        />
      )}
      {editingDoctor && (
        <DoctorForm
          editId={editingDoctor.id}
          initial={editingDoctor}
          onClose={() => setEditingDoctor(null)}
          onSaved={() => {
            setEditingDoctor(null);
            refetchAll();
            onChanged();
          }}
        />
      )}
      {editingExpert && (
        <ExpertForm
          editId={editingExpert.id}
          initial={editingExpert}
          onClose={() => setEditingExpert(null)}
          onSaved={() => {
            setEditingExpert(null);
            refetchAll();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

