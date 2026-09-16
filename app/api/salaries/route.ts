import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";
import { getClientIp } from "@/lib/ip";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { MONTH_NAMES, SALARY_PEOPLE } from "@/lib/constants";
import type { SalaryPerson, SalaryRecord } from "@/types";

export async function GET(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("salary_records")
    .select("*")
    .eq("year", year);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    year,
    records: (data ?? []) as SalaryRecord[],
  });
}

export async function PUT(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  let body: {
    person?: SalaryPerson;
    year?: number;
    month?: number;
    paid?: boolean;
    days_paid?: number | null;
    actor?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { person, year, month, paid, days_paid, actor } = body;

  if (!person || !SALARY_PEOPLE.includes(person)) {
    return NextResponse.json({ error: "Invalid person" }, { status: 400 });
  }
  if (!year || !Number.isInteger(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  if (!month || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  if (typeof paid !== "boolean") {
    return NextResponse.json({ error: "paid is required" }, { status: 400 });
  }
  if (
    days_paid !== undefined &&
    days_paid !== null &&
    (!Number.isInteger(days_paid) || days_paid < 0 || days_paid > 31)
  ) {
    return NextResponse.json({ error: "Invalid days_paid" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("salary_records")
    .upsert(
      {
        person,
        year,
        month,
        paid,
        days_paid: days_paid ?? null,
      },
      { onConflict: "person,year,month" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const record = data as SalaryRecord;
  const monthName = MONTH_NAMES[month - 1];
  let action: string;
  if (paid) {
    action =
      days_paid != null && days_paid > 0
        ? `Marked ${person} as paid for ${monthName} ${year} (${days_paid} days)`
        : `Marked ${person} as paid for ${monthName} ${year}`;
  } else {
    action = `Marked ${person} as unpaid for ${monthName} ${year}`;
  }

  await logActivity({
    entity_type: "salary",
    entity_id: `${person}-${year}-${month}`,
    actor: actor ?? null,
    ip_address: getClientIp(request),
    action,
  });

  return NextResponse.json({ record });
}
