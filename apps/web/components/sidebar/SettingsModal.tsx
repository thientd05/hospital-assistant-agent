"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type {
  DoctorPublic,
  ExpertPublic,
  ManagerPublic,
  PatientPublic,
} from "@pr_hospitalagent/types";
import { http, ApiError } from "@/lib/apiClient";
import { dedupedFetch, getCached, setCached } from "@/lib/resourceCache";
import { useAuth, type AuthAccount } from "@/app/providers/AuthProvider";

type Props = {
  open: boolean;
  onClose: () => void;
};

type WorkspaceFile = "MEMORY.md" | "SOUL.md" | "USER.md";

type WorkspaceFileMeta = {
  file: WorkspaceFile;
  label: string;
  description: string;
};

const WORKSPACE_FILES: WorkspaceFileMeta[] = [
  {
    file: "MEMORY.md",
    label: "Bộ nhớ",
    description:
      "Nơi trợ lý AI tự ghi lại các thông tin, ngữ cảnh hoặc ghi chú quan trọng học được trong quá trình làm việc với bạn — giúp duy trì sự nhất quán giữa các cuộc trò chuyện. Bạn có thể đọc lại để hiểu trợ lý đang nhớ những gì, và sửa nếu cần.",
  },
  {
    file: "SOUL.md",
    label: "Phong cách AI",
    description:
      "Cá tính, giọng điệu và sở thích giao tiếp của trợ lý dành riêng cho bạn — quy định cách AI trả lời, dùng từ và tương tác. Sửa file này để điều chỉnh phong cách phản hồi (ngắn gọn hơn, lịch sự hơn, dùng tiếng chuyên môn nhiều hơn…).",
  },
  {
    file: "USER.md",
    label: "Hồ sơ làm việc",
    description:
      "Thông tin nền về bạn: vai trò, phạm vi công việc, chuyên môn, kiến thức nền. Trợ lý đọc file này ở mỗi cuộc trò chuyện để đưa ra phản hồi phù hợp với chuyên môn của bạn. Cập nhật khi vai trò hoặc phạm vi công việc thay đổi.",
  },
];

type Tab =
  | { kind: "profile" }
  | { kind: "password" }
  | { kind: "file"; file: WorkspaceFile };

type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "email";
};

const DOCTOR_FIELDS: FieldDef[] = [
  { key: "fullName", label: "Họ và tên" },
  { key: "title", label: "Chức danh" },
  { key: "department", label: "Khoa" },
  { key: "specialty", label: "Chuyên môn sâu" },
  { key: "phone", label: "Điện thoại" },
  { key: "email", label: "Email", type: "email" },
  { key: "address", label: "Địa chỉ" },
];

const MANAGER_FIELDS: FieldDef[] = [
  { key: "fullName", label: "Họ và tên" },
  { key: "title", label: "Chức danh" },
  { key: "clinicName", label: "Tên phòng khám" },
  { key: "phone", label: "Điện thoại" },
  { key: "email", label: "Email", type: "email" },
  { key: "address", label: "Địa chỉ" },
];

const EXPERT_FIELDS: FieldDef[] = [
  { key: "fullName", label: "Họ và tên" },
  { key: "title", label: "Chức danh" },
  { key: "expertise", label: "Lĩnh vực chuyên môn" },
  { key: "phone", label: "Điện thoại" },
  { key: "email", label: "Email", type: "email" },
  { key: "address", label: "Địa chỉ" },
];

const PATIENT_FIELDS: FieldDef[] = [
  { key: "name", label: "Họ và tên" },
  { key: "ward", label: "Phường/Xã" },
];

function fieldsForRole(role: AuthAccount["role"]): FieldDef[] {
  if (role === "doctor") return DOCTOR_FIELDS;
  if (role === "manager") return MANAGER_FIELDS;
  if (role === "expert") return EXPERT_FIELDS;
  return PATIENT_FIELDS;
}

function profileFromAccount(account: AuthAccount): Record<string, string> {
  if (account.role === "doctor") {
    const d = account.doctor;
    return {
      fullName: d.fullName,
      title: d.title,
      department: d.department,
      specialty: d.specialty,
      phone: d.phone,
      email: d.email,
      address: d.address,
    };
  }
  if (account.role === "manager") {
    const m = account.manager;
    return {
      fullName: m.fullName,
      title: m.title,
      clinicName: m.clinicName,
      phone: m.phone,
      email: m.email,
      address: m.address,
    };
  }
  if (account.role === "expert") {
    const e = account.expert;
    return {
      fullName: e.fullName,
      title: e.title,
      expertise: e.expertise,
      phone: e.phone,
      email: e.email,
      address: e.address,
    };
  }
  const p = account.patient;
  return {
    name: p.name,
    ward: p.ward,
  };
}

