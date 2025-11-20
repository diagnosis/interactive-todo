package app

import (
	"os"
	"time"

	jwttoken "github.com/diagnosis/interactive-todo/internal/auth/jwt"
	authhandler "github.com/diagnosis/interactive-todo/internal/handler/auth"
	taskhandler "github.com/diagnosis/interactive-todo/internal/handler/task_handler"
	teamHandler "github.com/diagnosis/interactive-todo/internal/handler/team"
	authmiddleware "github.com/diagnosis/interactive-todo/internal/middleware/auth"
	refreshtoken "github.com/diagnosis/interactive-todo/internal/store/refresh_tokens"
	taskstore "github.com/diagnosis/interactive-todo/internal/store/tasks"
	teamstore "github.com/diagnosis/interactive-todo/internal/store/teams"
	userstore "github.com/diagnosis/interactive-todo/internal/store/users"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Application struct {
	//Stores
	UserStore         userstore.UserStore
	TaskStore         taskstore.TaskStore
	RefreshTokenStore refreshtoken.RefreshTokenStore
	TeamStore         teamstore.TeamStore
	//Auth
	JWTManager     jwttoken.TokenManager
	AuthMiddleware *authmiddleware.AuthMiddleware

	//handler
	AuthHandler *authhandler.AuthHandler
	TaskHandler *taskhandler.TaskHandler
	TeamHandler *teamHandler.TeamHandler
	//Config
	JWTConfig *jwttoken.Config
}

func NewApplication(pool *pgxpool.Pool) *Application {
	accessSecret := os.Getenv("JWT_ACCESS_SECRET")
	refreshSecret := os.Getenv("JWT_REFRESH_SECRET")

	// ✅ Validate secrets are set
	if accessSecret == "" || refreshSecret == "" {
		panic("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment")
	}
	//jwt config
	jwtConfig := &jwttoken.Config{
		AccessSecret:       accessSecret,
		RefreshSecret:      refreshSecret,
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 7 * 24 * time.Hour,
		Issuer:             "interactive-todo",
	}
	//create jwt manager
	jwtManager := jwttoken.NewJWTManager(jwtConfig)

	//create store
	userStore := userstore.NewPGUserStore(pool)
	taskStore := taskstore.NewPGTaskStore(pool)
	refreshTokenStore := refreshtoken.NewPGRefreshTokenStore(pool)
	teamStore := teamstore.NewPGTeamStore(pool)

	//create middleware
	authMiddleware := authmiddleware.NewAuthMiddleware(jwtManager)

	//create handlers
	authHandler := authhandler.NewAuthHandler(userStore, refreshTokenStore, jwtManager)
	taskHandler := taskhandler.NewTaskHandler(taskStore, teamStore)
	teamHandler := teamHandler.NewTeamHandler(teamStore, userStore)

	return &Application{
		UserStore:         userStore,
		TaskStore:         taskStore,
		RefreshTokenStore: refreshTokenStore,
		JWTManager:        jwtManager,
		AuthMiddleware:    authMiddleware,
		AuthHandler:       authHandler,
		TaskHandler:       taskHandler,
		TeamHandler:       teamHandler,
		JWTConfig:         jwtConfig,
	}
}
