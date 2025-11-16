package auth

import (
	"errors"
	"time"

	store "github.com/diagnosis/interactive-todo/internal/store/users"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims embedded in JWT
type Claims struct {
	UserID   uuid.UUID      `json:"user_id"`
	Email    string         `json:"email"`
	UserType store.UserType `json:"user_type"`
	jwt.RegisteredClaims
}

// Config holds JWT settings
type Config struct {
	AccessSecret       string
	RefreshSecret      string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
	Issuer             string
}

// TokenManager handles JWT operations
type TokenManager interface {
	// Generate refresh_tokens (only return the token string)
	MintAccessToken(userID uuid.UUID, email string, userType store.UserType) (string, error)
	MintRefreshToken(userID uuid.UUID) (string, error)

	// Validate refresh_tokens (return claims if valid)
	ValidateAccessToken(tok string) (*Claims, error)
	ValidateRefreshToken(tok string) (*Claims, error)
}

type JWTManager struct {
	config *Config
}

func NewJWTManager(cfg *Config) *JWTManager {
	return &JWTManager{config: cfg}
}
func (m *JWTManager) MintAccessToken(userID uuid.UUID, email string, userType store.UserType) (string, error) {
	now := time.Now().UTC()
	regClaims := jwt.RegisteredClaims{
		Issuer:   m.config.Issuer,
		Audience: []string{"interactive todo frontend"},
		Subject:  userID.String(),

		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(m.config.AccessTokenExpiry)),
	}
	claims := Claims{
		UserID:           userID,
		Email:            email,
		UserType:         userType,
		RegisteredClaims: regClaims,
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedTok, err := tok.SignedString([]byte(m.config.AccessSecret))
	return signedTok, err
}
func (m *JWTManager) MintRefreshToken(userID uuid.UUID) (string, error) {
	now := time.Now().UTC()
	reqClaims := jwt.RegisteredClaims{
		Issuer:   m.config.Issuer,
		Audience: []string{"interactive todo frontend"},
		Subject:  userID.String(),

		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(m.config.RefreshTokenExpiry)),
	}
	claims := Claims{
		UserID:           userID,
		RegisteredClaims: reqClaims,
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedTok, err := tok.SignedString([]byte(m.config.RefreshSecret))
	return signedTok, err
}

func (m *JWTManager) ValidateAccessToken(tokenString string) (*Claims, error) {
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuedAt(), jwt.WithExpirationRequired(), jwt.WithIssuer(m.config.Issuer),
		jwt.WithLeeway(30*time.Second),
	)
	var claims Claims
	token, err := parser.ParseWithClaims(tokenString, &claims, func(token *jwt.Token) (any, error) {
		return []byte(m.config.AccessSecret), nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	return &claims, nil
}
func (m *JWTManager) ValidateRefreshToken(tokenString string) (*Claims, error) {
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuedAt(), jwt.WithExpirationRequired(), jwt.WithIssuer(m.config.Issuer),
		jwt.WithLeeway(30*time.Second),
	)
	var claims Claims
	token, err := parser.ParseWithClaims(tokenString, &claims, func(token *jwt.Token) (any, error) {
		return []byte(m.config.RefreshSecret), nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, err
	}
	return &claims, nil

}

var _ TokenManager = (*JWTManager)(nil)
