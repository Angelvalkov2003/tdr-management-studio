import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import pg from "pg";

/**
 * One-shot schema apply for migration 002.
 * Requires DATABASE_URL or SUPABASE_DB_PASSWORD in the server env,
 * and body: { password: ADMIN_PASSWORD }.
 */
export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.password || body.password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.DIRECT_URL ||
    buildPoolerUrl();

  if (!connectionString) {
    return NextResponse.json(
      {
        error:
          "Missing DATABASE_URL or SUPABASE_DB_PASSWORD. Add the DB password to .env.local, then retry.",
      },
      { status: 500 },
    );
  }

  const sqlPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "002_task_assignees_links_comments.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(sql);
    return NextResponse.json({ ok: true, applied: "002_task_assignees_links_comments.sql" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 },
    );
  } finally {
    await client.end().catch(() => {});
  }
}

function buildPoolerUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!url || !password) return null;
  const ref = url
    .replace("https://", "")
    .replace(".supabase.co", "")
    .split("/")[0];
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
}
