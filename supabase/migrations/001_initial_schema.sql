-- =============================================================================
-- TDR Management Studio — initial Supabase / Postgres schema
-- =============================================================================
-- How to run (after you create a new Supabase project and get fresh keys):
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file and click Run
--   3. Copy URL + anon + service_role keys into .env.local
-- =============================================================================

-- Sequential codes: TDR-1, TDR-2, TDR-3, ...
CREATE SEQUENCE IF NOT EXISTS tasks_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_task_code()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'TDR-' || nextval('tasks_code_seq')::text;
END;
$$;

-- -----------------------------------------------------------------------------
-- tasks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL DEFAULT generate_task_code(),
  title text NOT NULL,
  description text,
  estimate integer NOT NULL CHECK (estimate >= 1 AND estimate <= 10),
  assignee text CHECK (
    assignee IS NULL
    OR assignee IN ('Pavel', 'Angel', 'Tonislav', 'Hristo', 'Hakan')
  ),
  status text NOT NULL DEFAULT 'idea'
    CHECK (status IN ('idea', 'todo', 'in_progress', 'done', 'abandoned')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_status_position_idx
  ON tasks (status, position);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- salary_records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person text NOT NULL
    CHECK (person IN ('Angel', 'Tonislav', 'Hristo', 'Hakan')),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  paid boolean NOT NULL DEFAULT false,
  days_paid integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person, year, month)
);

CREATE INDEX IF NOT EXISTS salary_records_year_person_idx
  ON salary_records (year, person);

DROP TRIGGER IF EXISTS salary_records_set_updated_at ON salary_records;
CREATE TRIGGER salary_records_set_updated_at
  BEFORE UPDATE ON salary_records
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- activity_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('task', 'salary')),
  entity_id text NOT NULL,
  actor text,
  ip_address text,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_created_at_idx
  ON activity_log (created_at DESC);

-- -----------------------------------------------------------------------------
-- Optional: open access via service role from the Next.js server only.
-- Client never talks to Supabase directly with the service role key.
-- If you enable RLS later, keep service-role bypass for server API routes.
-- -----------------------------------------------------------------------------
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- No public policies: browser uses Next.js API; server uses service role.
