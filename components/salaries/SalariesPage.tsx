"use client";

import { useEffect, useMemo, useState } from "react";
import { MONTH_NAMES, SALARY_PEOPLE } from "@/lib/constants";
import type { SalaryPerson, SalaryRecord } from "@/types";
import { ActivityLogPanel } from "@/components/ActivityLogPanel";

function recordKey(person: string, month: number) {
  return `${person}-${month}`;
}

function fillPercent(record: SalaryRecord | undefined): number {
  if (!record) return 0;
  if (record.days_paid != null && record.days_paid > 0) {
    return Math.min(100, (record.days_paid / 30) * 100);
  }
  return record.paid ? 100 : 0;
}

function MonthSquare({
  person,
  month,
  year,
  record,
  selected,
  onSelect,
}: {
  person: SalaryPerson;
  month: number;
  year: number;
  record: SalaryRecord | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const fill = fillPercent(record);

  return (
    <button
      type="button"
      title={`${MONTH_NAMES[month - 1]} — ${person}`}
      onClick={onSelect}
      className={`relative h-8 w-8 overflow-hidden rounded-md border bg-slate-100 transition sm:h-10 sm:w-10 ${
        selected
          ? "border-sky-500 ring-2 ring-sky-200"
          : "border-slate-200 hover:border-slate-400"
      }`}
    >
      <span
        className="absolute inset-y-0 left-0 bg-emerald-500/90 transition-all"
        style={{ width: `${fill}%` }}
      />
      {record?.days_paid != null && record.days_paid > 0 && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-800">
          {record.days_paid}
        </span>
      )}
    </button>
  );
}

function MonthEditor({
  person,
  month,
  year,
  record,
  onClose,
  onUpdated,
}: {
  person: SalaryPerson;
  month: number;
  year: number;
  record: SalaryRecord | undefined;
  onClose: () => void;
  onUpdated: (record: SalaryRecord) => void;
}) {
  const [paid, setPaid] = useState(record?.paid ?? false);
  const [daysPaid, setDaysPaid] = useState(
    record?.days_paid != null ? String(record.days_paid) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const days =
        daysPaid.trim() === "" ? null : Number.parseInt(daysPaid, 10);
      const nextPaid = paid || (days != null && days > 0);
      const res = await fetch("/api/salaries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person,
          year,
          month,
          paid: nextPaid,
          days_paid: days,
          actor: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onUpdated(data.record);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const previewDays =
    daysPaid.trim() === "" ? null : Number.parseInt(daysPaid, 10);
  const previewFill =
    previewDays != null && !Number.isNaN(previewDays) && previewDays > 0
      ? Math.min(100, (previewDays / 30) * 100)
      : paid
        ? 100
        : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-3 pt-16 sm:pt-24">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {person}
            </p>
            <p className="text-xs text-slate-500">
              {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${previewFill}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Fill = days ÷ 30 (e.g. 15 → half, 10 → one third)
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
            className="rounded border-slate-300"
          />
          Paid
        </label>

        <label className="mt-3 block text-sm font-medium text-slate-700">
          Days paid
          <input
            type="number"
            min={0}
            max={30}
            value={daysPaid}
            onChange={(e) => {
              setDaysPaid(e.target.value);
              const n = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(n) && n > 0) setPaid(true);
            }}
            placeholder="e.g. 15 of 30"
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-slate-400 sm:text-sm"
            autoFocus
          />
        </label>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="flex-1 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function SalariesPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logKey, setLogKey] = useState(0);
  const [editing, setEditing] = useState<{
    person: SalaryPerson;
    month: number;
  } | null>(null);

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
  const editingRecord = editing
    ? byKey.get(recordKey(editing.person, editing.month))
    : undefined;

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
                          selected={
                            editing?.person === person &&
                            editing?.month === month
                          }
                          onSelect={() => setEditing({ person, month })}
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

      {editing && (
        <MonthEditor
          person={editing.person}
          month={editing.month}
          year={year}
          record={editingRecord}
          onClose={() => setEditing(null)}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}
