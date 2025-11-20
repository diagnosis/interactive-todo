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
	"github.com/go-chi/chi/v5"
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

// =====================
//  Update user_type
// =====================

func (h *AuthHandler) HandleUpdateUserType(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	adminID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Error(ctx, "update user_type: unauthorized")
		helper.RespondError(w, r, apperror.Unauthorized("access not authorized"))
		return
	}

	idStr := chi.URLParam(r, "user_id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		logger.Error(ctx, "update user_type: bad id", "id", idStr, "err", err)
		helper.RespondError(w, r, apperror.BadRequest("bad id"))
		return
	}

	if userID == adminID {
		helper.RespondError(w, r, apperror.Forbidden("cannot change your own user_type"))
		return
	}

	adminUser, err := h.userStore.GetUserByID(ctx, adminID)
	if err != nil {
		logger.Error(ctx, "update user_type: get admin user failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if adminUser.UserType != userstore.TypeAdmin {
		helper.RespondError(w, r, apperror.Forbidden("forbidden"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	var in struct {
		UserType userstore.UserType `json:"user_type"`
	}

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&in); err != nil {
		logger.Error(ctx, "update user_type: bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("bad json"))
		return
	}

	switch in.UserType {
	case userstore.TypeEmployee, userstore.TypeAdmin, userstore.TypeTaskManager:
		// ok
	default:
		helper.RespondError(w, r, apperror.BadRequest("invalid user_type"))
		return
	}

	updatedUser, err := h.userStore.UpdateUserType(ctx, userID, in.UserType)
	if err != nil {
		if errors.Is(err, userstore.ErrNotFound) {
			logger.Info(ctx, "update user_type: user not found", "user_id", userID)
			helper.RespondError(w, r, apperror.NotFound("user not found"))
			return
		}
		logger.Error(ctx, "update user_type: internal error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	logger.Info(ctx, "user_type updated",
		"user_id", updatedUser.ID,
		"user_type", updatedUser.UserType,
	)

	response := map[string]any{
		"message": "user_type updated successfully",
		"user":    updatedUser,
	}
	helper.RespondJSON(w, r, http.StatusOK, response)
}

// =====================
//  Register
// =====================

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "register: attempt")

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&in); err != nil {
		logger.Error(ctx, "register: bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("bad json"))
		return
	}

	email := strings.TrimSpace(strings.ToLower(in.Email))
	password := strings.TrimSpace(in.Password)

	if len(email) < 4 || !strings.Contains(email, "@") {
		logger.Info(ctx, "register: invalid email", "email", email)
		helper.RespondError(w, r, apperror.BadRequest("Invalid email address"))
		return
	}
	if len(password) < 8 {
		logger.Info(ctx, "register: password too short")
		helper.RespondError(w, r, apperror.BadRequest("Password must be at least 8 characters"))
		return
	}

	passwordHash, err := secure.HashPassword(password)
	if err != nil {
		logger.Error(ctx, "register: hash password failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal server error", err))
		return
	}

	now := time.Now().UTC()
	created, err := h.userStore.Create(ctx, email, passwordHash, userstore.TypeEmployee, now)
	if err != nil {
		if errors.Is(err, userstore.ErrDuplicatedEmail) {
			logger.Info(ctx, "register: email already exists", "email", email)
			helper.RespondError(w, r, apperror.EmailAlreadyExists())
			return
		}
		logger.Error(ctx, "register: create user failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal server error", err))
		return
	}

	logger.Info(ctx, "register: user created",
		"user_id", created.ID,
		"email", created.Email,
		"user_type", created.UserType,
	)

	response := map[string]any{
		"user_id":    created.ID,
		"email":      created.Email,
		"user_type":  created.UserType,
		"created_at": created.CreatedAt,
	}
	helper.RespondJSON(w, r, http.StatusCreated, response)
}

