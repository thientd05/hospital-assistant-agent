"use client";

import { useEffect, useState } from "react";
import type { PatientPublic } from "@pr_hospitalagent/types";
import { findLabEntry } from "@pr_hospitalagent/types";
import { usePatient, useLabs, patientsApi } from "@/hooks/usePatients";
import { useMyLabs } from "@/hooks/useMyLabs";
import { useMedications } from "@/hooks/useMedications";
import { useLabCatalog } from "@/hooks/useLabCatalog";
import { MedicationPicker } from "@/components/workspace/MedicationPicker";
import { http } from "@/lib/apiClient";
import { useAuth } from "@/app/providers/AuthProvider";

// Tách chuỗi thuốc (phân tách dấu phẩy) ↔ mảng tên, dùng chung cho draft + picker.
function splitMeds(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// Hai tập quyền sửa RỜI NHAU (không giao). Mã BN (id) không ai sửa.
// Bệnh nhân (selfMode) — thông tin cá nhân, khớp PatientProfileSchema backend.
const SELF_EDITABLE = new Set(["name", "age", "gender", "address", "phone"]);
// Bác sĩ — phần lâm sàng, khớp PatientUpdateSchema backend.
const DOCTOR_EDITABLE = new Set([
  "ward",
  "diagnoses",
  "medications",
  "spO2",
  "heartRate",
  "bloodPressure",
  "temperature",
]);

// Danh sách khoa cố định (khớp seed) cho dropdown khi bác sĩ sửa hồ sơ.
const WARDS = [
  "Nội Tim mạch",
  "Nội Tổng quát",
  "Nội Thận",
  "Hô hấp",
  "Tiêu hóa",
  "Thần kinh",
  "Truyền nhiễm",
  "Cấp cứu",
  "Sản",
  "Nhi",
];

type SelfProfileResponse = { role: "patient"; patient: PatientPublic };

type Props = {
  patientId: string | null;
  version: number;
  active: boolean;
  onChanged: () => void;
  // selfMode: bệnh nhân tự xem hồ sơ CỦA MÌNH (lấy từ /auth/me) — chỉ xem, ẩn nút Sửa.
  selfMode?: boolean;
  // onBack: hồ sơ gộp trong tab Bệnh nhân (bác sĩ) → nút "← Danh sách" quay về danh sách.
  onBack?: () => void;
};

type Draft = {
  name: string;
  age: string;
  gender: "Nam" | "Nữ";
  ward: string;
  address: string;
  phone: string;
  diagnoses: string;
  medications: string;
  spO2: string;
  heartRate: string;
  bloodPressure: string;
  temperature: string;
};

function toDraft(p: PatientPublic): Draft {
  return {
    name: p.name,
    age: String(p.age),
    gender: p.gender,
    ward: p.ward,
    address: p.address ?? "",
    phone: p.phone ?? "",
    diagnoses: p.diagnoses.join(", "),
    medications: p.medications.join(", "),
    spO2: String(p.vitals.spO2),
    heartRate: String(p.vitals.heartRate),
    bloodPressure: p.vitals.bloodPressure?.trim() ? p.vitals.bloodPressure : "0",
    temperature: String(p.vitals.temperature),
  };
}

function isVitalAbnormal(key: "spO2" | "heartRate", value: number) {
  if (key === "spO2") return value < 95;
  if (key === "heartRate") return value > 100 || value < 60;
  return false;
}

export function PatientDetailTab({
  patientId,
  version,
  active,
  onChanged,
  selfMode = false,
  onBack,
}: Props) {
  const { patient: authPatient, updateAccount } = useAuth();
  const fetched = usePatient(patientId, version, active && !selfMode);
  const data = selfMode ? authPatient : fetched.data;
  const loading = selfMode ? false : fetched.loading;
  const error = selfMode ? null : fetched.error;
  const refetch = fetched.refetch;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [medPickerOpen, setMedPickerOpen] = useState(false);
  // Danh mục thuốc — nạp lười: chỉ khi bác sĩ vào chế độ sửa (không ở selfMode).
  const meds = useMedications(!selfMode && editing);
  // Danh mục xét nghiệm nạp từ Mongo (qua REST) — chỉ khi bác sĩ vào chế độ sửa.
  const labCatalog = useLabCatalog(!selfMode && editing);
  const catalog = labCatalog.data?.catalog ?? [];
  // Xét nghiệm — gộp vào tab Hồ sơ cho cả bác sĩ lẫn bệnh nhân. Bác sĩ đọc qua
  // /patients/:id/labs (sửa được); bệnh nhân đọc CỦA MÌNH qua /me/labs (chỉ xem).
  const doctorLabs = useLabs(patientId, version, active && !selfMode);
  const selfLabs = useMyLabs(version, active && selfMode);
  const labsRes = selfMode ? selfLabs : doctorLabs;
  const labs = labsRes.data?.labResults ?? [];
  // Chỉ bác sĩ sửa được xét nghiệm; bệnh nhân luôn xem (kể cả khi đang sửa hồ sơ).
  const labEditing = editing && !selfMode;
  // Dòng xét nghiệm thêm mới (staged) + chỉ số xét nghiệm cũ đánh dấu xoá — chỉ
  // commit khi bấm "Lưu" cùng phần lâm sàng.
  const [newLabs, setNewLabs] = useState<{ name: string; value: string }[]>([]);
  const [removeLabIdx, setRemoveLabIdx] = useState<Set<number>>(new Set());

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setEditError(null);
    setMedPickerOpen(false);
    setNewLabs([]);
    setRemoveLabIdx(new Set());
  }, [patientId]);

  if (!selfMode && !patientId) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">
        Chọn một bệnh nhân từ tab <span className="font-medium">Bệnh nhân</span>{" "}
        để xem hồ sơ.
      </div>
    );
  }
  if (loading) {
    return (
      <div className="px-5 py-8 text-sm text-gray-400 text-center">Đang tải…</div>
    );
  }
  if (error) {
    return (
      <div className="px-5 py-4 text-sm text-red-600">
        {error}
      </div>
    );
  }
  if (!data) return null;

  function startEdit() {
    if (!data) return;
    setDraft(toDraft(data));
    setEditError(null);
    setEditing(true);
    // Một dòng xét nghiệm rỗng sẵn sàng để nhập (chỉ bác sĩ dùng).
    setNewLabs([{ name: "", value: "" }]);
    setRemoveLabIdx(new Set());
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
    setEditError(null);
    setMedPickerOpen(false);
    setNewLabs([]);
    setRemoveLabIdx(new Set());
  }

  // Chuẩn hoá danh sách dòng nhập: bỏ các dòng rỗng ở CUỐI (vd vừa xoá nội dung
  // dòng cuối → thu lại dòng đã nở thêm), rồi nếu dòng cuối điền đủ tên + giá trị
  // thì nở thêm MỘT dòng rỗng để bác sĩ nhập tiếp. Luôn còn ít nhất 1 dòng.
  function normalizeLabRows(rows: { name: string; value: string }[]) {
    const r = [...rows];
    while (r.length && !r[r.length - 1].name && !r[r.length - 1].value.trim())
      r.pop();
    if (r.length === 0) return [{ name: "", value: "" }];
    const last = r[r.length - 1];
    if (last.name && last.value.trim()) r.push({ name: "", value: "" });
    return r;
  }
  function updateLabRow(i: number, key: "name" | "value", value: string) {
    setNewLabs((prev) =>
      normalizeLabRows(prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))
    );
  }
  function removeLabRow(i: number) {
    setNewLabs((prev) =>
      normalizeLabRows(prev.filter((_, idx) => idx !== i))
    );
  }
  function toggleRemoveLab(i: number) {
    setRemoveLabIdx((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  // Hai tập rời nhau: bệnh nhân sửa thông tin cá nhân, bác sĩ sửa phần lâm sàng.
  const canEdit = (field: string) =>
    selfMode ? SELF_EDITABLE.has(field) : DOCTOR_EDITABLE.has(field);

  // Bệnh nhân tự sửa hồ sơ mình → endpoint /auth/me/profile, chỉ 5 trường.
  async function handleSelfSave() {
    if (!draft || !data) return;
    const ageNum = Number(draft.age);
    if (!draft.name.trim() || !Number.isInteger(ageNum) || ageNum < 0) {
      setEditError("Vui lòng nhập đủ Họ tên và Tuổi (số nguyên ≥ 0).");
      return;
    }
    const body = {
      name: draft.name.trim(),
      age: ageNum,
      gender: draft.gender,
      address: draft.address.trim(),
      phone: draft.phone.trim(),
    };
    setSubmitting(true);
    setEditError(null);
    try {
      const res = await http.patch<SelfProfileResponse>(
        "/api/auth/me/profile",
        body
      );
      updateAccount({ role: "patient", patient: res.patient });
      setEditing(false);
      setDraft(null);
      onChanged();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // Bác sĩ chỉ sửa phần lâm sàng: Khoa, chẩn đoán, thuốc, sinh hiệu.
  // (Thông tin cá nhân do bệnh nhân tự sửa qua handleSelfSave.)
  async function handleSave() {
    if (selfMode) return handleSelfSave();
    if (!draft || !data) return;
    const spO2Num = Number(draft.spO2);
    const heartRateNum = Number(draft.heartRate);
    const temperatureNum = Number(draft.temperature);
    if (
      !Number.isFinite(spO2Num) ||
      !Number.isFinite(heartRateNum) ||
      !Number.isFinite(temperatureNum)
    ) {
      setEditError("Sinh hiệu phải là số hợp lệ.");
      return;
    }
    // Bỏ dòng xét nghiệm rỗng hoàn toàn; dòng điền dở (thiếu tên hoặc giá trị) → báo lỗi.
    const cleanedNewLabs = newLabs.filter((r) => r.name || r.value.trim());
    if (cleanedNewLabs.some((r) => !r.name || !r.value.trim())) {
      setEditError("Mỗi dòng xét nghiệm mới cần chọn tên và nhập kết quả.");
      return;
    }
    const body = {
      // ward min(1) ở backend — chỉ gửi khi có giá trị (BN tự đăng ký ban đầu trống).
      ...(draft.ward.trim() ? { ward: draft.ward.trim() } : {}),
      diagnoses: draft.diagnoses
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      medications: draft.medications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      vitals: {
        spO2: spO2Num,
        heartRate: heartRateNum,
        bloodPressure: draft.bloodPressure.trim(),
        temperature: temperatureNum,
      },
    };
    setSubmitting(true);
    setEditError(null);
    try {
      await patientsApi.update(data.id, body);
      // Xoá theo index giảm dần để index không xô lệch giữa các lần xoá.
      const dels = [...removeLabIdx].sort((a, b) => b - a);
      for (const idx of dels) await patientsApi.removeLab(data.id, idx);
      for (const r of cleanedNewLabs)
        await patientsApi.addLab(data.id, { name: r.name, value: r.value.trim() });
      setEditing(false);
      setDraft(null);
      setNewLabs([]);
      setRemoveLabIdx(new Set());
      labsRes.refetch();
      refetch();
      onChanged();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 py-4 text-sm">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          data-agent-ref="patient-detail:back"
          data-agent-role="button"
          data-agent-label="Quay lại danh sách bệnh nhân"
          className="mb-3 inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border border-[#C8E7E9] text-[#087E8B] hover:bg-[#C8E7E9]"
        >
          ← Danh sách
        </button>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-lg font-semibold text-gray-900">{data.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {data.gender} · {data.age} tuổi · {data.ward}
          </div>
        </div>
        {editing ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={submitting}
              data-agent-ref="patient-detail:cancel"
              data-agent-role="button"
              data-agent-label="Huỷ sửa hồ sơ"
              className="text-[11px] px-2.5 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              data-agent-ref="patient-detail:save"
              data-agent-role="button"
              data-agent-label="Lưu hồ sơ"
              data-agent-busy={submitting ? "true" : undefined}
              className="text-[11px] px-2.5 py-1 rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
            >
              {submitting ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            data-agent-ref="patient-detail:edit"
            data-agent-role="button"
            data-agent-label="Sửa hồ sơ"
            className="text-[11px] px-2.5 py-1 rounded-md border border-[#C8E7E9] text-[#087E8B] hover:bg-[#C8E7E9]"
          >
            Sửa
          </button>
        )}
      </div>

      <SectionLabel>Thông tin</SectionLabel>
      <InfoRow label="Họ tên">
        {editing && draft && canEdit("name") ? (
          <input
            value={draft.name}
            onChange={(e) => updateDraft("name", e.target.value)}
            className={INLINE_INPUT}
            data-agent-ref="patient-detail:name"
            data-agent-role="textbox"
            data-agent-label="Họ tên"
          />
        ) : (
          <ValueText>{data.name}</ValueText>
        )}
      </InfoRow>
      <InfoRow label="Tuổi">
        {editing && draft && canEdit("age") ? (
          <input
            type="number"
            min={0}
            value={draft.age}
            onChange={(e) => updateDraft("age", e.target.value)}
            className={INLINE_INPUT}
            data-agent-ref="patient-detail:age"
            data-agent-role="textbox"
            data-agent-label="Tuổi"
          />
        ) : (
          <ValueText>{data.age}</ValueText>
        )}
      </InfoRow>
      <InfoRow label="Giới tính">
        {editing && draft && canEdit("gender") ? (
          <select
            value={draft.gender}
            onChange={(e) =>
              updateDraft("gender", e.target.value as "Nam" | "Nữ")
            }
            className={INLINE_SELECT}
            data-agent-ref="patient-detail:gender"
            data-agent-role="combobox"
            data-agent-label="Giới tính"
          >
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        ) : (
          <ValueText>{data.gender}</ValueText>
        )}
      </InfoRow>
      <InfoRow label="Mã BN">
        <ValueText>{data.id}</ValueText>
      </InfoRow>
      <InfoRow label="Khoa">
        {editing && draft && canEdit("ward") ? (
          <select
            value={draft.ward}
            onChange={(e) => updateDraft("ward", e.target.value)}
            className={INLINE_SELECT}
            data-agent-ref="patient-detail:ward"
            data-agent-role="combobox"
            data-agent-label="Khoa"
          >
            <option value="">— Chưa phân khoa —</option>
            {/* Giữ giá trị hiện tại nếu nằm ngoài danh sách cố định. */}
            {draft.ward && !WARDS.includes(draft.ward) && (
              <option value={draft.ward}>{draft.ward}</option>
            )}
            {WARDS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        ) : (
          <ValueText>{data.ward || "—"}</ValueText>
        )}
      </InfoRow>
      <InfoRow label="Địa chỉ" top valueClassName={editing ? "ml-[3ch]" : ""}>
        {editing && draft && canEdit("address") ? (
          <input
            value={draft.address}
            onChange={(e) => updateDraft("address", e.target.value)}
            className={INLINE_INPUT}
            data-agent-ref="patient-detail:address"
            data-agent-role="textbox"
            data-agent-label="Địa chỉ"
          />
        ) : (
          <ValueText>{data.address || "—"}</ValueText>
        )}
      </InfoRow>
      <InfoRow label="Điện thoại">
        {editing && draft && canEdit("phone") ? (
          <input
            value={draft.phone}
            onChange={(e) => updateDraft("phone", e.target.value)}
            className={INLINE_INPUT}
            data-agent-ref="patient-detail:phone"
            data-agent-role="textbox"
            data-agent-label="Điện thoại"
          />
        ) : (
          <ValueText>{data.phone || "—"}</ValueText>
        )}
      </InfoRow>

      <SectionLabel>Sinh hiệu</SectionLabel>
      <InfoRow label="SpO2">
        {editing && draft && canEdit("spO2") ? (
          <>
            <input
              type="number"
              step="0.1"
              value={draft.spO2}
              onChange={(e) => updateDraft("spO2", e.target.value)}
              className={INLINE_INPUT}
              data-agent-ref="patient-detail:spO2"
              data-agent-role="textbox"
              data-agent-label="SpO2"
            />
            <UnitText>%</UnitText>
          </>
        ) : (
          <VitalValue
            value={data.vitals.spO2}
            unit="%"
            abnormal={isVitalAbnormal("spO2", data.vitals.spO2)}
          />
        )}
      </InfoRow>
      <InfoRow label="Nhịp tim">
        {editing && draft && canEdit("heartRate") ? (
          <>
            <input
              type="number"
              value={draft.heartRate}
              onChange={(e) => updateDraft("heartRate", e.target.value)}
              className={INLINE_INPUT}
              data-agent-ref="patient-detail:heartRate"
              data-agent-role="textbox"
              data-agent-label="Nhịp tim"
            />
            <UnitText>bpm</UnitText>
          </>
        ) : (
          <VitalValue
            value={data.vitals.heartRate}
            unit="bpm"
            abnormal={isVitalAbnormal("heartRate", data.vitals.heartRate)}
          />
        )}
      </InfoRow>
      <InfoRow label="Huyết áp">
        {editing && draft && canEdit("bloodPressure") ? (
          <>
            <input
              value={draft.bloodPressure}
              onChange={(e) => updateDraft("bloodPressure", e.target.value)}
              className={INLINE_INPUT}
              data-agent-ref="patient-detail:bloodPressure"
              data-agent-role="textbox"
              data-agent-label="Huyết áp"
            />
            <UnitText>mmHg</UnitText>
          </>
        ) : (
          <VitalValue value={data.vitals.bloodPressure} unit="mmHg" />
        )}
      </InfoRow>
      <InfoRow label="Nhiệt độ">
        {editing && draft && canEdit("temperature") ? (
          <>
            <input
              type="number"
              step="0.1"
              value={draft.temperature}
              onChange={(e) => updateDraft("temperature", e.target.value)}
              className={INLINE_INPUT}
              data-agent-ref="patient-detail:temperature"
              data-agent-role="textbox"
              data-agent-label="Nhiệt độ"
            />
            <UnitText>°C</UnitText>
          </>
        ) : (
          <VitalValue value={data.vitals.temperature} unit="°C" />
        )}
      </InfoRow>

      {/* Xét nghiệm — nằm giữa Sinh hiệu và Chẩn đoán. KHÔNG đặt tiêu đề riêng
          (trùng với cột "Xét nghiệm" của bảng). Bác sĩ sửa được; BN chỉ xem. */}
      <div className="mt-5">
          {labsRes.loading ? (
            <div className="text-xs text-gray-400">Đang tải…</div>
          ) : labs.length === 0 && !labEditing ? (
            <div className="text-xs text-gray-400">Chưa có kết quả xét nghiệm.</div>
          ) : (
            <div className="text-sm">
              <div className="grid grid-cols-12 gap-1 text-[11px] uppercase tracking-wider text-gray-400 font-medium pb-1.5 border-b border-gray-200">
                <div className="col-span-4">Xét nghiệm</div>
                <div className="col-span-3">Kết quả</div>
                <div className="col-span-2">Đơn vị</div>
                <div
                  className={`${labEditing ? "col-span-2" : "col-span-3"} text-center`}
                >
                  Tham chiếu
                </div>
                {labEditing && <div className="col-span-1" />}
              </div>
              <div className="divide-y divide-gray-100">
                {labs.map((r, i) => {
                  const marked = removeLabIdx.has(i);
                  return (
                    <div
                      key={`${r.name}-${i}`}
                      className={`grid grid-cols-12 gap-1 py-2 items-center ${
                        r.isAbnormal ? "bg-red-50/60 -mx-2 px-2 rounded" : ""
                      } ${marked ? "opacity-40 line-through" : ""}`}
                    >
                      <div className="col-span-4 text-gray-800 truncate">
                        {r.name}
                      </div>
                      <div
                        className={`col-span-3 font-medium truncate ${
                          r.isAbnormal ? "text-red-700" : "text-gray-900"
                        }`}
                      >
                        {r.value}
                      </div>
                      <div className="col-span-2 text-gray-500 truncate">
                        {r.unit || "—"}
                      </div>
                      <div
                        className={`${
                          labEditing ? "col-span-2" : "col-span-3"
                        } text-gray-500 text-xs truncate text-center`}
                      >
                        {r.referenceRange}
                      </div>
                      {labEditing && (
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => toggleRemoveLab(i)}
                            data-agent-ref={`patient-detail:lab-${i}:remove`}
                            data-agent-role="button"
                            data-agent-label={`${
                              marked ? "Khôi phục" : "Xoá"
                            } xét nghiệm ${r.name}`}
                            aria-label={marked ? "Khôi phục" : "Xoá"}
                            className="w-5 h-5 rounded flex items-center justify-center text-red-600 hover:bg-red-50 text-sm leading-none"
                          >
                            {marked ? "↺" : "×"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {labEditing &&
                  newLabs.map((row, i) => {
                    const entry = row.name ? findLabEntry(catalog, row.name) : undefined;
                    const filled = Boolean(row.name) || row.value.trim() !== "";
                    return (
                      <div
                        key={`new-${i}`}
                        className="grid grid-cols-12 gap-1 py-2 items-center"
                      >
                        <div className="col-span-4">
                          <select
                            value={row.name}
                            onChange={(e) =>
                              updateLabRow(i, "name", e.target.value)
                            }
                            className="ws-input-sm w-full"
                            data-agent-ref={`patient-detail:lab-new-${i}:name`}
                            data-agent-role="combobox"
                            data-agent-label="Tên xét nghiệm"
                          >
                            <option value="">— Chọn —</option>
                            {catalog.map((e) => (
                              <option key={e.name} value={e.name}>
                                {e.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <input
                            value={row.value}
                            onChange={(e) =>
                              updateLabRow(i, "value", e.target.value)
                            }
                            placeholder={entry?.normal ? entry.normal : "Giá trị"}
                            className="ws-input-sm w-full"
                            data-agent-ref={`patient-detail:lab-new-${i}:value`}
                            data-agent-role="textbox"
                            data-agent-label="Kết quả xét nghiệm"
                          />
                        </div>
                        <div className="col-span-2 text-gray-500 text-xs truncate">
                          {entry?.unit || "—"}
                        </div>
                        <div className="col-span-2 text-gray-500 text-xs truncate text-center">
                          {entry?.referenceRange || "—"}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          {filled && (
                            <button
                              type="button"
                              onClick={() => removeLabRow(i)}
                              data-agent-ref={`patient-detail:lab-new-${i}:remove`}
                              data-agent-role="button"
                              data-agent-label="Bỏ dòng xét nghiệm"
                              aria-label="Bỏ dòng"
                              className="w-5 h-5 rounded flex items-center justify-center text-red-600 hover:bg-red-50 text-sm leading-none"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
      </div>

      <SectionLabel>Chẩn đoán</SectionLabel>
      {editing && draft && canEdit("diagnoses") ? (
        <input
          value={draft.diagnoses}
          onChange={(e) => updateDraft("diagnoses", e.target.value)}
          placeholder="Phân tách bằng dấu phẩy"
          className="ws-input-sm w-full !text-[#087E8B]"
          data-agent-ref="patient-detail:diagnoses"
          data-agent-role="textbox"
          data-agent-label="Chẩn đoán"
        />
      ) : data.diagnoses.length === 0 ? (
        <div className="text-xs text-gray-400">Chưa có chẩn đoán.</div>
      ) : (
        <ul className="space-y-1">
          {data.diagnoses.map((d) => (
            <li key={d} className="text-gray-900">
              • {d}
            </li>
          ))}
        </ul>
      )}

      <SectionLabel>Thuốc</SectionLabel>
      {editing && draft && canEdit("medications") ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setMedPickerOpen(true)}
            data-agent-ref="patient-detail:medications-open"
            data-agent-role="button"
            data-agent-label="Chọn thuốc"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#087E8B] text-white hover:bg-[#066671]"
          >
            <span className="text-sm leading-none">＋</span> Chọn thuốc
          </button>
          {splitMeds(draft.medications).length === 0 ? (
            <div className="text-xs text-gray-400">Chưa kê thuốc.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {splitMeds(draft.medications).map((m) => (
                <span
                  key={m}
                  className="text-xs px-2 py-1 rounded-full bg-[#C8E7E9] text-[#087E8B]"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : data.medications.length === 0 ? (
        <div className="text-xs text-gray-400">Chưa kê thuốc.</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {data.medications.map((m) => (
            <span
              key={m}
              className="text-xs px-2 py-1 rounded-full bg-[#C8E7E9] text-[#087E8B]"
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {editing && draft && canEdit("medications") && (
        <MedicationPicker
          open={medPickerOpen}
          catalog={meds.data?.medications ?? []}
          initialSelected={splitMeds(draft.medications)}
          onSave={(names) => {
            updateDraft("medications", names.join(", "));
            setMedPickerOpen(false);
          }}
          onClose={() => setMedPickerOpen(false)}
        />
      )}

      {editing && editError && (
        <div
          className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          data-agent-ref="patient-detail:error"
          data-agent-role="alert"
          data-agent-label="Lỗi sửa hồ sơ"
        >
          {editError}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mt-5 mb-2">
      {children}
    </div>
  );
}

// Sửa tại chỗ: giữ y nguyên kiểu chữ + vị trí của giá trị, chỉ thêm gạch chân
// nét liền để đánh dấu edit được — KHÔNG vẽ ô (tránh xô lệch layout).
// field-sizing:content → ô (và gạch chân) co đúng bằng độ dài giá trị đang gõ.
// [appearance:textfield] + ẩn spin-button → bỏ mũi tên tăng/giảm ở input số.
const INLINE_INPUT =
  "min-w-[2ch] text-right text-sm text-[#087E8B] font-medium bg-transparent px-0 py-0 outline-none border-0 border-b border-solid border-gray-300 focus:border-[#087E8B] [field-sizing:content] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// Select sửa tại chỗ — KHÔNG gạch chân, giữ mũi tên native. field-sizing:content
// → hộp co đúng theo giá trị đang chọn nên chữ nằm sát mũi tên (không bị độn theo
// option rộng nhất). Chỉ danh sách option khi mở mới căn trái.
const INLINE_SELECT =
  "min-w-0 text-right text-sm text-[#087E8B] font-medium bg-transparent px-0 py-0 outline-none border-0 cursor-pointer [field-sizing:content] [&>option]:text-left [&>option]:text-gray-900";

// Hàng nhãn-trái / giá trị (hoặc ô sửa) -phải — dùng chung cho cả xem lẫn sửa.
function InfoRow({
  label,
  children,
  // top: căn nhãn theo dòng ĐẦU của giá trị (cho giá trị nhiều dòng như địa chỉ).
  top = false,
  valueClassName = "",
}: {
  label: string;
  children: React.ReactNode;
  top?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={`flex justify-between text-sm py-1 gap-3 ${
        top ? "items-start" : "items-center"
      }`}
    >
      <span className="text-gray-500 shrink-0">{label}</span>
      <div
        className={`flex justify-end gap-1 min-w-0 ${
          top ? "items-start" : "items-center"
        } ${valueClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

function ValueText({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-gray-900 font-medium text-right">{children}</span>
  );
}

function UnitText({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-gray-500 shrink-0">{children}</span>;
}

function VitalValue({
  value,
  unit,
  abnormal,
}: {
  value: string | number;
  unit: string;
  abnormal?: boolean;
}) {
  return (
    <span
      className={
        abnormal
          ? "px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium text-xs"
          : "text-gray-900 font-medium"
      }
    >
      {value} {unit}
    </span>
  );
}
