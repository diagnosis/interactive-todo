-- +goose Up
-- +goose StatementBegin

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role') THEN
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');
END IF;
END
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS teams (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT       NOT NULL,
    owner_id   UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS team_members (
    team_id    UUID       NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id    UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       team_role  NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id)
    );

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
DROP TYPE IF EXISTS team_role;
-- +goose StatementEnd