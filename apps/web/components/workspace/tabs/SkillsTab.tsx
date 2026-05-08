"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSkills, useSkill, skillsApi } from "@/hooks/useSkills";

type Props = {
  version: number;
  active: boolean;
  onChanged: () => void;
};

type Mode = "list" | "view" | "edit" | "new";

export function SkillsTab({ version, active, onChanged }: Props) {
  const list = useSkills(version, active);
  const [mode, setMode] = useState<Mode>("list");
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useSkill(
    selected,
    version,
    active && Boolean(selected) && (mode === "view" || mode === "edit")
  );

  const [draftName, setDraftName] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function startNew() {
    setDraftName("");
    setDraftContent(
      "---\nname: my-skill\ndescription: Mô tả ngắn về skill này\n---\n\n# Hướng dẫn\n\n"
    );
    setSelected(null);
    setMode("new");
    setErr(null);
  }

  function openSkill(name: string) {
    setSelected(name);
    setMode("view");
    setErr(null);
  }

  function startEdit() {
    if (!detail.data) return;
    setDraftContent(detail.data.content);
    setMode("edit");
  }

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      if (mode === "new") {
        if (!draftName.trim()) {
          setErr("Cần nhập tên skill.");
          setBusy(false);
          return;
        }
        const res = await skillsApi.create(draftName.trim(), draftContent);
        setSelected(res.skill);
        setMode("view");
      } else if (mode === "edit" && selected) {
        await skillsApi.update(selected, draftContent);
        setMode("view");
        detail.refetch();
      }
      list.refetch();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(name: string) {
    if (!confirm(`Xoá skill "${name}"?`)) return;
    setBusy(true);
    try {
      await skillsApi.remove(name);
      if (selected === name) {
        setSelected(null);
        setMode("list");
      }
      list.refetch();
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
          {mode === "list"
            ? "Thư viện skill"
            : mode === "new"
              ? "Tạo skill mới"
              : mode === "edit"
                ? `Sửa: ${selected}`
                : `Skill: ${selected}`}
        </div>
        <div className="flex gap-1.5">
          {mode !== "list" && (
            <button
              type="button"
              onClick={() => {
                setMode("list");
                setSelected(null);
                setErr(null);
              }}
              className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              ← Danh sách
            </button>
          )}
          {mode === "list" && (
            <button
              type="button"
              onClick={startNew}
              className="text-sm px-3 py-1.5 rounded-md bg-[#087E8B] text-white hover:bg-[#066671]"
            >
              + Tạo
            </button>
          )}
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {err}
        </div>
      )}

      {mode === "list" && (
        <>
          {list.loading && (
            <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
          )}
          {list.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {list.error}
            </div>
          )}
          {list.data && (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
              {list.data.skills.length === 0 && (
                <li className="px-3 py-3 text-sm text-gray-500">
                  Chưa có skill nào.
                </li>
              )}
              {list.data.skills.map((s) => (
                <li key={s.name} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-gray-900 truncate">
                        {s.name}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-600 leading-relaxed">
                        {s.description}
                      </div>
                    </div>
                    <div className="shrink-0 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => openSkill(s.name)}
                        className="text-[11px] px-2 py-1 rounded-md border border-[#C8E7E9] text-[#087E8B] hover:bg-[#C8E7E9]"
                      >
                        Xem
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(s.name)}
                        className="text-[11px] px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {mode === "view" && (
        <>
          {detail.loading && (
            <div className="text-sm text-gray-400 text-center py-4">Đang tải…</div>
          )}
          {detail.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {detail.error}
            </div>
          )}
          {detail.data && (
            <>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={startEdit}
                  className="text-xs px-2.5 py-1 rounded-md border border-[#C8E7E9] text-[#087E8B] hover:bg-[#C8E7E9]"
                >
                  Sửa
                </button>
              </div>
              <div className="markdown-body text-sm text-gray-800 leading-relaxed border border-gray-200 rounded-md px-4 py-3 bg-gray-50/40">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {detail.data.content}
                </ReactMarkdown>
              </div>
            </>
          )}
        </>
      )}

      {(mode === "edit" || mode === "new") && (
        <div className="space-y-2">
          {mode === "new" && (
            <label className="block">
              <span className="block text-xs text-gray-500 mb-0.5">
                Tên skill (a-z, 0-9, dấu - _)
              </span>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="my-new-skill"
                className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#087E8B] font-mono"
              />
            </label>
          )}
          <label className="block">
            <span className="block text-xs text-gray-500 mb-0.5">
              Nội dung markdown (có frontmatter ---)
            </span>
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={20}
              className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-[#087E8B] font-mono"
            />
          </label>
          <div className="flex justify-end">
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
