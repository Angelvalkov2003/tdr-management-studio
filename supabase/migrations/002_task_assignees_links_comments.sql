-- =============================================================================
-- Multi-assignee, links, and comments for tasks
-- =============================================================================

-- Assignees: text[] (migrate from single assignee if present)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assignees text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'assignee'
  ) THEN
    UPDATE tasks
    SET assignees = ARRAY[assignee]
    WHERE assignee IS NOT NULL
      AND (assignees = '{}' OR assignees IS NULL);

    ALTER TABLE tasks DROP COLUMN assignee;
  END IF;
END $$;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignees_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_assignees_check
  CHECK (
    assignees <@ ARRAY['Pavel', 'Angel', 'Tonislav', 'Hristo', 'Hakan']::text[]
  );

-- Links: [{ "url": "https://...", "label": "optional" }]
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_links_is_array;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_links_is_array
  CHECK (jsonb_typeof(links) = 'array');

-- Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author text NOT NULL
    CHECK (author IN ('Pavel', 'Angel', 'Tonislav', 'Hristo', 'Hakan')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_comments_task_id_created_at_idx
  ON task_comments (task_id, created_at ASC);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
