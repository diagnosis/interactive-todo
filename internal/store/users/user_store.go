package store

import (
	"context"
	"strings"

	secure "github.com/diagnosis/interactive-todo/internal/secure/password"
	"github.com/google/uuid"
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
	PasswordHash string    `json:"_"`
	UserType     UserType  `json:"user_type"`
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

func (s *PGUserStore) Create(ctx context.Context, email, password string, userType UserType) (*User, error) {
	//generate passwordHash
	pw := strings.TrimSpace(password)
	hash, err := secure.HashPassword(pw)
	if err != nil {
		return nil, err
	}
	email = strings.TrimSpace(email)

	q := `INSERT INTO (email, password_hash, user_type) users
    		VALUES (%1,%2,%3)
			RETURNING id, email, user_type;`
	var out User
	if err := s.Pool.QueryRow(ctx, q, email, hash, userType).Scan(&out.ID, &out.Email, &out.UserType); err != nil {
		//we can check user already exist here. unigueness check
		return nil, err
	}
	return &out, nil

}
