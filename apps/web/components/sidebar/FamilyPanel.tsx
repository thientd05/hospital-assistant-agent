"use client";

import { useEffect, useState } from "react";
import type {
  FamilyMemberDetail,
  FamilyMemberSummary,
  LabResult,
  Prescription,
} from "@pr_hospitalagent/types";
import { ApiError } from "@/lib/apiClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { useMyFamily, useFamilyInvites, familyApi } from "@/hooks/useFamily";

function errMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Đã có lỗi xảy ra.";
}

export function FamilyPanel() {
  const { account } = useAuth();
  const myId = account?.role === "patient" ? account.patient.id : null;

  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const family = useMyFamily(version);
  const invites = useFamilyInvites(version);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Trạng thái tìm kiếm — khi đang tìm (ô có chữ), tạm ẩn thành viên gia đình.
  const [query, setQuery] = useState("");
  const searchMode = query.trim().length > 0;

  // Khi data nhóm thay đổi mà thành viên đang xem không còn → đóng chi tiết.
  useEffect(() => {
    if (!selectedMemberId) return;
    const fam = family.data;
    if (fam && !fam.members.some((m) => m.id === selectedMemberId)) {
      setSelectedMemberId(null);
    }
  }, [family.data, selectedMemberId]);

  if (selectedMemberId) {
    return (
      <MemberDetail
        memberId={selectedMemberId}
        onBack={() => setSelectedMemberId(null)}
      />
    );
  }

  const loading = family.loading && !family.data;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900">Gia đình</h3>
        <p className="text-xs text-gray-500 mt-1">
          Kết nối người nhà để cùng theo dõi hồ sơ và kết quả khám của nhau. Mỗi
          người chỉ thuộc một gia đình. Thành viên không thấy lịch hẹn của nhau.
        </p>
      </div>

      {/* Thanh tìm kiếm — luôn ở trên cùng */}
      <SearchSection
        query={query}
        setQuery={setQuery}
        onInvited={refresh}
      />

      {/* Đang tìm → chỉ hiện kết quả tìm kiếm, ẩn thành viên gia đình */}
      {!searchMode &&
        (loading ? (
          <p className="text-sm text-gray-400">Đang tải…</p>
        ) : family.data ? (
          <>
            <FamilyView
              name={family.data.family.name}
              members={family.data.members}
              myId={myId}
              onChanged={refresh}
              onOpenMember={setSelectedMemberId}
            />
            <InvitesList
              invites={invites.data ?? []}
              loading={invites.loading && !invites.data}
              onChanged={refresh}
            />
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Bạn chưa thuộc gia đình nào. Tìm người nhà theo số điện thoại để
              mời và tạo nhóm.
            </p>
            <InvitesList
              invites={invites.data ?? []}
              loading={invites.loading && !invites.data}
              onChanged={refresh}
            />
          </>
        ))}
    </div>
  );
}

