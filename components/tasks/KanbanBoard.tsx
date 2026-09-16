"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { STATUS_LABELS, TASK_STATUSES } from "@/lib/constants";
import { useCurrentPerson } from "@/lib/use-current-person";
import type { Task, TaskStatus } from "@/types";
import { ActivityLogPanel } from "@/components/ActivityLogPanel";
import { NewTaskForm } from "@/components/tasks/NewTaskForm";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskModal } from "@/components/tasks/TaskModal";

function Column({
  status,
  tasks,
  onOpen,
}: {
  status: TaskStatus;
  tasks: Task[];
  onOpen: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-slate-50/80 ${
        isOver ? "border-sky-300 bg-sky-50/50" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h2 className="text-sm font-semibold text-slate-800">
          {STATUS_LABELS[status]}
        </h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm">
          {tasks.length}
        </span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex max-h-[calc(100vh-220px)] flex-col gap-2 overflow-y-auto px-2 pb-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onOpen(task)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups = Object.fromEntries(
    TASK_STATUSES.map((s) => [s, [] as Task[]]),
  ) as Record<TaskStatus, Task[]>;

  for (const task of [...tasks].sort((a, b) => a.position - b.position)) {
    groups[task.status].push(task);
  }
  return groups;
}

function findContainer(
  groups: Record<TaskStatus, Task[]>,
  id: string,
): TaskStatus | null {
  if ((TASK_STATUSES as string[]).includes(id)) return id as TaskStatus;
  for (const status of TASK_STATUSES) {
    if (groups[status].some((t) => t.id === id)) return status;
  }
  return null;
}

function applySameColumnReorder(
  tasks: Task[],
  activeId: string,
  overId: string,
): Task[] | null {
  const groups = groupByStatus(tasks);
  const container = findContainer(groups, activeId);
  if (!container) return null;
  if (findContainer(groups, overId) !== container) return null;

  const list = [...groups[container]];
  const oldIndex = list.findIndex((t) => t.id === activeId);
  const newIndex = list.findIndex((t) => t.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null;

  const reordered = arrayMove(list, oldIndex, newIndex).map((t, i) => ({
    ...t,
    position: i,
  }));

  return tasks.map((t) => {
    const updated = reordered.find((r) => r.id === t.id);
    return updated ?? t;
  });
}

export function KanbanBoard() {
  const { actor } = useCurrentPerson();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [logKey, setLogKey] = useState(0);
  const [dragFromStatus, setDragFromStatus] = useState<TaskStatus | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/tasks");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load tasks");
        setTasks(data.tasks);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const groups = useMemo(() => groupByStatus(tasks), [tasks]);
  const activeTask = activeId
    ? (tasks.find((t) => t.id === activeId) ?? null)
    : null;

  function bumpLog() {
    setLogKey((k) => k + 1);
  }

  async function persistReorder(
    nextTasks: Task[],
    movedTaskId: string,
    fromStatus: TaskStatus,
    toStatus: TaskStatus,
  ) {
    const items = nextTasks
      .filter((t) => t.status === fromStatus || t.status === toStatus)
      .map((t) => ({
        id: t.id,
        status: t.status,
        position: t.position,
      }));

    try {
      const res = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          actor,
          movedTaskId,
          fromStatus,
          toStatus,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Reorder failed");
      }
      bumpLog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reorder failed");
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    }
  }

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);
    const task = tasks.find((t) => t.id === id);
    setDragFromStatus(task?.status ?? null);
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(groups, String(active.id));
    const overContainer = findContainer(groups, String(over.id));
    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    setTasks((prev) => {
      const current = groupByStatus(prev);
      const activeItems = [...current[activeContainer]];
      const overItems = [...current[overContainer]];
      const activeIndex = activeItems.findIndex((t) => t.id === active.id);
      if (activeIndex < 0) return prev;

      const [moved] = activeItems.splice(activeIndex, 1);
      const overIndex = overItems.findIndex((t) => t.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(insertAt, 0, { ...moved, status: overContainer });

      const next: Task[] = [];
      for (const status of TASK_STATUSES) {
        const list =
          status === activeContainer
            ? activeItems
            : status === overContainer
              ? overItems
              : current[status];
        list.forEach((t, i) => {
          next.push({ ...t, status, position: i });
        });
      }
      return next;
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const fromStatus = dragFromStatus;
    setActiveId(null);
    setDragFromStatus(null);
    if (!over || !fromStatus) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);
    const latest = tasksRef.current;

    const sameColumn = applySameColumnReorder(latest, activeTaskId, overId);
    const next = sameColumn ?? latest;
    if (sameColumn) setTasks(sameColumn);

    const moved = next.find((t) => t.id === activeTaskId);
    if (moved) {
      void persistReorder(next, activeTaskId, fromStatus, moved.status);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Tasks
          </h1>
          <p className="text-sm text-slate-500">
            Drag cards between columns or reorder within a column.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New task
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading board…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-2">
            {TASK_STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                tasks={groups[status]}
                onOpen={setSelected}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="w-72 rounded-lg border border-sky-300 bg-white p-3 opacity-95 shadow-lg">
                <p className="font-mono text-[11px] font-semibold text-sky-700">
                  {activeTask.code}
                </p>
                <p className="mt-1 text-sm font-medium">{activeTask.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <ActivityLogPanel refreshKey={logKey} />

      {selected && (
        <TaskModal
          task={selected}
          actor={actor}
          onClose={() => setSelected(null)}
          onSaved={(task) => {
            setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
            bumpLog();
          }}
          onDeleted={(id) => {
            setTasks((prev) => prev.filter((t) => t.id !== id));
            bumpLog();
          }}
        />
      )}

      {showNew && (
        <NewTaskForm
          actor={actor}
          onCancel={() => setShowNew(false)}
          onCreated={(task) => {
            setTasks((prev) => [...prev, task]);
            setShowNew(false);
            bumpLog();
          }}
        />
      )}
    </div>
  );
}
