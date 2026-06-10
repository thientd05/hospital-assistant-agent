"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ymd } from "@/lib/calendar";
import type { AppointmentRow } from "./useAppointments";

type Options = {
  appointments: AppointmentRow[] | null;
  /** Khoá localStorage riêng theo bác sĩ; null khi auth chưa sẵn sàng. */
  storageKey: string | null;
};

function load(key: string | null): Set<string> {
  if (!key) return new Set();
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/**
 * Chấm "lịch hẹn mới" cho bác sĩ. Lịch còn "Chờ duyệt" mà bác sĩ CHƯA xem (chưa bấm
 * vào ô ngày của nó trong bảng tháng) → tính là MỚI: ô ngày đó nhấp nháy + chấm trên
 * nút tab/nút mở panel. `markDaySeen` đánh dấu mọi lịch trong ngày đó là đã xem → hết
 * nhấp nháy; khi không còn ngày mới nào, chấm biến mất.
 */
export function useAppointmentAlerts({ appointments, storageKey }: Options) {
  const [seen, setSeen] = useState<Set<string>>(() => load(storageKey));

  useEffect(() => {
    setSeen(load(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (next: Set<string>) => {
      setSeen(next);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // bỏ qua khi storage đầy / disabled
      }
    },
    [storageKey]
  );

  // Lịch MỚI = đang chờ duyệt và chưa được đánh dấu đã xem.
  const newAppts = useMemo(
    () =>
      (appointments ?? []).filter(
        (a) => a.status === "Chờ duyệt" && !seen.has(a.id)
      ),
    [appointments, seen]
  );

  const newDays = useMemo(() => {
    const set = new Set<string>();
    for (const a of newAppts) {
      const dt = new Date(a.scheduledAt);
      if (!Number.isNaN(dt.getTime())) set.add(ymd(dt));
    }
    return set;
  }, [newAppts]);

  // Bác sĩ xem một ngày → đánh dấu mọi lịch trong ngày đó là đã xem.
  const markDaySeen = useCallback(
    (date: Date) => {
      const key = ymd(date);
      const ids = (appointments ?? [])
        .filter((a) => {
          const dt = new Date(a.scheduledAt);
          return !Number.isNaN(dt.getTime()) && ymd(dt) === key;
        })
        .map((a) => a.id)
        .filter((id) => !seen.has(id));
      if (ids.length === 0) return;
      const next = new Set(seen);
      for (const id of ids) next.add(id);
      persist(next);
    },
    [appointments, seen, persist]
  );

  return { newDays, hasNew: newAppts.length > 0, markDaySeen };
}
