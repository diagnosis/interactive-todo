package store

import (
	"context"
	"errors"
	"strings"
	"time"

	secure "github.com/diagnosis/interactive-todo/internal/secure/password"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserType string

const (
	TypeEmployee    UserType = "employee"
	TypeAdmin       UserType = "admin"
	TypeTaskManager UserType = "task_manager"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"password_hash"`
	UserType     UserType  `json:"user_type"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type UserStore interface {
	Create(ctx context.Context, email string, password string, userType UserType) (*User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetUSerByEmail(ctx context.Context, email string) (*User, error)
	UpdatePassword(ctx context.Context, email string) error
}
type PGUserStore struct {
	Pool *pgxpool.Pool
}

func NewPGUserStore(pool *pgxpool.Pool) *PGUserStore {
	return &PGUserStore{Pool: pool}
}

var (
	ErrDuplicatedEmail = errors.New("email already exists")
	ErrNotFound        = errors.New("not found")
)

func (s *PGUserStore) Create(ctx context.Context, email, password string, userType UserType, now time.Time) (*User, error) {
	//generate passwordHash
	pw := strings.TrimSpace(password)
	hash, err := secure.HashPassword(pw)
	if err != nil {
		return nil, err
	}
	email = strings.TrimSpace(email)

	q := `INSERT INTO users (email, password_hash, user_type, created_at, updated_at) 
VALUES ($1,$2,$3,$4,$4) RETURNING id, email, user_type, created_at;`
	var out User
	if err = s.Pool.QueryRow(ctx, q, email, hash, userType, now.UTC()).
		Scan(&out.ID, &out.Email, &out.PasswordHash, &out.CreatedAt, &out.UpdatedAt); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrDuplicatedEmail
		}
		return nil, err
	}
	return &out, nil
}

func (s *PGUserStore) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	q := `Select id, email, password_hash, user_type, created_atm updated_at
FROM users WHERE id = $1;`
	var u User
	if err := s.Pool.QueryRow(ctx, q, id).
		Scan(&u.ID, &u.Email, &u.PasswordHash, &u.UserType, &u.CreatedAt, &u.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}
func (s *PGUserStore) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	q := `Select id, email, password_hash, user_type, created_atm updated_at
FROM users WHERE email = $1;`
	var u User
	if err := s.Pool.QueryRow(ctx, q, email).
		Scan(&u.ID, &u.Email, &u.PasswordHash, &u.UserType, &u.CreatedAt, &u.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}
func (s *PGUserStore) UpdatePassword(ctx context.Context, id uuid.UUID, newPassword string, now time.Time) error {
	q := `UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1;`
	newHash, err := secure.HashPassword(newPassword)
	if err != nil {
		return err
	}
	ct, err := s.Pool.Exec(ctx, q, id, newHash, now.UTC())
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
