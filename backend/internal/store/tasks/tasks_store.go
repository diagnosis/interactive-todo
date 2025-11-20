package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TaskStatus string

const (
	OpenStatus       TaskStatus = "open"
	InProgressStatus TaskStatus = "in_progress"
	DoneStatus       TaskStatus = "done"
	CanceledStatus   TaskStatus = "canceled"
)

var (
	ErrTaskNotFound  = errors.New("task not found")
	ErrInvalidStatus = errors.New("invalid task status")
	ErrInvalidInput  = errors.New("invalid input")
)

type Task struct {
	ID             uuid.UUID  `json:"id"`
	TeamID         uuid.UUID  `json:"team_id"`
	Title          string     `json:"title"`
	Description    *string    `json:"description,omitempty"`
	ReporterID     uuid.UUID  `json:"reporter_id"`
	AssigneeID     uuid.UUID  `json:"assignee_id"`
	DueAt          time.Time  `json:"due_at"`
	ReminderSentAt *time.Time `json:"reminder_sent_at,omitempty"`
	Status         TaskStatus `json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type TaskUpdate struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	DueAt       *time.Time `json:"due_at"`
}

type TaskStore interface {
	Create(
		ctx context.Context,
		teamID uuid.UUID,
		title string,
		description *string,
		reporterID uuid.UUID,
		assigneeID uuid.UUID,
		dueAt time.Time,
		now time.Time,
	) (*Task, error)

	Assign(
		ctx context.Context,
		taskID uuid.UUID,
		newAssigneeID uuid.UUID,
		now time.Time,
	) (*Task, error)

	UpdateStatus(
		ctx context.Context,
		taskID uuid.UUID,
		newStatus TaskStatus,
		now time.Time,
	) (*Task, error)

	UpdateDetails(
		ctx context.Context,
		taskID uuid.UUID,
		patch TaskUpdate,
		now time.Time,
	) (*Task, error)

	GetTaskByID(ctx context.Context, id uuid.UUID) (*Task, error)
	GetTasksByAssigneeID(ctx context.Context, assigneeID uuid.UUID) ([]Task, error)
	GetTasksByReporterID(ctx context.Context, reporterID uuid.UUID) ([]Task, error)
	GetAllTasks(ctx context.Context) ([]Task, error)
	DeleteTask(ctx context.Context, id uuid.UUID) error
	//team member actions
	ListTeamTasks(ctx context.Context, userID uuid.UUID) ([]Task, error)
	ListAssigneeTasksInTeam(ctx context.Context, teamID, userID uuid.UUID) ([]Task, error)
	ListReporterTasksInTeam(ctx context.Context, teamID uuid.UUID, userID uuid.UUID) ([]Task, error)

	FindDueForReminder(ctx context.Context, from, before time.Time) ([]Task, error)
	MarkReminderSent(ctx context.Context, taskID uuid.UUID, when time.Time) error
}

// NOTE: order must match table + all Scan calls
const taskColumns = `
    id,
    team_id,
    title,
    description,
    reporter_id,
    assignee_id,
    due_at,
    reminder_sent_at,
    status,
    created_at,
    updated_at
`

const taskReturning = "RETURNING " + taskColumns

type PGTaskStore struct {
	pool *pgxpool.Pool
}

func NewPGTaskStore(pool *pgxpool.Pool) *PGTaskStore {
	return &PGTaskStore{pool: pool}
}
func (s *PGTaskStore) ListReporterTasksInTeam(
	ctx context.Context,
	teamID uuid.UUID,
	userID uuid.UUID,
) ([]Task, error) {
	if teamID == uuid.Nil || userID == uuid.Nil {
		return nil, fmt.Errorf("%w: team_id and user_id cannot be nil", ErrInvalidInput)
	}

	const q = `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE team_id = $1
		  AND reporter_id = $2
		ORDER BY created_at DESC;
	`

	rows, err := s.pool.Query(ctx, q, teamID, userID)
	if err != nil {
		return nil, fmt.Errorf("list reporter tasks in team: %w", err)
	}
	defer rows.Close()

	return scanTask(rows)
}
func (s *PGTaskStore) ListAssigneeTasksInTeam(ctx context.Context, teamID, userID uuid.UUID) ([]Task, error) {
	if teamID == uuid.Nil || userID == uuid.Nil {
		return nil, fmt.Errorf("%w: team_id and user_id cannot be nil", ErrInvalidInput)
	}

	const q = `
		SELECT ` + taskColumns + ` 
		FROM tasks
		WHERE team_id = $1
			AND assignee_id = $2
		ORDER BY due_at;
`
	rows, err := s.pool.Query(ctx, q, teamID, userID)
	if err != nil {
		return nil, fmt.Errorf("list assignee tasks in team: %w", err)
	}
	defer rows.Close()

	return scanTask(rows)
}
func (s *PGTaskStore) ListTeamTasks(ctx context.Context, teamID uuid.UUID) ([]Task, error) {
	if teamID == uuid.Nil {
		return nil, fmt.Errorf("%w: team_id cannot be nil", ErrInvalidInput)
	}

	const q = `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE team_id = $1
		ORDER BY created_at DESC;
	`

	rows, err := s.pool.Query(ctx, q, teamID)
	if err != nil {
		return nil, fmt.Errorf("list team tasks: %w", err)
	}
	defer rows.Close()

	return scanTask(rows)
}

// validateTask performs input validation
func validateTask(title string, reporterID, assigneeID uuid.UUID, dueAt, now time.Time) error {
	if strings.TrimSpace(title) == "" {
		return fmt.Errorf("%w: title cannot be empty", ErrInvalidInput)
	}
	if len(title) > 500 {
		return fmt.Errorf("%w: title too long (max 500 chars)", ErrInvalidInput)
	}
	if reporterID == uuid.Nil {
		return fmt.Errorf("%w: reporter_id cannot be nil", ErrInvalidInput)
	}
	if assigneeID == uuid.Nil {
		return fmt.Errorf("%w: assignee_id cannot be nil", ErrInvalidInput)
	}
	if dueAt.Before(now) {
		return fmt.Errorf("%w: due_at must be in the future", ErrInvalidInput)
	}
	return nil
}

func validateTaskUpdate(upd TaskUpdate, now time.Time) error {
	if upd.Title != nil {
		t := strings.TrimSpace(*upd.Title)
		if t == "" {
			return fmt.Errorf("%w: title cannot be empty", ErrInvalidInput)
		}
		if len(t) > 500 {
			return fmt.Errorf("%w: title too long (max 500 chars)", ErrInvalidInput)
		}
	}
	if upd.DueAt != nil {
		if upd.DueAt.Before(now.Add(8 * time.Hour)) {
			return fmt.Errorf("%w: due_at must be at least 8 hours in future from now", ErrInvalidInput)
		}
	}
	return nil
}

func (s *PGTaskStore) Create(
	ctx context.Context,
	teamID uuid.UUID,
	title string,
	description *string,
	reporterID uuid.UUID,
	assigneeID uuid.UUID,
	dueAt time.Time,
	now time.Time,
) (*Task, error) {
	if teamID == uuid.Nil {
		return nil, fmt.Errorf("%w: team_id cannot be nil", ErrInvalidInput)
	}
	if err := validateTask(title, reporterID, assigneeID, dueAt, now); err != nil {
		return nil, err
	}

	const q = `
		INSERT INTO tasks (
			team_id,
			title,
			description,
			reporter_id,
			assignee_id,
			due_at,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
		` + taskReturning

	var o Task
	if err := s.pool.QueryRow(ctx, q,
		teamID,
		title,
		description,
		reporterID,
		assigneeID,
		dueAt.UTC(),
		now.UTC(),
	).Scan(
		&o.ID,
		&o.TeamID,
		&o.Title,
		&o.Description,
		&o.ReporterID,
		&o.AssigneeID,
		&o.DueAt,
		&o.ReminderSentAt,
		&o.Status,
		&o.CreatedAt,
		&o.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("create task: %w", err)
	}

	return &o, nil
}

func (s *PGTaskStore) Assign(
	ctx context.Context,
	taskID uuid.UUID,
	newAssigneeID uuid.UUID,
	now time.Time,
) (*Task, error) {
	if newAssigneeID == uuid.Nil {
		return nil, fmt.Errorf("%w: assignee_id cannot be nil", ErrInvalidInput)
	}

	const q = `
		UPDATE tasks
		SET assignee_id = $2,
		    updated_at  = $3
		WHERE id = $1
		` + taskReturning

	var o Task
	if err := s.pool.QueryRow(ctx, q,
		taskID,
		newAssigneeID,
		now.UTC(),
	).Scan(
		&o.ID,
		&o.TeamID,
		&o.Title,
		&o.Description,
		&o.ReporterID,
		&o.AssigneeID,
		&o.DueAt,
		&o.ReminderSentAt,
		&o.Status,
		&o.CreatedAt,
		&o.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTaskNotFound
		}
		return nil, fmt.Errorf("assign task: %w", err)
	}

	return &o, nil
}

func (s *PGTaskStore) UpdateStatus(
	ctx context.Context,
	taskID uuid.UUID,
	newStatus TaskStatus,
	now time.Time,
) (*Task, error) {
	switch newStatus {
	case OpenStatus, InProgressStatus, DoneStatus, CanceledStatus:
	default:
		return nil, ErrInvalidStatus
	}

	const q = `
		UPDATE tasks
		SET status     = $2,
		    updated_at = $3
		WHERE id = $1
		` + taskReturning

	var o Task
	if err := s.pool.QueryRow(ctx, q,
		taskID,
		string(newStatus),
		now.UTC(),
	).Scan(
		&o.ID,
		&o.TeamID,
		&o.Title,
		&o.Description,
		&o.ReporterID,
		&o.AssigneeID,
		&o.DueAt,
		&o.ReminderSentAt,
		&o.Status,
		&o.CreatedAt,
		&o.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTaskNotFound
		}
		return nil, fmt.Errorf("update task status: %w", err)
	}

	return &o, nil
}

func (s *PGTaskStore) GetTaskByID(ctx context.Context, id uuid.UUID) (*Task, error) {
	const q = `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE id = $1
	`

	var o Task
	if err := s.pool.QueryRow(ctx, q, id).Scan(
		&o.ID,
		&o.TeamID,
		&o.Title,
		&o.Description,
		&o.ReporterID,
		&o.AssigneeID,
		&o.DueAt,
		&o.ReminderSentAt,
		&o.Status,
		&o.CreatedAt,
		&o.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTaskNotFound
		}
		return nil, fmt.Errorf("get task by id: %w", err)
	}

	return &o, nil
}

func scanTask(rows pgx.Rows) ([]Task, error) {
	var tasks []Task
	for rows.Next() {
		var t Task
		if err := rows.Scan(
			&t.ID,
			&t.TeamID,
			&t.Title,
			&t.Description,
			&t.ReporterID,
			&t.AssigneeID,
			&t.DueAt,
			&t.ReminderSentAt,
			&t.Status,
			&t.CreatedAt,
			&t.UpdatedAt,
		); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

func (s *PGTaskStore) GetTasksByAssigneeID(ctx context.Context, assigneeID uuid.UUID) ([]Task, error) {
	const q = `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE assignee_id = $1
		ORDER BY due_at
	`

	rows, err := s.pool.Query(ctx, q, assigneeID)
	if err != nil {
		return nil, fmt.Errorf("get tasks by assignee: %w", err)
	}
	defer rows.Close()

	return scanTask(rows)
}

func (s *PGTaskStore) GetTasksByReporterID(ctx context.Context, reporterID uuid.UUID) ([]Task, error) {
	const q = `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE reporter_id = $1
		ORDER BY created_at DESC
	`

	rows, err := s.pool.Query(ctx, q, reporterID)
	if err != nil {
		return nil, fmt.Errorf("get tasks by reporter: %w", err)
	}
	defer rows.Close()

	return scanTask(rows)
}

func (s *PGTaskStore) GetAllTasks(ctx context.Context) ([]Task, error) {
	const q = `
		SELECT ` + taskColumns + `
		FROM tasks
		ORDER BY created_at DESC
	`

	rows, err := s.pool.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("get all tasks: %w", err)
	}
	defer rows.Close()

	return scanTask(rows)
}

func (s *PGTaskStore) FindDueForReminder(
	ctx context.Context,
	from time.Time,
	before time.Time,
) ([]Task, error) {
	const q = `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE due_at > $1
		  AND due_at <= $2
		  AND reminder_sent_at IS NULL
		  AND status IN ('open', 'in_progress')
		ORDER BY due_at
	`

	rows, err := s.pool.Query(ctx, q, from.UTC(), before.UTC())
	if err != nil {
		return nil, fmt.Errorf("find due for reminder: %w", err)
	}
	defer rows.Close()

	return scanTask(rows)
}

func (s *PGTaskStore) MarkReminderSent(
	ctx context.Context,
	taskID uuid.UUID,
	when time.Time,
) error {
	const q = `
		UPDATE tasks
		SET reminder_sent_at = $2,
		    updated_at       = $2
		WHERE id = $1
	`

	res, err := s.pool.Exec(ctx, q, taskID, when.UTC())
	if err != nil {
		return fmt.Errorf("mark reminder sent: %w", err)
	}
	if res.RowsAffected() == 0 {
		return ErrTaskNotFound
	}
	return nil
}

func (s *PGTaskStore) DeleteTask(ctx context.Context, id uuid.UUID) error {
	const q = `DELETE FROM tasks WHERE id = $1`

	ct, err := s.pool.Exec(ctx, q, id)
	if err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrTaskNotFound
	}
	return nil
}

func (s *PGTaskStore) UpdateDetails(
	ctx context.Context,
	taskID uuid.UUID,
	patch TaskUpdate,
	now time.Time,
) (*Task, error) {
	if err := validateTaskUpdate(patch, now); err != nil {
		return nil, err
	}

	existing, err := s.GetTaskByID(ctx, taskID)
	if err != nil {
		return nil, err
	}

	if patch.Title != nil {
		existing.Title = strings.TrimSpace(*patch.Title)
	}
	if patch.Description != nil {
		existing.Description = patch.Description
	}
	if patch.DueAt != nil {
		existing.DueAt = patch.DueAt.UTC()
	}
	existing.UpdatedAt = now.UTC()

	const q = `
		UPDATE tasks
		SET title       = $2,
		    description = $3,
		    due_at      = $4,
		    updated_at  = $5
		WHERE id = $1
		` + taskReturning

	var o Task
	if err := s.pool.QueryRow(ctx, q,
		existing.ID,
		existing.Title,
		existing.Description,
		existing.DueAt,
		existing.UpdatedAt,
	).Scan(
		&o.ID,
		&o.TeamID,
		&o.Title,
		&o.Description,
		&o.ReporterID,
		&o.AssigneeID,
		&o.DueAt,
		&o.ReminderSentAt,
		&o.Status,
		&o.CreatedAt,
		&o.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTaskNotFound
		}
		return nil, fmt.Errorf("update task details: %w", err)
	}

	return &o, nil
}

var _ TaskStore = (*PGTaskStore)(nil)
