package routes

import (
	"net/http"
	"time"

	"github.com/diagnosis/interactive-todo/internal/app"
	corsmiddleware "github.com/diagnosis/interactive-todo/internal/middleware/cors"
	middleware "github.com/diagnosis/interactive-todo/internal/middleware/logger"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

func SetupRouter(application *app.Application) *chi.Mux {
	r := chi.NewRouter()

	// ===== Global middleware =====
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(60 * time.Second))
	r.Use(corsmiddleware.CorsHandler())

	// ===== Health check =====
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// ===== Auth routes (public + protected) =====
	r.Route("/auth", func(ar chi.Router) {
		// Public
		ar.Post("/register", application.AuthHandler.Register)
		ar.Post("/login", application.AuthHandler.Login)
		ar.Post("/refresh", application.AuthHandler.RefreshAccessToken)
		ar.Post("/logout", application.AuthHandler.Logout)

		// Protected
		ar.Group(func(par chi.Router) {
			par.Use(application.AuthMiddleware.RequireAuth)
			par.Patch("/{user_id}/update-usertype", application.AuthHandler.HandleUpdateUserType)
			par.Post("/logout-all", application.AuthHandler.LogoutFromAllDevices)
		})
	})

	// ===== Users (protected) =====
	r.Route("/users", func(ur chi.Router) {
		ur.Use(application.AuthMiddleware.RequireAuth)
		ur.Get("/", application.AuthHandler.ListUsers)
	})

	// ===== Teams (protected) =====
	r.Route("/teams", func(tr chi.Router) {
		tr.Use(application.AuthMiddleware.RequireAuth)
		tr.Use(middleware.LogUserInfo)
		// Create team, list teams current user belongs to
		tr.Post("/", application.TeamHandler.CreateTeam)
		tr.Get("/mine", application.TeamHandler.ListTeamsForUser)

		// Team-scoped actions
		tr.Route("/{team_id}", func(tr chi.Router) {
			// Team members management
			tr.Get("/members", application.TeamHandler.ListMembers)
			tr.Post("/members", application.TeamHandler.HandleAddMember)
			tr.Delete("/members/{user_id}", application.TeamHandler.RemoveMember)

			// Team-scoped task views
			tr.Get("/tasks", application.TaskHandler.ListTeamTasks)
			tr.Get("/tasks/assignee", application.TaskHandler.ListAssigneeTasksInTeam)
			tr.Get("/tasks/reporter", application.TaskHandler.ListReporterTasksInTeam)
		})
	})

	// ===== Tasks (protected, user-centric) =====
	r.Route("/tasks", func(tr chi.Router) {
		tr.Use(application.AuthMiddleware.RequireAuth)
		tr.Use(middleware.LogUserInfo)
		// Create a task in a given team
		tr.Post("/", application.TaskHandler.CreateTask)

		// User’s tasks across all teams
		tr.Get("/reporter", application.TaskHandler.ListTasksAsReporter)
		tr.Get("/assignee", application.TaskHandler.ListTasksAsAssignee)

		// Task-specific operations
		tr.Route("/{id}", func(tr chi.Router) {
			tr.Get("/", application.TaskHandler.GetTask)
			tr.Delete("/", application.TaskHandler.DeleteTask)
			tr.Patch("/assign", application.TaskHandler.AssignTask)
			tr.Patch("/status", application.TaskHandler.UpdateStatus)
			tr.Patch("/update-details", application.TaskHandler.HandlePatchTask)
		})
	})

	return r
}
