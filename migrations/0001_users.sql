-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
CREATE TYPE user_type AS ENUM ('employee', 'admin', 'task_manager');
END IF;
END
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         CITEXT       NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    user_type     user_type    NOT NULL DEFAULT 'employee',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- optional but nice: auto-update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();
-- +goose StatementEnd


-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_users_updated_at();
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_type;
-- (usually we leave extensions installed, so no DROP EXTENSION here)
-- +goose StatementEnd