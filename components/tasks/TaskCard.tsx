"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";

function initials(name: string | null) {
  if (!name) return "—";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow ${
        isDragging ? "opacity-60 ring-2 ring-sky-400" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-sky-700">
          {task.code}
        </span>
        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-800">
          {task.estimate}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium text-slate-800">
        {task.title}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span
          title={task.assignee ?? "Unassigned"}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600"
        >
          {initials(task.assignee)}
        </span>
        <span className="truncate text-xs text-slate-500">
          {task.assignee ?? "Unassigned"}
        </span>
      </div>
    </button>
  );
}
