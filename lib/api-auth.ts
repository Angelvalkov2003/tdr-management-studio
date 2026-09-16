import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export async function requireAuth(): Promise<NextResponse | null> {
  const ok = await isAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
