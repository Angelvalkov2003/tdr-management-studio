import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";
import { getClientIp } from "@/lib/ip";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { STATUS_LABELS, TASK_STATUSES } from "@/lib/constants";
import type { Task, TaskStatus } from "@/types";

type MoveItem = {
  id: string;
  status: TaskStatus;
  position: number;
};

export async function POST(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  let body: {
    items?: MoveItem[];
    actor?: string | null;
    movedTaskId?: string;
    fromStatus?: TaskStatus;
    toStatus?: TaskStatus;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  for (const item of items) {
    if (!item.id || !TASK_STATUSES.includes(item.status)) {
      return NextResponse.json({ error: "Invalid item" }, { status: 400 });
    }
    if (!Number.isInteger(item.position) || item.position < 0) {
      return NextResponse.json({ error: "Invalid position" }, { status: 400 });
    }
  }

  const supabase = getSupabaseAdmin();
  const ids = items.map((i) => i.id);

  const { data: beforeRows, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .in("id", ids);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const beforeMap = new Map(
    ((beforeRows ?? []) as Task[]).map((t) => [t.id, t]),
  );

  const results: Task[] = [];
  for (const item of items) {
    const { data, error } = await supabase
      .from("tasks")
      .update({ status: item.status, position: item.position })
      .eq("id", item.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    results.push(data as Task);
  }

  const movedId = body.movedTaskId;
  if (movedId && body.fromStatus && body.toStatus) {
    const task = beforeMap.get(movedId) ?? results.find((t) => t.id === movedId);
    if (task) {
      const from = body.fromStatus;
      const to = body.toStatus;
      const action =
        from === to
          ? `Reordered ${task.code} within ${STATUS_LABELS[to]}`
          : `Moved ${task.code} from ${STATUS_LABELS[from]} to ${STATUS_LABELS[to]}`;

      await logActivity({
        entity_type: "task",
        entity_id: task.code,
        actor: body.actor ?? null,
        ip_address: getClientIp(request),
        action,
      });
    }
  }

  return NextResponse.json({ tasks: results });
}
