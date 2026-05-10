"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AdminSidebar, type AdminNavItem } from "./AdminSidebar";

export type AdminSectionRefresh = {
  version: number;
  bump: () => void;
};

export type AdminSection = AdminNavItem & {
  render: (refresh: AdminSectionRefresh) => ReactNode;
};

type Props = {
  title: string;
  sections: AdminSection[];
};

export function AdminShell({ title, sections }: Props) {
  const firstKey = sections[0]?.key ?? "";
  const [activeKey, setActiveKey] = useState<string>(firstKey);
  const [versions, setVersions] = useState<Record<string, number>>(() =>
    Object.fromEntries(sections.map((s) => [s.key, 0]))
  );

  const bump = useCallback((key: string) => {
    setVersions((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
  }, []);

  const items = useMemo<AdminNavItem[]>(
    () => sections.map(({ key, label, icon }) => ({ key, label, icon })),
    [sections]
  );

  const active = sections.find((s) => s.key === activeKey) ?? sections[0];

  return (
    <div className="h-screen w-screen flex bg-white">
      <AdminSidebar
        title={title}
        items={items}
        activeKey={activeKey}
        onSelect={setActiveKey}
      />
      <main className="flex-1 min-w-0 overflow-y-auto thin-scrollbar">
        {active && (
          <div className="max-w-3xl mx-auto py-6 px-2">
            <h1 className="text-lg font-semibold text-gray-900 px-3 mb-3">
              {active.label}
            </h1>
            {active.render({
              version: versions[active.key] ?? 0,
              bump: () => bump(active.key),
            })}
          </div>
        )}
      </main>
    </div>
  );
}