// ───────────────────────────── Nhóm đã có ──────────────────────────────────
function FamilyView({
  name,
  members,
  myId,
  onChanged,
  onOpenMember,
}: {
  name: string;
  members: { id: string; name: string }[];
  myId: string | null;
  onChanged: () => void;
  onOpenMember: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveName = async () => {
    const next = draft.trim();
    if (!next || next === name) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await familyApi.rename(next);
      setEditing(false);
      onChanged();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (id: string, label: string) => {
    if (!window.confirm(`Xoá ${label} khỏi gia đình?`)) return;
    setError(null);
    try {
      await familyApi.removeMember(id);
      onChanged();
    } catch (e) {
      setError(errMessage(e));
    }
  };

  const leave = async () => {
    if (!window.confirm("Bạn chắc chắn muốn rời khỏi gia đình này?")) return;
    setError(null);
    try {
      await familyApi.leave();
      onChanged();
    } catch (e) {
      setError(errMessage(e));
    }
  };

  return (
    <div className="space-y-3">
      {/* Tên nhóm + sửa */}
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="ws-input ws-input-sm flex-1"
              autoFocus
              maxLength={100}
            />
            <button
              type="button"
              onClick={saveName}
              disabled={busy}
              className="ws-btn-primary text-sm px-3 py-1.5"
            >
              {busy ? "Đang lưu…" : "Lưu"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(name);
                setEditing(false);
              }}
              disabled={busy}
              className="ws-btn-ghost text-sm px-3 py-1.5"
            >
              Huỷ
            </button>
          </>
        ) : (
          <>
            <h4 className="flex-1 font-medium text-gray-900">{name}</h4>
            <button
              type="button"
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
              className="text-sm text-[#087E8B] hover:underline"
            >
              Đổi tên
            </button>
          </>
        )}
      </div>

      {/* Danh sách thành viên — dạng thẻ, 2 thẻ / hàng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((m) => {
          const isMe = m.id === myId;
          const label = m.name || m.id;
          return (
            <div
              key={m.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 shrink-0 rounded-full bg-[#C8E7E9] text-[#087E8B] flex items-center justify-center text-xs font-semibold">
                  {label.trim().charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isMe ? "Bạn" : m.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenMember(m.id)}
                  className="ws-btn-ghost text-xs px-3 py-1.5"
                >
                  Xem chi tiết
                </button>
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => removeMember(m.id, label)}
                    className="ml-auto text-xs text-red-500 hover:text-red-600 hover:underline"
                  >
                    Xoá
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={leave}
          className="text-sm text-red-600 hover:underline"
        >
          Rời khỏi gia đình
        </button>
      </div>
    </div>
  );
}

// ─────────────────────── Tìm kiếm + mời theo SĐT ───────────────────────────
function SearchSection({
  query,
  setQuery,
  onInvited,
}: {
  query: string;
  setQuery: (v: string) => void;
  onInvited: () => void;
}) {
  const [result, setResult] = useState<FamilyMemberSummary | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Gõ lại → xoá kết quả/thông báo cũ.
  const onChange = (v: string) => {
    setQuery(v);
    setResult(null);
    setSearchError(null);
    setInviteMsg(null);
  };

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = query.trim();
    if (!v) return;
    setSearching(true);
    setSearchError(null);
    setResult(null);
    setInviteMsg(null);
    try {
      setResult(await familyApi.search(v));
    } catch (e) {
      setSearchError(errMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const invite = async () => {
    setInviting(true);
    setInviteMsg(null);
    try {
      await familyApi.invite(query.trim());
      setInviteMsg({
        type: "ok",
        text: "Đã gửi lời mời. Chờ người kia chấp nhận.",
      });
      onInvited();
    } catch (e) {
      setInviteMsg({ type: "err", text: errMessage(e) });
    } finally {
      setInviting(false);
    }
  };

  const label = result ? result.name || result.id : "";

  return (
    <div className="space-y-3">
      <form onSubmit={doSearch}>
        <label className="block">
          <span className="ws-label">Tìm người nhà theo số điện thoại</span>
          <div className="flex gap-2 mt-1">
            <input
              value={query}
              onChange={(e) => onChange(e.target.value)}
              placeholder="VD: 0901234002"
              inputMode="tel"
              className="ws-input ws-input-sm flex-1"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="ws-btn-primary text-sm px-4 py-1.5"
            >
              {searching ? "Đang tìm…" : "Tìm kiếm"}
            </button>
          </div>
        </label>
      </form>

      {searchError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {searchError}
        </p>
      )}

      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 shrink-0 rounded-full bg-[#C8E7E9] text-[#087E8B] flex items-center justify-center text-xs font-semibold">
                {label.trim().charAt(0).toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {label}
                </p>
                <p className="text-xs text-gray-400">{result.id}</p>
              </div>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={invite}
                disabled={inviting}
                className="ws-btn-primary text-xs px-3 py-1.5"
              >
                {inviting ? "Đang mời…" : "Mời"}
              </button>
            </div>
            {inviteMsg && (
              <p
                className={`text-xs rounded-md px-2 py-1.5 ${
                  inviteMsg.type === "ok"
                    ? "text-green-700 bg-green-50 border border-green-100"
                    : "text-red-600 bg-red-50 border border-red-100"
                }`}
              >
                {inviteMsg.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Lời mời nhận được ───────────────────────────────
function InvitesList({
  invites,
  loading,
  onChanged,
}: {
  invites: { id: string; fromName: string }[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return null;
  if (invites.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Lời mời nhận được</h4>
      <ul className="space-y-2">
        {invites.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
          >
            <span className="flex-1 text-sm text-gray-800">
              <span className="font-medium">{inv.fromName}</span> mời bạn vào gia
              đình
            </span>
            <button
              type="button"
              disabled={busyId === inv.id}
              onClick={() => act(inv.id, () => familyApi.accept(inv.id))}
              className="ws-btn-primary text-xs px-3 py-1.5"
            >
              Chấp nhận
            </button>
            <button
              type="button"
              disabled={busyId === inv.id}
              onClick={() => act(inv.id, () => familyApi.decline(inv.id))}
              className="ws-btn-ghost text-xs px-3 py-1.5"
            >
              Từ chối
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

// ───────────────────── Chi tiết thành viên (chỉ đọc) ────────────────────────
function MemberDetail({
  memberId,
  onBack,
}: {
  memberId: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<FamilyMemberDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    familyApi
      .getMember(memberId)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(errMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [memberId]);

  return (
    <div className="p-6 space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[#087E8B] hover:underline"
      >
        ← Quay lại
      </button>

      {loading ? (
        <p className="text-sm text-gray-400">Đang tải…</p>
      ) : error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      ) : data ? (
        <>
          <div>
            <h3 className="font-semibold text-gray-900">
              {data.patient.name || data.patient.id}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Hồ sơ và kết quả khám (chỉ xem).
            </p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Info label="Tuổi" value={String(data.patient.age || "—")} />
            <Info label="Giới tính" value={data.patient.gender || "—"} />
            <Info label="Khoa" value={data.patient.ward || "—"} />
            <Info label="Số điện thoại" value={data.patient.phone || "—"} />
            <Info
              label="Địa chỉ"
              value={data.patient.address || "—"}
              full
            />
            <Info
              label="Chẩn đoán"
              value={
                data.patient.diagnoses.length
                  ? data.patient.diagnoses.join(", ")
                  : "—"
              }
              full
            />
          </dl>

          {/* Sinh hiệu */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Sinh hiệu</h4>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
              <Info label="SpO₂" value={vitalStr(data.patient.vitals.spO2, "%")} />
              <Info
                label="Nhịp tim"
                value={vitalStr(data.patient.vitals.heartRate, " l/p")}
              />
              <Info
                label="Huyết áp"
                value={data.patient.vitals.bloodPressure || "—"}
              />
              <Info
                label="Nhiệt độ"
                value={vitalStr(data.patient.vitals.temperature, "°C")}
              />
            </dl>
          </div>

          {/* Thuốc đang dùng */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              Thuốc đang dùng
            </h4>
            <MedicationList meds={data.patient.medications} />
          </div>

          {/* Xét nghiệm */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              Kết quả xét nghiệm
            </h4>
            <LabTable labs={data.labResults} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Info({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}

function vitalStr(v: number | undefined, suffix: string): string {
  return v ? `${v}${suffix}` : "—";
}

function MedicationList({ meds }: { meds: Prescription[] }) {
  if (meds.length === 0) {
    return <p className="text-sm text-gray-400">Chưa có thuốc nào.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {meds.map((m, i) => (
        <li
          key={`${m.name}-${i}`}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <p className="font-medium text-gray-800">{m.name}</p>
          {m.instruction && (
            <p className="text-xs text-gray-500 mt-0.5">{m.instruction}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function LabTable({ labs }: { labs: LabResult[] }) {
  if (labs.length === 0) {
    return <p className="text-sm text-gray-400">Chưa có kết quả xét nghiệm.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left font-medium px-3 py-2">Xét nghiệm</th>
            <th className="text-left font-medium px-3 py-2">Kết quả</th>
            <th className="text-left font-medium px-3 py-2">Tham chiếu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {labs.map((l, i) => (
            <tr key={`${l.name}-${i}`}>
              <td className="px-3 py-2 text-gray-800">{l.name}</td>
              <td
                className={`px-3 py-2 ${
                  l.isAbnormal ? "text-red-600 font-medium" : "text-gray-800"
                }`}
              >
                {l.value}
                {l.unit ? ` ${l.unit}` : ""}
              </td>
              <td className="px-3 py-2 text-gray-500">
                {l.referenceRange || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
