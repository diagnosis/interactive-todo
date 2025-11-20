-- +goose Up
-- +goose StatementBegin

-- Ensure team_id is NOT NULL (safe to run even if it's already NOT NULL)
ALTER TABLE tasks
    ALTER COLUMN team_id SET NOT NULL;

-- Add FK only if it does NOT already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_tasks_team'
          AND table_name = 'tasks'
          AND constraint_type = 'FOREIGN KEY'
    ) THEN
ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_team
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
END IF;
END
$$;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS fk_tasks_team;

ALTER TABLE tasks
    ALTER COLUMN team_id DROP NOT NULL;

-- +goose StatementEnd