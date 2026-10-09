import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";
import { getClientIp } from "@/lib/ip";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isTaskAssignee } from "@/lib/tasks";
import type { TaskComment } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", id)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("task_comments")
    .select("*")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: (data ?? []) as TaskComment[] });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await context.params;

  let body: { author?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isTaskAssignee(body.author)) {
    return NextResponse.json(
      { error: "Select who is writing the comment" },
      { status: 400 },
    );
  }

  const text = body.body?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, code")
    .eq("id", id)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: id,
      author: body.author,
      body: text,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const comment = data as TaskComment;
  await logActivity({
    entity_type: "task",
    entity_id: String(task.code),
    actor: body.author,
    ip_address: getClientIp(request),
    action: `Commented on ${task.code}: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`,
  });

  return NextResponse.json({ comment }, { status: 201 });
}
