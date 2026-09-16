"use client";

import { useEffect, useState } from "react";
import { STATUS_LABELS, TASK_PEOPLE, TASK_STATUSES } from "@/lib/constants";
import type { ActivityLog, Task, TaskAssignee, TaskStatus } from "@/types";

export function TaskModal({
  task,
  actor,
  onClose,
  onSaved,
  onDeleted,
}: {
  task: Task;
  actor: string | null;
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [estimate, setEstimate] = useState(task.estimate);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [assignee, setAssignee] = useState<TaskAssignee | "">(
    task.assignee ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ActivityLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const res = await fetch(
          `/api/activity?entity_type=task&entity_id=${encodeURIComponent(task.code)}&limit=30`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setHistory(data.entries ?? []);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [task.code]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          estimate,
          status,
          assignee: assignee || null,
          actor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved(data.task);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      onDeleted(task.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-sky-700">
                {task.code}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Edit task
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:text-sm"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:text-sm"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-400 sm:text-sm"
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Estimate
                <select
                  value={estimate}
                  onChange={(e) => setEstimate(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-400 sm:text-sm"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Estimate slider: {estimate}
              <input
                type="range"
                min={1}
                max={10}
                value={estimate}
                onChange={(e) => setEstimate(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Assignee
              <select
                value={assignee}
                onChange={(e) =>
                  setAssignee(e.target.value as TaskAssignee | "")
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-400 sm:text-sm"
              >
                <option value="">None</option>
                {TASK_PEOPLE.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={() => void save()}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-red-600">Delete this task?</span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void remove()}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <section className="mt-10 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Change history
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Recent updates for {task.code}
            </p>

            <div className="mt-3">
              {historyLoading ? (
                <p className="text-sm text-slate-500">Loading history…</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-slate-500">No changes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <time className="text-[11px] tabular-nums text-slate-400">
                          {new Date(entry.created_at).toLocaleString()}
                        </time>
                        {entry.actor && (
                          <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                            {entry.actor}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-words text-sm text-slate-700">
                        {entry.action}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
