import { TASK_PEOPLE } from "@/lib/constants";
import type { Task, TaskAssignee, TaskLink } from "@/types";

export function isTaskAssignee(value: unknown): value is TaskAssignee {
  return typeof value === "string" && (TASK_PEOPLE as string[]).includes(value);
}

export function normalizeAssignees(value: unknown): TaskAssignee[] {
  if (Array.isArray(value)) {
    return value.filter(isTaskAssignee);
  }
  if (isTaskAssignee(value)) {
    return [value];
  }
  return [];
}

export function normalizeLinks(value: unknown): TaskLink[] {
  if (!Array.isArray(value)) return [];
  const links: TaskLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const url = typeof (item as TaskLink).url === "string"
      ? (item as TaskLink).url.trim()
      : "";
    if (!url) continue;
    const rawLabel = (item as TaskLink).label;
    const label =
      typeof rawLabel === "string" ? rawLabel.trim() || undefined : undefined;
    links.push(label ? { url, label } : { url });
  }
  return links;
}

export function normalizeTask(row: Record<string, unknown>): Task {
  const assignees = normalizeAssignees(
    row.assignees ?? row.assignee ?? [],
  );
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    estimate: Number(row.estimate),
    assignees,
    links: normalizeLinks(row.links),
    status: row.status as Task["status"],
    position: Number(row.position),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function parseAssigneesInput(value: unknown): TaskAssignee[] | null {
  if (value === undefined) return null;
  if (value === null) return [];
  if (!Array.isArray(value)) return null;
  const assignees = value.filter(isTaskAssignee);
  if (assignees.length !== value.length) return null;
  return [...new Set(assignees)];
}

export function parseLinksInput(value: unknown): TaskLink[] | null {
  if (value === undefined) return null;
  if (value === null) return [];
  if (!Array.isArray(value)) return null;
  try {
    return normalizeLinks(value);
  } catch {
    return null;
  }
}

export function sameAssignees(a: TaskAssignee[], b: TaskAssignee[]) {
  const left = [...a].sort().join(",");
  const right = [...b].sort().join(",");
  return left === right;
}

export function sameLinks(a: TaskLink[], b: TaskLink[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}
