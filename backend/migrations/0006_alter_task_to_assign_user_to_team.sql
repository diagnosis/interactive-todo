-- +goose Up
-- +goose StatementBegin

ALTER TABLE tasks
    ADD COLUMN team_id UUID;

-- Create a team per reporter
INSERT INTO teams (id, owner_id, name, created_at, updated_at)
SELECT
    gen_random_uuid(),
    reporter_id,
    'Auto Team for ' || reporter_id,
    now(),
    now()
FROM tasks
GROUP BY reporter_id;

-- Attach each task to its reporter's team
UPDATE tasks t
SET team_id = tm.id
    FROM teams tm
WHERE
    tm.owner_id = t.reporter_id
  AND t.team_id IS NULL;

ALTER TABLE tasks
    ALTER COLUMN team_id SET NOT NULL,
    ADD CONSTRAINT fk_tasks_team
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- +goose StatementEnd