package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/diagnosis/interactive-todo/internal/app"
	"github.com/diagnosis/interactive-todo/internal/logger"
	routes "github.com/diagnosis/interactive-todo/internal/routes/chi_router"
	store "github.com/diagnosis/interactive-todo/internal/store/database"
	"github.com/diagnosis/interactive-todo/migrations"
	_ "github.com/joho/godotenv/autoload"
)

func main() {
	env := os.Getenv("APP_ENV")
	ctx := context.Background()
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
	if err = store.MigrateFS(dsn, migrations.FS, ""); err != nil {
		logger.Error(ctx, "failed to migrate", "error", err)
		os.Exit(1)
	}
	logger.Info(ctx, "migration is complete")

	//create application
	application := app.NewApplication(pool)
	logger.Info(ctx, "application initialized!")
	//router
	handler := routes.SetupRouter(application)

	//server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info(ctx, "starting server", "port", port)
		if err = srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			//
			logger.Error(ctx, "server failed to start", "error", err)
			os.Exit(1)
		}
	}()
	logger.Info(ctx, "server started successfully", "port", port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info(ctx, "shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err = srv.Shutdown(shutdownCtx); err != nil {
		logger.Error(ctx, "server forced to shutdown", "err", err)
	}
	logger.Info(ctx, "server exited gracefully")
}
