package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TeamRole string

const (
	RoleOwner  TeamRole = "owner"
	RoleAdmin  TeamRole = "admin"
	RoleMember TeamRole = "member"
)

type Team struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	OwnerID   uuid.UUID `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type TeamMember struct {
	TeamID    uuid.UUID `json:"team_id"`
	UserID    uuid.UUID `json:"user_id"`
	Role      TeamRole  `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

var (
	ErrTeamNameTaken = errors.New("team name already taken")
)

type TeamStore interface {
	CreateTeam(ctx context.Context, ownerID uuid.UUID, name string, now time.Time) (*Team, error)
	AddMember(ctx context.Context, teamID, inviterID, userID uuid.UUID, role TeamRole, now time.Time) error
	IsMember(ctx context.Context, teamID, userID uuid.UUID) (bool, error)
	IsOwnerOrAdmin(ctx context.Context, teamID, userID uuid.UUID) (bool, error)
	RemoveMemberFromTeam(ctx context.Context, teamID uuid.UUID, userID uuid.UUID) (bool, error)
	ListMembersInTeam(ctx context.Context, teamID uuid.UUID) ([]TeamMember, error)
	ListTeamsForUser(ctx context.Context, userID uuid.UUID) ([]Team, error)
}

type PGTeamStore struct {
	pool *pgxpool.Pool
}

func NewPGTeamStore(pool *pgxpool.Pool) *PGTeamStore {
	return &PGTeamStore{pool: pool}
}

func (s *PGTeamStore) RemoveMemberFromTeam(
	ctx context.Context,
	teamID uuid.UUID,
	userID uuid.UUID,
) (bool, error) {
	const q = `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`

	ct, err := s.pool.Exec(ctx, q, teamID, userID)
	if err != nil {
		return false, fmt.Errorf(
			"RemoveMemberFromTeam: delete team_id=%s user_id=%s: %w",
			teamID, userID, err,
		)
	}

	removed := ct.RowsAffected() == 1
	return removed, nil
}

func (s *PGTeamStore) ListTeamsForUser(ctx context.Context, userID uuid.UUID) ([]Team, error) {
	const q = `
		SELECT t.id, t.name, t.owner_id, t.created_at, t.updated_at
		FROM teams t
		JOIN team_members m ON m.team_id = t.id
		WHERE m.user_id = $1
		ORDER BY t.created_at;
	`

	rows, err := s.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("ListTeamsForUser: query for user_id=%s: %w", userID, err)
	}
	defer rows.Close()

	var teams []Team
	for rows.Next() {
		var team Team
		if err := rows.Scan(&team.ID, &team.Name, &team.OwnerID, &team.CreatedAt, &team.UpdatedAt); err != nil {
			return nil, fmt.Errorf("ListTeamsForUser: scan row for user_id=%s: %w", userID, err)
		}
		teams = append(teams, team)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListTeamsForUser: rows error for user_id=%s: %w", userID, err)
	}

	return teams, nil
}

func (s *PGTeamStore) ListMembersInTeam(ctx context.Context, teamID uuid.UUID) ([]TeamMember, error) {
	const q = `
		SELECT team_id, user_id, role, created_at
		FROM team_members
		WHERE team_id = $1;
	`

	rows, err := s.pool.Query(ctx, q, teamID)
	if err != nil {
		return nil, fmt.Errorf("ListMembersInTeam: query for team_id=%s: %w", teamID, err)
	}
	defer rows.Close()

	var members []TeamMember
	for rows.Next() {
		var member TeamMember
		if err := rows.Scan(&member.TeamID, &member.UserID, &member.Role, &member.CreatedAt); err != nil {
			return nil, fmt.Errorf("ListMembersInTeam: scan row for team_id=%s: %w", teamID, err)
		}
		members = append(members, member)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListMembersInTeam: rows error for team_id=%s: %w", teamID, err)
	}

	return members, nil
}

func (s *PGTeamStore) CreateTeam(ctx context.Context, ownerID uuid.UUID, name string, now time.Time) (*Team, error) {
	const insertTeam = `
		INSERT INTO teams (name, owner_id, created_at, updated_at)
		VALUES ($1, $2, $3, $3)
		RETURNING id;
	`
	const insertMember = `
		INSERT INTO team_members (team_id, user_id, role, created_at)
		VALUES ($1, $2, $3, $4);
	`

	now = now.UTC()

	var t Team
	t.Name = name
	t.OwnerID = ownerID
	t.CreatedAt = now
	t.UpdatedAt = now

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("CreateTeam: begin tx: %w", err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err = tx.QueryRow(ctx, insertTeam, name, ownerID, now).Scan(&t.ID); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrTeamNameTaken
		}
		return nil, fmt.Errorf("CreateTeam: insert team name=%q owner_id=%s: %w", name, ownerID, err)
	}

	if _, err = tx.Exec(ctx, insertMember, t.ID, ownerID, RoleOwner, now); err != nil {
		return nil, fmt.Errorf("CreateTeam: insert owner member team_id=%s owner_id=%s: %w", t.ID, ownerID, err)
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("CreateTeam: commit tx team_id=%s: %w", t.ID, err)
	}

	return &t, nil
}

func (s *PGTeamStore) IsMember(ctx context.Context, teamID, userID uuid.UUID) (bool, error) {
	const q = `
        SELECT 1 FROM team_members
        WHERE team_id = $1 AND user_id = $2
        LIMIT 1;
    `

	var dummy int
	err := s.pool.QueryRow(ctx, q, teamID, userID).Scan(&dummy)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("IsMember: query team_id=%s user_id=%s: %w", teamID, userID, err)
	}

	return true, nil
}

func (s *PGTeamStore) IsOwnerOrAdmin(ctx context.Context, teamID, userID uuid.UUID) (bool, error) {
	const q = `
		SELECT 1 FROM team_members
		WHERE team_id = $1 AND user_id = $2
		  AND role IN ('owner', 'admin')
		LIMIT 1;
	`

	var dummy int
	err := s.pool.QueryRow(ctx, q, teamID, userID).Scan(&dummy)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("IsOwnerOrAdmin: query team_id=%s user_id=%s: %w", teamID, userID, err)
	}
	return true, nil
}

func (s *PGTeamStore) AddMember(
	ctx context.Context,
	teamID, inviterID, userID uuid.UUID,
	role TeamRole,
	now time.Time,
) error {
	// Only owner/admin can add
	ok, err := s.IsOwnerOrAdmin(ctx, teamID, inviterID)
	if err != nil {
		return fmt.Errorf("AddMember: check inviter role team_id=%s inviter_id=%s: %w", teamID, inviterID, err)
	}
	if !ok {
		return fmt.Errorf("AddMember: forbidden, inviter_id=%s is not owner/admin of team_id=%s", inviterID, teamID)
	}

	const q = `
		INSERT INTO team_members (team_id, user_id, role, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;
	`

	if _, err = s.pool.Exec(ctx, q, teamID, userID, role, now.UTC()); err != nil {
		return fmt.Errorf("AddMember: upsert member team_id=%s user_id=%s role=%s: %w", teamID, userID, role, err)
	}

	return nil
}

var _ TeamStore = (*PGTeamStore)(nil)
