import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
