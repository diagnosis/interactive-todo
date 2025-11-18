package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/cors"
)

func CorsHandler() func(handler http.Handler) http.Handler {
	allowedOrigins := []string{"http://localhost:5173"}

	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		allowedOrigins = append(allowedOrigins, strings.Split(origins, ",")...)
	}

	return cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
		Debug:            os.Getenv("APP_ENV") != "production",
	})
}
