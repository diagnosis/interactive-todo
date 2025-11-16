package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/diagnosis/interactive-todo/internal/apperror"
	auth "github.com/diagnosis/interactive-todo/internal/auth/jwt"
	"github.com/diagnosis/interactive-todo/internal/helper"
	"github.com/diagnosis/interactive-todo/internal/logger"
	"github.com/google/uuid"
)

type contextKey string

const claimsKey contextKey = "claims"

type AuthMiddleware struct {
	jwtManager auth.TokenManager
}

func NewAuthMiddleware(jm auth.TokenManager) *AuthMiddleware {
	return &AuthMiddleware{
		jwtManager: jm,
	}
}

func (m *AuthMiddleware) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		accessToken, err := ExtractAccessTokenFromBearer(r.Header.Get("Authorization"))
		if err != nil {
			logger.Error(ctx, "failed to extract token", "err", err)
			helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
			return
		}

		claims, err := m.jwtManager.ValidateAccessToken(accessToken)
		if err != nil {
			logger.Info(ctx, "failed to validate token", "err", err)
			helper.RespondError(w, r, apperror.Unauthorized("invalid or expired token"))
			return
		}
		ctx = ContextWithClaims(ctx, claims)

		next.ServeHTTP(w, r.WithContext(ctx))

	})
}

func ExtractAccessTokenFromBearer(token string) (string, error) {
	if token == "" {
		return "", errors.New("no token")
	}
	if !strings.HasPrefix(token, "Bearer ") {
		return "", errors.New("invalid authorization header")
	}
	accessToken := strings.TrimPrefix(token, "Bearer ")
	if accessToken == "" {
		return "", errors.New("no access token")
	}
	return accessToken, nil
}

func ContextWithClaims(ctx context.Context, claims *auth.Claims) context.Context {
	return context.WithValue(ctx, claimsKey, claims)
}
func GetClaimsFromContext(ctx context.Context) (*auth.Claims, bool) {
	claims, ok := ctx.Value(claimsKey).(*auth.Claims)
	if !ok {
		return nil, false
	}
	return claims, true
}

func GetUserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	claims, ok := GetClaimsFromContext(ctx)
	if !ok {
		return uuid.Nil, false
	}
	return claims.UserID, true

}
