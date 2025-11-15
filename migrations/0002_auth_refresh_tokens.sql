-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT        NOT NULL UNIQUE,
    issued_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    user_agent TEXT,
    ip         INET
    );

CREATE INDEX IF NOT EXISTS idx_refresh_user_id ON auth_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_hash    ON auth_refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_revoked ON auth_refresh_tokens(revoked_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS auth_refresh_tokens;
-- +goose StatementEnd