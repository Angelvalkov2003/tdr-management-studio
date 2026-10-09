"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";

function initials(name: string) {
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

  const assignees = task.assignees ?? [];

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
        <div className="flex items-center gap-1.5">
          {(task.links?.length ?? 0) > 0 && (
            <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
              {task.links.length} link{task.links.length === 1 ? "" : "s"}
            </span>
          )}
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-800">
            {task.estimate}
          </span>
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium text-slate-800">
        {task.title}
      </p>
      <div className="mt-2 flex min-w-0 items-center gap-2">
        {assignees.length === 0 ? (
          <span className="text-xs text-slate-400">Unassigned</span>
        ) : (
          <>
            <div className="flex -space-x-1.5">
              {assignees.slice(0, 4).map((name) => (
                <span
                  key={name}
                  title={name}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white bg-slate-100 text-[10px] font-semibold text-slate-600"
                >
                  {initials(name)}
                </span>
              ))}
            </div>
            <span className="truncate text-xs text-slate-500">
              {assignees.join(", ")}
            </span>
          </>
        )}
      </div>
    </button>
  );
}
