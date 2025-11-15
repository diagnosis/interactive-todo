package app

import "log/slog"

type Application struct {
	Logger slog.Logger
}

func NewApplication() *Application {
	return &Application{}
}
