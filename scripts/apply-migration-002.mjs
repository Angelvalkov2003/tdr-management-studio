import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password =
    process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  if (!url || !password) return null;

  const ref = url.replace("https://", "").replace(".supabase.co", "").split("/")[0];
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
}

const sqlPath = path.join(
  root,
  "supabase",
  "migrations",
  "002_task_assignees_links_comments.sql",
);
const sql = fs.readFileSync(sqlPath, "utf8");
const connectionString = buildConnectionString();

if (!connectionString) {
  console.error(
    "Missing DATABASE_URL / SUPABASE_DB_URL / SUPABASE_DB_PASSWORD. Cannot apply migration automatically.",
  );
  process.exit(2);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Migration 002 applied successfully.");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
