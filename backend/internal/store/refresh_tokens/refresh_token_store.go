package store

import (
	"context"
	"errors"
	"net"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RefreshToken struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash string
	IssuedAt  time.Time
	ExpiresAt time.Time
	RevokedAt *time.Time
	UserAgent string
	IP        net.IP
}

type RefreshTokenStore interface {
	Create(ctx context.Context, userId uuid.UUID, tokenHash string, expiresAt time.Time, userAgent string, ip net.IP) (*RefreshToken, error)
	GetByHash(ctx context.Context, tokenHash string) (*RefreshToken, error)
	Revoke(ctx context.Context, tokenHash string, now time.Time) error
	RevokeAllForUser(ctx context.Context, userID uuid.UUID, now time.Time) error
	DeleteExpired(ctx context.Context, before time.Time) error
}
type PGRefreshTokenStore struct {
	pool *pgxpool.Pool
}

func NewPGRefreshTokenStore(pool *pgxpool.Pool) *PGRefreshTokenStore {
	return &PGRefreshTokenStore{pool: pool}
}
func (s *PGRefreshTokenStore) Create(ctx context.Context, userId uuid.UUID, tokenHash string, expiresAt time.Time, userAgent string, ip net.IP) (*RefreshToken, error) {
	now := time.Now().UTC()
	if expiresAt.Before(now) {
		return nil, errors.New("expiration must be in future")
	}
	q := `
		INSERT INTO auth_refresh_tokens (user_id, token_hash, issued_at,expires_at, user_agent, ip) 
										VALUES ($1, $2, $3, $4, $5, $6::inet)
										RETURNING id;
					`
	var t RefreshToken
	t.UserID = userId
	t.TokenHash = tokenHash
	t.ExpiresAt = expiresAt
	t.IssuedAt = now
	t.UserAgent = userAgent
	t.IP = ip

	if err := s.pool.QueryRow(ctx, q, userId, tokenHash, now, expiresAt, userAgent, ip).
		Scan(&t.ID); err != nil {
		return nil, err
	}
	return &t, nil
}

var (
	ErrTokenNotFound = errors.New("token not found")
)

func (s *PGRefreshTokenStore) GetByHash(ctx context.Context, tokenHash string) (*RefreshToken, error) {
	q := `SELECT id, user_id, token_hash, issued_at, expires_at, revoked_at, user_agent, ip
FROM auth_refresh_tokens WHERE token_hash = $1;`
	var t RefreshToken
	if err := s.pool.QueryRow(ctx, q, tokenHash).
		Scan(&t.ID, &t.UserID, &t.TokenHash, &t.IssuedAt, &t.ExpiresAt, &t.RevokedAt, &t.UserAgent, &t.IP); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTokenNotFound
		}
		return nil, err
	}
	if t.RevokedAt != nil {
		return nil, errors.New("token has been revoked")
	}
	if t.ExpiresAt.Before(time.Now().UTC()) {
		return nil, errors.New("token has expired")
	}
	return &t, nil
}

func (s *PGRefreshTokenStore) Revoke(ctx context.Context, tokenHash string, now time.Time) error {
	q := `UPDATE auth_refresh_tokens SET revoked_at = $2 WHERE token_hash = $1 AND revoked_at IS NULL;`
	ct, err := s.pool.Exec(ctx, q, tokenHash, now.UTC())
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("not found")
	}
	return nil
}
func (s *PGRefreshTokenStore) RevokeAllForUser(ctx context.Context, userID uuid.UUID, now time.Time) error {
	q := `UPDATE auth_refresh_tokens SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL;`
	ct, err := s.pool.Exec(ctx, q, userID, now)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("not found")
	}
	return nil
}

func (s *PGRefreshTokenStore) DeleteExpired(ctx context.Context, before time.Time) error {
	q := `DELETE FROM auth_refresh_tokens WHERE expires_at < $1;`

	_, err := s.pool.Exec(ctx, q, before.UTC())
	return err
}

var _ RefreshTokenStore = (*PGRefreshTokenStore)(nil)
