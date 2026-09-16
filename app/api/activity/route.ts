import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ActivityLog } from "@/types";

export async function GET(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const limitParam = request.nextUrl.searchParams.get("limit");
  const offsetParam = request.nextUrl.searchParams.get("offset");
  const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);
  const offset = Math.max(Number(offsetParam) || 0, 0);

  const supabase = getSupabaseAdmin();
  const { data, error, count } = await supabase
    .from("activity_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? []) as ActivityLog[];
  const total = count ?? entries.length;
  const hasMore = offset + entries.length < total;

  return NextResponse.json({
    entries,
    total,
    hasMore,
    nextOffset: offset + entries.length,
  });
}
