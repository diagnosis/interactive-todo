package routes

import (
	"net/http"
	"time"

	"github.com/diagnosis/interactive-todo/internal/app"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

func SetupRouter(application *app.Application) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(60 * time.Second))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Auth routes (public)
	r.Route("/auth", func(ar chi.Router) {
		ar.Post("/register", application.AuthHandler.Register)
		ar.Post("/login", application.AuthHandler.Login)
		ar.Post("/refresh", application.AuthHandler.RefreshAccessToken)
		ar.Post("/logout", application.AuthHandler.Logout)

		// Protected auth routes
		ar.Group(func(par chi.Router) {
			par.Use(application.AuthMiddleware.RequireAuth)
			par.Post("/logout-all", application.AuthHandler.LogoutFromAllDevices)
		})
	}) // ✅ Close auth routes HERE!

	// ✅ Task routes (OUTSIDE auth, at root level)
	r.Route("/tasks", func(tr chi.Router) {
		tr.Use(application.AuthMiddleware.RequireAuth)

		tr.Post("/", application.TaskHandler.CreateTask)
		tr.Get("/reporter", application.TaskHandler.ListTasksAsReporter)
		tr.Get("/assignee", application.TaskHandler.ListTaskAsAssignee) // ✅ Fixed typo

		tr.Route("/{id}", func(tr chi.Router) {
			tr.Get("/", application.TaskHandler.GetTask)              // ✅ Use 'tr'
			tr.Delete("/", application.TaskHandler.DeleteTask)        // ✅ Use 'tr'
			tr.Patch("/assign", application.TaskHandler.AssignTask)   // ✅ Use 'tr'
			tr.Patch("/status", application.TaskHandler.UpdateStatus) // ✅ Use 'tr'
		})
	})

	return r
}
