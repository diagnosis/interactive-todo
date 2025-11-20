-- +goose Up
-- +goose StatementBegin
ALTER TABLE teams
    ADD CONSTRAINT uniq_team_name UNIQUE (name);
CREATE UNIQUE INDEX idx_uniq_team_name_ci ON teams (LOWER(name));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE teams
DROP CONSTRAINT IF EXISTS uniq_team_name;
DROP INDEX IF EXISTS idx_uniq_team_name_ci;
-- +goose StatementEnd