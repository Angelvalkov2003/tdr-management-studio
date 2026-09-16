"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MONTH_NAMES, SALARY_PEOPLE } from "@/lib/constants";
import { useCurrentPerson } from "@/lib/use-current-person";
import type { SalaryPerson, SalaryRecord } from "@/types";
import { ActivityLogPanel } from "@/components/ActivityLogPanel";

function recordKey(person: string, month: number) {
  return `${person}-${month}`;
}

function MonthSquare({
  person,
  month,
  year,
  record,
  actor,
  onUpdated,
}: {
  person: SalaryPerson;
  month: number;
  year: number;
  record: SalaryRecord | undefined;
  actor: string | null;
  onUpdated: (record: SalaryRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState(record?.paid ?? false);
  const [daysPaid, setDaysPaid] = useState(
    record?.days_paid != null ? String(record.days_paid) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPaid(record?.paid ?? false);
    setDaysPaid(record?.days_paid != null ? String(record.days_paid) : "");
  }, [record]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const fill =
    paid && daysPaid && Number(daysPaid) > 0 && Number(daysPaid) < 31
      ? Math.min(100, (Number(daysPaid) / 30) * 100)
      : paid
        ? 100
        : 0;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const days =
        daysPaid.trim() === "" ? null : Number.parseInt(daysPaid, 10);
      const res = await fetch("/api/salaries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person,
          year,
          month,
          paid,
          days_paid: days,
          actor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onUpdated(data.record);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        title={`${MONTH_NAMES[month - 1]} — ${person}`}
        onClick={() => setOpen((v) => !v)}
        className="relative h-8 w-8 overflow-hidden rounded-md border border-slate-200 bg-slate-100 transition hover:border-slate-400 sm:h-10 sm:w-10"
      >
        <span
          className="absolute inset-x-0 bottom-0 bg-emerald-500/90 transition-all"
          style={{ height: `${fill}%` }}
        />
        {record?.days_paid != null && record.paid && (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-800">
            {record.days_paid}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(14rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:left-1/2 sm:w-56 sm:-translate-x-1/2">
          <p className="text-xs font-semibold text-slate-800">
            {person} · {MONTH_NAMES[month - 1]} {year}
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              className="rounded border-slate-300"
            />
            Paid
          </label>
          <label className="mt-2 block text-xs font-medium text-slate-600">
            Days paid (optional)
            <input
              type="number"
              min={0}
              max={31}
              value={daysPaid}
              onChange={(e) => setDaysPaid(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="mt-3 w-full rounded-md bg-slate-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

export function SalariesPage() {
  const { actor } = useCurrentPerson();
  const [year, setYear] = useState(new Date().getFullYear());
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logKey, setLogKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/salaries?year=${year}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setRecords(data.records);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [year]);

  const byKey = useMemo(() => {
    const map = new Map<string, SalaryRecord>();
    for (const r of records) {
      map.set(recordKey(r.person, r.month), r);
    }
    return map;
  }, [records]);

  function onUpdated(record: SalaryRecord) {
    setRecords((prev) => {
      const idx = prev.findIndex(
        (r) =>
          r.person === record.person &&
          r.year === record.year &&
          r.month === record.month,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [...prev, record];
    });
    setLogKey((k) => k + 1);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 3 + i);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1100px] flex-1 flex-col gap-6 px-3 py-5 sm:px-4 sm:py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Salaries
          </h1>
          <p className="text-sm text-slate-500">
            Click a month square to mark paid and set days paid.
          </p>
        </div>
        <label className="text-sm text-slate-600">
          Year{" "}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="ml-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
            {!years.includes(year) && <option value={year}>{year}</option>}
          </select>
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm break-words text-red-700">
          {error}
        </p>
      )}

      <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="w-max min-w-full p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2 pl-[calc(5.5rem+0.5rem)] sm:gap-3 sm:pl-[calc(7rem+0.75rem)]">
            {MONTH_NAMES.map((name) => (
              <div
                key={name}
                className="w-8 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:w-10"
                title={name}
              >
                {name.slice(0, 3)}
              </div>
            ))}
          </div>

          {loading ? (
            <p className="py-8 text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="space-y-3">
              {SALARY_PEOPLE.map((person) => (
                <div key={person} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-[5.5rem] shrink-0 text-sm font-medium text-slate-800 sm:w-28">
                    {person}
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (month) => (
                        <MonthSquare
                          key={`${person}-${month}`}
                          person={person}
                          month={month}
                          year={year}
                          record={byKey.get(recordKey(person, month))}
                          actor={actor}
                          onUpdated={onUpdated}
                        />
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 min-w-0 sm:mt-12">
        <ActivityLogPanel refreshKey={logKey} />
      </div>
    </div>
  );
}
