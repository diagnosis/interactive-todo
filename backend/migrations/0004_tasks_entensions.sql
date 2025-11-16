-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS task_extension_requests (

    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id        UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    requester_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_due_at     TIMESTAMPTZ NOT NULL,
    requested_due  TIMESTAMPTZ NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',  -- could be enum later
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_task_ext_task_id
    ON task_extension_requests(task_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_task_ext_task_id;
DROP TABLE IF EXISTS task_extension_requests;
-- +goose StatementEnd