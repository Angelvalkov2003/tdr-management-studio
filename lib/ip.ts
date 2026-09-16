import type { NextRequest } from "next/server";

export function getClientIp(request: NextRequest | Request): string | null {
  const headers =
    "headers" in request
      ? request.headers
      : (request as NextRequest).headers;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}
