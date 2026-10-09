"use client";

import { useState } from "react";
import { TASK_PEOPLE } from "@/lib/constants";
import type { Task, TaskAssignee, TaskLink } from "@/types";

export function NewTaskForm({
  actor,
  onCreated,
  onCancel,
}: {
  actor: string | null;
  onCreated: (task: Task) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimate, setEstimate] = useState(3);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAssignee(name: TaskAssignee) {
    setAssignees((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    setLinks((prev) => [
      ...prev,
      linkLabel.trim() ? { url, label: linkLabel.trim() } : { url },
    ]);
    setLinkUrl("");
    setLinkLabel("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          estimate,
          assignees,
          links,
          status: "idea",
          actor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      onCreated(data.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6"
      >
        <h2 className="text-lg font-semibold text-slate-900">New task</h2>
        <p className="mt-1 text-sm text-slate-500">
          Starts in Idea. Code is assigned automatically (TDR-N).
        </p>

        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Estimate: {estimate}
            <input
              type="range"
              min={1}
              max={10}
              value={estimate}
              onChange={(e) => setEstimate(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              Assignees
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TASK_PEOPLE.map((name) => {
                const selected = assignees.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleAssignee(name)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      selected
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <p className="text-sm font-medium text-slate-700">Links</p>
            {links.length > 0 && (
              <ul className="mt-2 space-y-1">
                {links.map((link, index) => (
                  <li
                    key={`${link.url}-${index}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-sky-700 hover:underline"
                    >
                      {link.label || link.url}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setLinks((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="Label (optional)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-1"
              />
            </div>
            <button
              type="button"
              onClick={addLink}
              className="mt-2 text-xs font-medium text-sky-700 hover:underline"
            >
              + Add link
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-2">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create task"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
