"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useBoot, bootsApi, type BootRole } from "@/hooks/useBoots";

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

const ROLES: { key: BootRole; label: string }[] = [
  { key: "doctor", label: "Bác sĩ" },
  { key: "patient", label: "Bệnh nhân" },
];

export function BootsTab({ version, active, onChanged }: Props) {
  const [role, setRole] = useState<BootRole>("doctor");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const boot = useBoot(role, version, active);

  // Đổi vai trò → thoát chế độ sửa.
  useEffect(() => {
    setEditing(false);
    setErr(null);
  }, [role]);

  function startEdit() {
    if (!boot.data) return;
    setDraft(boot.data.content);
    setEditing(true);
    setErr(null);
  }

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      await bootsApi.update(role, draft);
      setEditing(false);
      boot.refetch();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              className={
                "text-sm px-3 py-1.5 rounded-md border " +
                (role === r.key
                  ? "bg-[#087E8B] text-white border-[#087E8B]"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          AGENT.md — prompt gốc
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {err}
        </div>
      )}

      {boot.loading && (
        <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
      )}
      {boot.error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {boot.error}
        </div>
      )}

      {boot.data && !editing && (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={startEdit}
              className="text-xs px-2.5 py-1 rounded-md border border-[#C8E7E9] text-[#087E8B] hover:bg-[#C8E7E9]"
            >
              Sửa
            </button>
          </div>
          {boot.data.content.trim() ? (
            <div className="markdown-body text-sm text-gray-800 leading-relaxed border border-gray-200 rounded-md px-4 py-3 bg-gray-50/40">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {boot.data.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-sm text-gray-500 px-3 py-3">
              Chưa có nội dung AGENT.md cho vai trò này.
            </div>
          )}
        </>
      )}

      {boot.data && editing && (
        <div className="space-y-2">
          <label className="block">
            <span className="block text-xs text-gray-500 mb-0.5">
              Nội dung markdown
            </span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={24}
              className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#087E8B] font-mono"
            />
          </label>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setErr(null);
              }}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671] disabled:opacity-50"
            >
              {busy ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
