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
	ErrNotFound      = errors.New("task not found")
	ErrInvalidStatus = errors.New("invalid task status")
	ErrInvalidInput  = errors.New("invalid input")
)

type Task struct {
	ID             uuid.UUID  `json:"id"`
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

type TaskStore interface {
	Create(
		ctx context.Context,
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

	GetTaskByID(ctx context.Context, id uuid.UUID) (*Task, error)
	GetTasksByAssigneeID(ctx context.Context, assigneeID uuid.UUID) ([]Task, error)
	GetTasksByReporterID(ctx context.Context, reporterID uuid.UUID) ([]Task, error)
	GetAllTasks(ctx context.Context) ([]Task, error)

	// FindDueForReminder finds tasks that need reminders
	// Tasks are selected if they're due between now and 'before' time
	FindDueForReminder(ctx context.Context, from, before time.Time) ([]Task, error)
	MarkReminderSent(ctx context.Context, taskID uuid.UUID, when time.Time) error
}

const taskColumns = `
    id,
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

func (s *PGTaskStore) Create(
	ctx context.Context,
	title string,
	description *string,
	reporterID uuid.UUID,
	assigneeID uuid.UUID,
	dueAt time.Time,
	now time.Time,
) (*Task, error) {
	if err := validateTask(title, reporterID, assigneeID, dueAt, now); err != nil {
		return nil, err
	}

	q := `
		INSERT INTO tasks (
			title,
			description,
			reporter_id,
			assignee_id,
			due_at,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
		` + taskReturning

	var o Task
	if err := s.pool.QueryRow(ctx, q,
		title,
		description,
		reporterID,
		assigneeID,
		dueAt.UTC(),
		now.UTC(),
	).Scan(
		&o.ID,
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

	q := `
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
			return nil, ErrNotFound
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

	q := `
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
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update task status: %w", err)
	}

	return &o, nil
}

func (s *PGTaskStore) GetTaskByID(ctx context.Context, id uuid.UUID) (*Task, error) {
	q := `
		SELECT ` + taskColumns + `
		FROM tasks
		WHERE id = $1
	`

	var o Task
	if err := s.pool.QueryRow(ctx, q, id).Scan(
		&o.ID,
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
			return nil, ErrNotFound
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
	q := `
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
	q := `
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
	q := `
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

// FindDueForReminder finds tasks due between 'from' and 'before' that need reminders
func (s *PGTaskStore) FindDueForReminder(
	ctx context.Context,
	from time.Time,
	before time.Time,
) ([]Task, error) {
	q := `
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
	q := `
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
		return ErrNotFound
	}
	return nil
}

var _ TaskStore = (*PGTaskStore)(nil)
