-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
    ADD COLUMN display_name TEXT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users
DROP COLUMN IF EXISTS display_name;
-- +goose StatementEnd