package store

import (
	"context"
	"errors"
	"time"

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
	PasswordHash string    `json:"-"`
	UserType     UserType  `json:"user_type"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type UserStore interface {
	Create(ctx context.Context, email string, password string, userType UserType, now time.Time) (*User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	UpdatePassword(ctx context.Context, id uuid.UUID, newPassword string, now time.Time) error
	ListAll(ctx context.Context) ([]User, error)
	UpdateUserType(ctx context.Context, userID uuid.UUID, userType UserType) (*User, error)
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

func (s *PGUserStore) UpdateUserType(ctx context.Context, userID uuid.UUID, userType UserType) (*User, error) {
	const q = `
        UPDATE users
        SET user_type = $2
        WHERE id = $1
        RETURNING email, updated_at;
    `
	var out User
	out.ID = userID
	out.UserType = userType

	err := s.Pool.QueryRow(ctx, q, userID, userType).
		Scan(&out.Email, &out.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &out, nil
}

func (s *PGUserStore) Create(ctx context.Context, email, hashedPassword string, userType UserType, now time.Time) (*User, error) {
	//generate passwordHash

	q := `INSERT INTO users (email, password_hash, user_type, created_at, updated_at) 
VALUES ($1,$2,$3,$4,$4) RETURNING id;`
	var out User
	out.PasswordHash = hashedPassword
	out.CreatedAt = now.UTC()
	out.UpdatedAt = now.UTC()
	out.UserType = userType
	out.Email = email
	if err := s.Pool.QueryRow(ctx, q, email, hashedPassword, userType, now.UTC()).
		Scan(&out.ID); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrDuplicatedEmail
		}
		return nil, err
	}
	return &out, nil
}

func (s *PGUserStore) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	q := `Select id, email, password_hash, user_type, created_at, updated_at
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
	q := `Select id, email, password_hash, user_type, created_at, updated_at
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
func (s *PGUserStore) UpdatePassword(ctx context.Context, id uuid.UUID, newHashedPassword string, now time.Time) error {
	q := `UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1;`

	ct, err := s.Pool.Exec(ctx, q, id, newHashedPassword, now.UTC())
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
func (s *PGUserStore) ListAll(ctx context.Context) ([]User, error) {
	q := `SELECT id, email, password_hash, user_type, created_at, updated_at
			FROM users ORDER BY email`
	rows, err := s.Pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []User

	for rows.Next() {
		var user User
		err = rows.Scan(
			&user.ID,
			&user.Email,
			&user.PasswordHash,
			&user.UserType,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

var _ UserStore = (*PGUserStore)(nil)
