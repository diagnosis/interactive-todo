package handler

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/diagnosis/interactive-todo/internal/apperror"
	jwttoken "github.com/diagnosis/interactive-todo/internal/auth/jwt"
	"github.com/diagnosis/interactive-todo/internal/helper"
	"github.com/diagnosis/interactive-todo/internal/logger"
	middleware "github.com/diagnosis/interactive-todo/internal/middleware/auth"
	secure "github.com/diagnosis/interactive-todo/internal/secure/password"
	refreshstore "github.com/diagnosis/interactive-todo/internal/store/refresh_tokens"
	userstore "github.com/diagnosis/interactive-todo/internal/store/users"
	"github.com/google/uuid"
)

type AuthHandler struct {
	userStore    userstore.UserStore
	refreshStore refreshstore.RefreshTokenStore
	jwtManager   jwttoken.TokenManager
}

func NewAuthHandler(
	us userstore.UserStore,
	rts refreshstore.RefreshTokenStore,
	jm jwttoken.TokenManager,
) *AuthHandler {
	return &AuthHandler{
		userStore:    us,
		refreshStore: rts,
		jwtManager:   jm,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	logger.Info(ctx, "register attempt")

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	err := dec.Decode(&in)
	if err != nil {
		logger.Error(ctx, "bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("bad json"))
		return
	}

	email := strings.TrimSpace(strings.ToLower(in.Email))
	password := strings.TrimSpace(in.Password)
	if len(email) < 4 || !strings.Contains(email, "@") {
		logger.Info(ctx, "bad email")
		helper.RespondError(w, r, apperror.BadRequest("Invalid email address"))
		return
	}
	if len(password) < 8 {
		logger.Info(ctx, "password short")
		helper.RespondError(w, r, apperror.BadRequest("Password must be at least 8 characters"))
		return
	}

	passwordHash, err := secure.HashPassword(password)
	if err != nil {
		logger.Error(ctx, "failed to hash password", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal server error", err))
		return
	}
	now := time.Now().UTC()
	created, err := h.userStore.Create(ctx, email, passwordHash, userstore.TypeEmployee, now)
	if err != nil {
		if errors.Is(err, userstore.ErrDuplicatedEmail) {
			logger.Info(ctx, "existing user")
			helper.RespondError(w, r, apperror.EmailAlreadyExists())
			return
		}
		logger.Error(ctx, "internal error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal server error", err))
		return
	}
	logger.Info(ctx, "user created", "userID", created.ID, "email", created.Email, "userType", created.UserType)
	response := map[string]any{
		"user_id":    created.ID,
		"email":      created.Email,
		"user_type":  created.UserType,
		"created_at": created.CreatedAt,
	}
	helper.RespondJSON(w, r, http.StatusCreated, response)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "login attempt")

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	err := dec.Decode(&in)
	if err != nil {
		logger.Error(ctx, "bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("bad json"))
		return
	}

	email := strings.TrimSpace(strings.ToLower(in.Email))
	password := strings.TrimSpace(in.Password)
	if len(email) < 4 || !strings.Contains(email, "@") {
		logger.Info(ctx, "bad email")
		helper.RespondError(w, r, apperror.InvalidCredentials())
		return
	}
	if len(password) < 8 {
		logger.Info(ctx, "invalid credentials attempt")
		helper.RespondError(w, r, apperror.InvalidCredentials())
		return
	}

	user, err := h.userStore.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, userstore.ErrNotFound) {
			logger.Info(ctx, "email not exist")
			helper.RespondError(w, r, apperror.InvalidCredentials())
			return
		}
		logger.Error(ctx, "internal error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	//compare password
	valid, err := secure.VerifyPassword(password, user.PasswordHash)
	if err != nil {
		logger.Error(ctx, "error validating password", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if !valid {
		logger.Info(ctx, "wrong password")
		helper.RespondError(w, r, apperror.InvalidCredentials())
		return
	}

	//access and refresh tokens
	accessToken, err := h.jwtManager.MintAccessToken(user.ID, user.Email, user.UserType)
	if err != nil {
		logger.Error(ctx, "error minting access token", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	refreshToken, err := h.jwtManager.MintRefreshToken(user.ID)
	if err != nil {
		logger.Error(ctx, "error minting refresh token", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	sha := sha256.Sum256([]byte(refreshToken))
	tokenHash := fmt.Sprintf("%x", sha[:])
	ua := r.UserAgent()
	//get ip
	ip := getClientIP(r)

	if _, err = h.refreshStore.Create(ctx, user.ID, tokenHash, time.Now().UTC().Add(7*24*time.Hour), ua, net.ParseIP(ip)); err != nil {
		logger.Error(ctx, "error inserting refresh token", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	setRefreshTokenCookie(w, refreshToken)
	response := map[string]any{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_in":   int((15 * time.Minute).Seconds()),
		"user": map[string]any{
			"id":    user.ID,
			"email": user.Email,
			"type":  user.UserType,
		},
	}
	helper.RespondJSON(w, r, http.StatusOK, response)

}
func (h *AuthHandler) RefreshAccessToken(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "refresh token attempt")

	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		logger.Info(ctx, "no refresh cookie")
		helper.RespondError(w, r, apperror.Unauthorized("refresh token required"))
		return
	}
	refreshToken := cookie.Value
	_, err = h.jwtManager.ValidateRefreshToken(refreshToken)
	if err != nil {
		logger.Error(ctx, "failed to validate refresh tok", "err", err)
		helper.RespondError(w, r, apperror.Unauthorized("invalid refresh token"))
		return
	}

	sha := sha256.Sum256([]byte(refreshToken))
	tokenHash := fmt.Sprintf("%x", sha[:])
	storedToken, err := h.refreshStore.GetByHash(ctx, tokenHash)
	if err != nil {
		// Any error from GetByHash means invalid token
		logger.Info(ctx, "invalid refresh token")
		helper.RespondError(w, r, apperror.Unauthorized("invalid or expired token"))
		return
	}

	user, err := h.userStore.GetUserByID(ctx, storedToken.UserID)
	if err != nil {
		logger.Error(ctx, "unable to fetch user data", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	accessToken, err := h.jwtManager.MintAccessToken(user.ID, user.Email, user.UserType)
	if err != nil {
		logger.Error(ctx, "unable to mint access token", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	//rotate refresh token
	err = h.rotateRefresh(w, r, storedToken.TokenHash, user.ID)
	if err != nil {
		logger.Error(ctx, "failed to refresh", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	response := map[string]any{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_in":   int((15 * time.Minute).Seconds()),
		"user": map[string]any{
			"id":    user.ID,
			"email": user.Email,
			"type":  user.UserType,
		},
	}
	helper.RespondJSON(w, r, http.StatusOK, response)

}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "logout attempt")

	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		cleanRefreshToken(w)
		helper.RespondMessage(w, r, http.StatusOK, "log out successfully")
		return
	}

	sha := sha256.Sum256([]byte(cookie.Value))
	tokenHash := fmt.Sprintf("%x", sha[:])
	_ = h.refreshStore.Revoke(ctx, tokenHash, time.Now().UTC())
	cleanRefreshToken(w)

	logger.Info(ctx, "logout successfully")
	helper.RespondMessage(w, r, http.StatusOK, "logged out successfully")
}
func (h *AuthHandler) LogoutFromAllDevices(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "logout from all devices attempt")

	// TODO: This needs auth middleware to extract userID from access token
	// For now, we can get it from refresh token cookie (your current approach)

	userId, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Error(ctx, "no user id")
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}

	// Revoke ALL tokens for this user
	err := h.refreshStore.RevokeAllForUser(ctx, userId, time.Now().UTC())
	if err != nil {
		logger.Error(ctx, "failed to revoke all tokens", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	cleanRefreshToken(w)
	logger.Info(ctx, "logged out from all devices", "userID", userId)
	helper.RespondMessage(w, r, http.StatusOK, "logged out from all devices successfully")
}

func (h *AuthHandler) CleanupExpiredTokens() {
	ctx := context.Background()

	// Delete all tokens that expired more than 24 hours ago
	cutoff := time.Now().UTC().Add(-24 * time.Hour)

	err := h.refreshStore.DeleteExpired(ctx, cutoff)
	if err != nil {
		logger.Error(ctx, "failed to cleanup tokens", "err", err)
	} else {
		logger.Info(ctx, "expired tokens cleaned up")
	}
}

//helpers

func getClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For can contain a comma-separated list of IPs
		// The first IP is usually the client's
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	if xRealIP := r.Header.Get("X-Real-IP"); xRealIP != "" {
		return strings.TrimSpace(xRealIP)
	}
	return r.RemoteAddr
}

func setRefreshTokenCookie(w http.ResponseWriter, refreshToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int((7 * 24 * time.Hour).Seconds()),
	})
}

func cleanRefreshToken(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (h *AuthHandler) rotateRefresh(w http.ResponseWriter, r *http.Request, oldToken string, userID uuid.UUID) error {
	ctx := r.Context()
	err := h.refreshStore.Revoke(ctx, oldToken, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("failed to revoke old token %w", err)
	}

	refreshToken, err := h.jwtManager.MintRefreshToken(userID)
	if err != nil {
		return fmt.Errorf("failed to mint refresh token %w", err)
	}
	sha := sha256.Sum256([]byte(refreshToken))
	tokenHash := fmt.Sprintf("%x", sha[:])
	ua := r.UserAgent()
	//get ip
	ip := getClientIP(r)

	if _, err = h.refreshStore.Create(ctx, userID, tokenHash, time.Now().UTC().Add(7*24*time.Hour), ua, net.ParseIP(ip)); err != nil {
		return fmt.Errorf("failed to create refresh token %w", err)
	}
	setRefreshTokenCookie(w, refreshToken)
	return nil
}
