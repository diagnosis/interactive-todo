package middleware

import (
	"net/http"

	"github.com/diagnosis/interactive-todo/internal/helper"
	"github.com/diagnosis/interactive-todo/internal/logger"
	authmw "github.com/diagnosis/interactive-todo/internal/middleware/auth"
)

func LogUserInfo(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		userId, ok := authmw.GetUserIDFromContext(ctx)
		if !ok {
			// Not an error — could be public route
			logger.Debug(ctx, "no authenticated user for this request")
		}

		ip := helper.GetClientIP(r)
		ua := r.UserAgent()

		logger.Info(ctx, "request info",
			"user_id", userId,
			"ip", ip,
			"user_agent", ua,
			"method", r.Method,
			"path", r.URL.Path,
		)

		next.ServeHTTP(w, r)
	})
}
