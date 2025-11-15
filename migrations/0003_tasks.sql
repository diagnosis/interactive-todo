-- +goose Up
-- +goose StatementBegin

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'done', 'canceled');
END IF;
END
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS tasks (
                                     id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            TEXT NOT NULL,
    description      TEXT,
    reporter_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignee_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    due_at           TIMESTAMPTZ NOT NULL,
    reminder_sent_at TIMESTAMPTZ,
    status           task_status NOT NULL DEFAULT 'open',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_tasks_due_at
    ON tasks(due_at);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_due
    ON tasks(assignee_id, due_at);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS tasks;
DROP TYPE IF EXISTS task_status;
-- +goose StatementEnd