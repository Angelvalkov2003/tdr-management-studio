import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";
import { getClientIp } from "@/lib/ip";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { STATUS_LABELS, TASK_PEOPLE, TASK_STATUSES } from "@/lib/constants";
import type { Task, TaskAssignee, TaskStatus } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await context.params;

  let body: {
    title?: string;
    description?: string | null;
    estimate?: number;
    assignee?: TaskAssignee | null;
    status?: TaskStatus;
    position?: number;
    actor?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const current = existing as Task;
  const updates: Record<string, unknown> = {};
  const changes: string[] = [];

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (title !== current.title) {
      updates.title = title;
      changes.push(`title → "${title}"`);
    }
  }

  if (body.description !== undefined) {
    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;
    if (description !== current.description) {
      updates.description = description;
      changes.push("description updated");
    }
  }

  if (body.estimate !== undefined) {
    if (
      !Number.isInteger(body.estimate) ||
      body.estimate < 1 ||
      body.estimate > 10
    ) {
      return NextResponse.json(
        { error: "Estimate must be an integer from 1 to 10" },
        { status: 400 },
      );
    }
    if (body.estimate !== current.estimate) {
      updates.estimate = body.estimate;
      changes.push(`estimate → ${body.estimate}`);
    }
  }

  if (body.assignee !== undefined) {
    const assignee = body.assignee;
    if (assignee !== null && !TASK_PEOPLE.includes(assignee)) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }
    if (assignee !== current.assignee) {
      updates.assignee = assignee;
      changes.push(`assignee → ${assignee ?? "None"}`);
    }
  }

  if (body.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.status !== current.status) {
      updates.status = body.status;
      changes.push(
        `status ${STATUS_LABELS[current.status]} → ${STATUS_LABELS[body.status]}`,
      );
    }
  }

  if (body.position !== undefined) {
    if (!Number.isInteger(body.position) || body.position < 0) {
      return NextResponse.json({ error: "Invalid position" }, { status: 400 });
    }
    if (body.position !== current.position) {
      updates.position = body.position;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ task: current });
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const task = data as Task;
  if (changes.length > 0) {
    await logActivity({
      entity_type: "task",
      entity_id: task.code,
      actor: body.actor ?? null,
      ip_address: getClientIp(request),
      action: `Updated ${task.code}: ${changes.join("; ")}`,
    });
  }

  return NextResponse.json({ task });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await context.params;

  let actor: string | null = null;
  try {
    const body = await request.json();
    actor = body.actor ?? null;
  } catch {
    // optional body
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = existing as Task;
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    entity_type: "task",
    entity_id: task.code,
    actor,
    ip_address: getClientIp(request),
    action: `Deleted ${task.code}: "${task.title}"`,
  });

  return NextResponse.json({ ok: true });
}
