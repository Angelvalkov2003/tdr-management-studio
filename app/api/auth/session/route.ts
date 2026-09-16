import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSessionToken } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";

export async function GET() {
  const store = await cookies();
  const authenticated = isValidSessionToken(store.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ authenticated });
}
