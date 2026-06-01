"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AdminSidebar, type AdminNavItem } from "./AdminSidebar";

export type AdminSectionRefresh = {
  version: number;
  bump: () => void;
  navigate: (key: string) => void;
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
    <div className="h-dvh w-screen flex bg-white">
      <AdminSidebar
        title={title}
        items={items}
        activeKey={activeKey}
        onSelect={setActiveKey}
      />
      <main className="flex-1 min-w-0 overflow-y-auto thin-scrollbar bg-gray-50">
        {active && (
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
            <h1 className="text-lg font-semibold text-gray-900 mb-4">
              {active.label}
            </h1>
            {active.render({
              version: versions[active.key] ?? 0,
              bump: () => bump(active.key),
              navigate: setActiveKey,
            })}
          </div>
        )}
      </main>
    </div>
  );
}
