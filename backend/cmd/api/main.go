package main

import (
	"context"
	"os"

	"github.com/diagnosis/interactive-todo/app/internal/logger"
	"github.com/diagnosis/interactive-todo/app/internal/store/database"
	"github.com/diagnosis/interactive-todo/app/migrations"
	_ "github.com/joho/godotenv/autoload"
)

func main() {
	env := os.Getenv("APP_ENV")
	//define ctx
	ctx := context.Background()
	//logger
	logger.Info(ctx, "Launching the application...")
	var dsn string
	if env == "development" {
		dsn = os.Getenv("DATABASE_URL_DEV")
	} else {
		dsn = os.Getenv("DATABASE_URL_PROD")
	}
	if dsn == "" {
		logger.Error(ctx, "DATABASE_URL is not set")
		os.Exit(1)
	}
	pool, err := store.OpenPool(dsn)
	if err != nil {
		logger.Error(ctx, "failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	logger.Info(ctx, "database connection established!")

	//migrate up
	if err = store.MigrateFS(dsn, migrations.FS, "."); err != nil {
		logger.Error(ctx, "failed to migrate", "error", err)
		os.Exit(1)
	}
}
