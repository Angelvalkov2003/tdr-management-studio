import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";
import { getClientIp } from "@/lib/ip";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { STATUS_LABELS, TASK_STATUSES } from "@/lib/constants";
import {
  normalizeTask,
  parseAssigneesInput,
  parseLinksInput,
} from "@/lib/tasks";
import type { TaskStatus } from "@/types";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tasks = (data ?? []).map((row) =>
    normalizeTask(row as Record<string, unknown>),
  );
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  let body: {
    title?: string;
    description?: string | null;
    estimate?: number;
    assignees?: unknown;
    links?: unknown;
    status?: TaskStatus;
    actor?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const estimate = body.estimate ?? 1;
  if (!Number.isInteger(estimate) || estimate < 1 || estimate > 10) {
    return NextResponse.json(
      { error: "Estimate must be an integer from 1 to 10" },
      { status: 400 },
    );
  }

  const status: TaskStatus = body.status ?? "idea";
  if (!TASK_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const assignees = parseAssigneesInput(body.assignees ?? []);
  if (assignees === null) {
    return NextResponse.json({ error: "Invalid assignees" }, { status: 400 });
  }

  const links = parseLinksInput(body.links ?? []);
  if (links === null) {
    return NextResponse.json({ error: "Invalid links" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("tasks")
    .select("position")
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description: body.description?.trim() || null,
      estimate,
      assignees,
      links,
      status,
      position: nextPosition,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const task = normalizeTask(data as Record<string, unknown>);
  await logActivity({
    entity_type: "task",
    entity_id: task.code,
    actor: body.actor ?? null,
    ip_address: getClientIp(request),
    action: `Created ${task.code}: "${task.title}" (${STATUS_LABELS[status]})`,
  });

  return NextResponse.json({ task }, { status: 201 });
}