type ProfileResponse =
  | { role: "doctor"; doctor: DoctorPublic }
  | { role: "manager"; manager: ManagerPublic }
  | { role: "expert"; expert: ExpertPublic }
  | { role: "patient"; patient: PatientPublic };

export function SettingsModal({ open, onClose }: Props) {
  const { account, updateAccount, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>({ kind: "profile" });

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setTab({ kind: "profile" });
  }, [open]);

  if (!open || !account) return null;

  const showWorkspaceFiles =
    account.role === "doctor" || account.role === "patient";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative bg-white shadow-xl border border-gray-200 flex flex-col overflow-hidden max-md:fixed max-md:inset-0 max-md:w-full max-md:h-full md:flex-row md:rounded-lg md:w-[920px] md:max-w-[95vw] md:h-[600px] md:max-h-[90dvh]"
      >
        {/* Sidebar tabs — cột dọc trên desktop, thanh ngang trên mobile */}
        <div className="flex flex-col bg-gray-50 md:w-56 md:shrink-0 md:border-r md:border-gray-200">
          <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between gap-2">
            <h2
              id="settings-modal-title"
              className="font-semibold text-gray-900"
            >
              Cài đặt
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="md:hidden -mr-1 p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            >
              <svg
                viewBox="0 0 20 20"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6l8 8M14 6l-8 8" />
              </svg>
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-2 text-sm md:flex-1 md:flex-col md:gap-0 md:space-y-0.5 md:overflow-x-visible md:overflow-y-auto">
            <TabButton
              active={tab.kind === "profile"}
              onClick={() => setTab({ kind: "profile" })}
            >
              Thông tin cá nhân
            </TabButton>
            <TabButton
              active={tab.kind === "password"}
              onClick={() => setTab({ kind: "password" })}
            >
              Đổi mật khẩu
            </TabButton>
            {showWorkspaceFiles && (
              <>
                <div className="hidden md:block pt-3 pb-1 px-3 text-xs uppercase tracking-wide text-gray-400">
                  Workspace
                </div>
                {WORKSPACE_FILES.map((f) => (
                  <TabButton
                    key={f.file}
                    active={tab.kind === "file" && tab.file === f.file}
                    onClick={() => setTab({ kind: "file", file: f.file })}
                  >
                    {f.label}
                  </TabButton>
                ))}
              </>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="md:hidden shrink-0 whitespace-nowrap px-3 py-2 rounded-md text-red-600 font-medium transition-colors hover:bg-red-50"
            >
              Đăng xuất
            </button>
            <div className="hidden md:block pt-3 mt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={handleLogout}
                className="group w-full flex items-center gap-2 text-left px-3 py-2 rounded-md text-gray-700 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="w-4 h-4 shrink-0 text-gray-400 transition-colors group-hover:text-red-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 4H4v12h3" />
                  <path d="M13 14l4-4-4-4" />
                  <path d="M17 10H8" />
                </svg>
                Đăng xuất
              </button>
            </div>
          </nav>
          <div className="hidden md:block p-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full text-sm px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab.kind === "profile" && (
            <ProfilePanel
              account={account}
              onUpdated={updateAccount}
            />
          )}
          {tab.kind === "password" && <PasswordPanel />}
          {tab.kind === "file" && (
            <WorkspaceFilePanel
              key={tab.file}
              meta={WORKSPACE_FILES.find((f) => f.file === tab.file)!}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap text-left px-3 py-2 rounded-md transition-colors md:w-full ${
        active
          ? "bg-[#C8E7E9] text-[#087E8B] font-medium"
          : "text-gray-700 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function ProfilePanel({
  account,
  onUpdated,
}: {
  account: AuthAccount;
  onUpdated: (next: AuthAccount) => void;
}) {
  const fields = useMemo(() => fieldsForRole(account.role), [account.role]);
  const initial = useMemo(() => profileFromAccount(account), [account]);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setValues(initial);
    setError(null);
    setSuccess(false);
  }, [initial]);

  const dirty = fields.some((f) => (values[f.key] ?? "") !== (initial[f.key] ?? ""));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const body: Record<string, string> = {};
    for (const f of fields) {
      const v = (values[f.key] ?? "").trim();
      if (v !== (initial[f.key] ?? "")) {
        body[f.key] = v;
      }
    }
    if (Object.keys(body).length === 0) return;
    setSaving(true);
    try {
      const data = await http.patch<ProfileResponse>("/api/auth/me/profile", body);
      const nextAccount: AuthAccount =
        data.role === "doctor"
          ? { role: "doctor", doctor: data.doctor }
          : data.role === "manager"
          ? { role: "manager", manager: data.manager }
          : data.role === "expert"
          ? { role: "expert", expert: data.expert }
          : { role: "patient", patient: data.patient };
      onUpdated(nextAccount);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không cập nhật được.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Thông tin cá nhân</h3>
        <p className="text-xs text-gray-500 mt-1">
          Cập nhật thông tin liên hệ và chuyên môn hiển thị trong hệ thống.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">{f.label}</span>
            <input
              type={f.type ?? "text"}
              value={values[f.key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
              className="border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#C8E7E9] focus:border-[#087E8B]"
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
          Đã lưu thông tin.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            setValues(initial);
            setError(null);
            setSuccess(false);
          }}
          disabled={!dirty || saving}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
        >
          Hoàn tác
        </button>
        <button
          type="submit"
          disabled={!dirty || saving}
          className="px-4 py-1.5 text-sm rounded-md bg-[#087E8B] hover:bg-[#066671] text-white disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}

function PasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }
    setSaving(true);
    try {
      await http.post("/api/auth/me/password", {
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không đổi được mật khẩu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-md">
      <div>
        <h3 className="font-semibold text-gray-900">Đổi mật khẩu</h3>
        <p className="text-xs text-gray-500 mt-1">
          Nhập mật khẩu hiện tại để xác nhận, sau đó đặt mật khẩu mới (tối thiểu 6 ký tự).
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Mật khẩu hiện tại</span>
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#C8E7E9] focus:border-[#087E8B]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Mật khẩu mới</span>
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
          className="border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#C8E7E9] focus:border-[#087E8B]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Xác nhận mật khẩu mới</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#C8E7E9] focus:border-[#087E8B]"
        />
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
          Đã đổi mật khẩu thành công.
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          className="px-4 py-1.5 text-sm rounded-md bg-[#087E8B] hover:bg-[#066671] text-white disabled:opacity-50"
        >
          {saving ? "Đang đổi..." : "Đổi mật khẩu"}
        </button>
      </div>
    </form>
  );
}

function WorkspaceFilePanel({ meta }: { meta: WorkspaceFileMeta }) {
  const [content, setContent] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = `/api/workspace/files/${meta.file}`;
    // Có cache → hiện nội dung ngay, revalidate nền (không hiện "đang tải").
    const cached = getCached<{ file: string; content: string }>(key);
    if (cached) {
      setContent(cached.content);
      setDraft(cached.content);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    setInfo(null);
    setEditing(false);
    (async () => {
      try {
        const data = await dedupedFetch(key, () =>
          http.get<{ file: string; content: string }>(key)
        );
        if (cancelled) return;
        setContent(data.content);
        setDraft(data.content);
      } catch (err) {
        if (cancelled) return;
        // Lỗi revalidate khi đã có cache → giữ nội dung cũ; chưa cache mới báo lỗi.
        if (getCached(key) === undefined) {
          setError(
            err instanceof ApiError ? err.message : "Không tải được nội dung."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meta.file]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const key = `/api/workspace/files/${meta.file}`;
      const data = await http.put<{ file: string; content: string }>(key, {
        content: draft,
      });
      setContent(data.content);
      setDraft(data.content);
      setEditing(false);
      setInfo("Đã lưu.");
      // Đồng bộ cache để lần mở lại hiện nội dung vừa lưu, không phải bản cũ.
      setCached(key, data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{meta.label}</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {meta.description}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setDraft(content);
                setEditing(true);
                setInfo(null);
              }}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            >
              Chỉnh sửa
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraft(content);
                  setEditing(false);
                  setError(null);
                }}
                disabled={saving}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || draft === content}
                className="px-3 py-1.5 text-sm rounded-md bg-[#087E8B] hover:bg-[#066671] text-white disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {info && !error && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
          {info}
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400">Đang tải…</p>
        ) : editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="w-full h-full resize-none border border-gray-200 rounded-md px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#C8E7E9] focus:border-[#087E8B]"
          />
        ) : content.trim() === "" ? (
          <p className="text-sm text-gray-400 italic">
            (Chưa có nội dung. Bấm “Chỉnh sửa” để bắt đầu nhập.)
          </p>
        ) : (
          <div className="markdown-body text-sm text-gray-800 leading-relaxed border border-gray-200 rounded-md px-4 py-3 bg-gray-50/40 h-full overflow-y-auto">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