// =====================
//  Login
// =====================

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "login: attempt")

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&in); err != nil {
		logger.Error(ctx, "login: bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("bad json"))
		return
	}

	email := strings.TrimSpace(strings.ToLower(in.Email))
	password := strings.TrimSpace(in.Password)

	if len(email) < 4 || !strings.Contains(email, "@") {
		logger.Info(ctx, "login: invalid email format", "email", email)
		helper.RespondError(w, r, apperror.InvalidCredentials())
		return
	}
	if len(password) < 8 {
		logger.Info(ctx, "login: password too short")
		helper.RespondError(w, r, apperror.InvalidCredentials())
		return
	}

	user, err := h.userStore.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, userstore.ErrNotFound) {
			logger.Info(ctx, "login: email not found", "email", email)
			helper.RespondError(w, r, apperror.InvalidCredentials())
			return
		}
		logger.Error(ctx, "login: get user failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	valid, err := secure.VerifyPassword(password, user.PasswordHash)
	if err != nil {
		logger.Error(ctx, "login: verify password error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if !valid {
		logger.Info(ctx, "login: wrong password", "user_id", user.ID)
		helper.RespondError(w, r, apperror.InvalidCredentials())
		return
	}

	accessToken, err := h.jwtManager.MintAccessToken(user.ID, user.Email, user.UserType)
	if err != nil {
		logger.Error(ctx, "login: mint access token failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	refreshToken, err := h.jwtManager.MintRefreshToken(user.ID)
	if err != nil {
		logger.Error(ctx, "login: mint refresh token failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	sha := sha256.Sum256([]byte(refreshToken))
	tokenHash := fmt.Sprintf("%x", sha[:])
	ua := r.UserAgent()
	ip := getClientIP(r)
	now := time.Now().UTC()
	expiresAt := now.Add(7 * 24 * time.Hour)

	// Revoke old tokens for this user on login (one-session style)
	_ = h.refreshStore.RevokeAllForUser(ctx, user.ID, now)

	if _, err = h.refreshStore.Create(ctx, user.ID, tokenHash, expiresAt, ua, net.ParseIP(ip)); err != nil {
		logger.Error(ctx, "login: create refresh token failed", "err", err)
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

// =====================
//  Refresh Access Token
// =====================

func (h *AuthHandler) RefreshAccessToken(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "refresh token: attempt")

	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		logger.Info(ctx, "refresh token: no refresh cookie")
		helper.RespondError(w, r, apperror.Unauthorized("refresh token required"))
		return
	}

	refreshToken := cookie.Value

	if _, err := h.jwtManager.ValidateRefreshToken(refreshToken); err != nil {
		logger.Error(ctx, "refresh token: validate failed", "err", err)
		helper.RespondError(w, r, apperror.Unauthorized("invalid refresh token"))
		return
	}

	sha := sha256.Sum256([]byte(refreshToken))
	tokenHash := fmt.Sprintf("%x", sha[:])

	storedToken, err := h.refreshStore.GetByHash(ctx, tokenHash)
	if err != nil {
		logger.Info(ctx, "refresh token: invalid or expired token")
		helper.RespondError(w, r, apperror.Unauthorized("invalid or expired token"))
		return
	}

	user, err := h.userStore.GetUserByID(ctx, storedToken.UserID)
	if err != nil {
		logger.Error(ctx, "refresh token: get user failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	accessToken, err := h.jwtManager.MintAccessToken(user.ID, user.Email, user.UserType)
	if err != nil {
		logger.Error(ctx, "refresh token: mint access failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	// Rotate refresh token
	if err := h.rotateRefresh(w, r, storedToken.TokenHash, user.ID); err != nil {
		logger.Error(ctx, "refresh token: rotate refresh failed", "err", err)
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

// =====================
//  Logout (single device)
// =====================

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "logout: attempt")

	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		// No cookie, just clean client state
		cleanRefreshToken(w)
		helper.RespondMessage(w, r, http.StatusOK, "log out successfully")
		return
	}

	sha := sha256.Sum256([]byte(cookie.Value))
	tokenHash := fmt.Sprintf("%x", sha[:])

	_ = h.refreshStore.Revoke(ctx, tokenHash, time.Now().UTC())
	cleanRefreshToken(w)

	logger.Info(ctx, "logout: success")
	helper.RespondMessage(w, r, http.StatusOK, "logged out successfully")
}

// =====================
//  Logout from all devices
// =====================

func (h *AuthHandler) LogoutFromAllDevices(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "logout all: attempt")

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Error(ctx, "logout all: no user id in context")
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}

	if err := h.refreshStore.RevokeAllForUser(ctx, userID, time.Now().UTC()); err != nil {
		logger.Error(ctx, "logout all: revoke all failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	cleanRefreshToken(w)

	logger.Info(ctx, "logout all: success", "user_id", userID)
	helper.RespondMessage(w, r, http.StatusOK, "logged out from all devices successfully")
}

// =====================
//  List Users
// =====================

func (h *AuthHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "list users: start")

	users, err := h.userStore.ListAll(ctx)
	if err != nil {
		logger.Error(ctx, "list users: store error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	response := make([]map[string]any, len(users))
	for i, user := range users {
		response[i] = map[string]any{
			"id":        user.ID,
			"email":     user.Email,
			"user_type": user.UserType,
		}
	}

	logger.Info(ctx, "list users: success", "count", len(users))
	helper.RespondJSON(w, r, http.StatusOK, response)
}

// =====================
//  Token cleanup (cron-ish)
// =====================

func (h *AuthHandler) CleanupExpiredTokens() {
	ctx := context.Background()

	// Delete all tokens that expired more than 24 hours ago
	cutoff := time.Now().UTC().Add(-24 * time.Hour)

	if err := h.refreshStore.DeleteExpired(ctx, cutoff); err != nil {
		logger.Error(ctx, "cleanup tokens: failed", "err", err)
	} else {
		logger.Info(ctx, "cleanup tokens: expired tokens cleaned up")
	}
}

// =====================
//  Helpers
// =====================

func getClientIP(r *http.Request) string {
	// Prefer X-Forwarded-For (first IP)
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}

	// Fallback to X-Real-IP
	if xRealIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); xRealIP != "" {
		return xRealIP
	}

	// Finally, use RemoteAddr (host:port)
	remote := strings.TrimSpace(r.RemoteAddr)
	if remote == "" {
		return ""
	}

	host, _, err := net.SplitHostPort(remote)
	if err != nil {
		// If it fails (e.g., no port), just return raw
		return remote
	}
	return host
}

func setRefreshTokenCookie(w http.ResponseWriter, refreshToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // set to true in production with HTTPS
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

// oldToken is the HASH, not the raw token
func (h *AuthHandler) rotateRefresh(w http.ResponseWriter, r *http.Request, oldTokenHash string, userID uuid.UUID) error {
	ctx := r.Context()

	// Revoke old hashed token
	if err := h.refreshStore.Revoke(ctx, oldTokenHash, time.Now().UTC()); err != nil {
		return fmt.Errorf("failed to revoke old token %w", err)
	}

	// Mint new refresh token
	refreshToken, err := h.jwtManager.MintRefreshToken(userID)
	if err != nil {
		return fmt.Errorf("failed to mint refresh token %w", err)
	}

	sha := sha256.Sum256([]byte(refreshToken))
	tokenHash := fmt.Sprintf("%x", sha[:])
	ua := r.UserAgent()
	ip := getClientIP(r)
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)

	if _, err = h.refreshStore.Create(ctx, userID, tokenHash, expiresAt, ua, net.ParseIP(ip)); err != nil {
		return fmt.Errorf("failed to create refresh token %w", err)
	}

	setRefreshTokenCookie(w, refreshToken)
	return nil
}
