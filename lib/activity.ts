import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { EntityType } from "@/types";

export async function logActivity(params: {
  entity_type: EntityType;
  entity_id: string;
  actor?: string | null;
  ip_address?: string | null;
  action: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("activity_log").insert({
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    actor: params.actor ?? null,
    ip_address: params.ip_address ?? null,
    action: params.action,
  });

  if (error) {
    console.error("Failed to write activity_log:", error.message);
  }
}
