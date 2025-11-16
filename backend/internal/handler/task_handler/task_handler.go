package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/diagnosis/interactive-todo/internal/apperror"
	"github.com/diagnosis/interactive-todo/internal/helper"
	"github.com/diagnosis/interactive-todo/internal/logger"
	middleware "github.com/diagnosis/interactive-todo/internal/middleware/auth"
	store "github.com/diagnosis/interactive-todo/internal/store/tasks"
	"github.com/google/uuid"
)

type TaskHandler struct {
	taskStore store.TaskStore
}
type input struct {
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	AssigneeID  *uuid.UUID `json:"assignee_id"`
	DueAt       time.Time  `json:"due_at"`
}

func NewTaskHandler(ts store.TaskStore) *TaskHandler {
	return &TaskHandler{ts}
}

func (h *TaskHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	reporterID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("authentication required"))
		return
	}
	logger.Info(ctx, "creating task", "reporterID", reporterID)

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var in input

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&in); err != nil {
		logger.Error(ctx, "bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid request body"))
		return
	}

	if in.AssigneeID == nil || *in.AssigneeID == uuid.Nil {
		in.AssigneeID = &reporterID
	}
	if err := taskInputValidation(in); err != nil {
		logger.Error(ctx, "validation error", "err", err)
		helper.RespondError(w, r, apperror.BadRequest(err.Error()))
		return
	}

	now := time.Now().UTC()
	task, err := h.taskStore.Create(ctx, in.Title, in.Description, reporterID, *in.AssigneeID, in.DueAt, now)
	if err != nil {
		logger.Error(ctx, "failed create task", "err", err)
		helper.RespondError(w, r, apperror.InternalError("failed to create task", err))
		return
	}
	logger.Info(ctx, "task created", "taskID", task.ID)
	helper.RespondJSON(w, r, http.StatusCreated, task)

}
func (h *TaskHandler) ListTasksAsReporter(w http.ResponseWriter, r *http.Request) {
	h.listTasks(w, r, true)
}
func (h *TaskHandler) ListTaskAsAssignee(w http.ResponseWriter, r *http.Request) {
	h.listTasks(w, r, false)
}
func GetTask(w http.ResponseWriter, r *http.Request) {

}

// inner handler
func (h *TaskHandler) listTasks(w http.ResponseWriter, r *http.Request, isReporter bool) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}
	logger.Info(ctx, "getting tasks")
	var tasks []store.Task
	var err error
	if isReporter {
		tasks, err = h.taskStore.GetTasksByReporterID(ctx, userID)
	} else {
		tasks, err = h.taskStore.GetTasksByAssigneeID(ctx, userID)
	}

	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			helper.RespondError(w, r, apperror.NotFound(err.Error()))
			return
		}
		logger.Info(ctx, "internal error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	logger.Info(ctx, "successfully list all tasks", "tasks count", len(tasks))
	response := map[string]any{
		"userId": userID,
		"tasks":  tasks,
	}
	helper.RespondJSON(w, r, http.StatusOK, response)
}

// helpers
func taskInputValidation(in input) error {
	title := strings.TrimSpace(in.Title)
	if len(title) < 1 || len(title) > 100 {
		return errors.New("title length must be between 1 and 100")
	}
	if in.DueAt.Before(time.Now().UTC().Add(8 * time.Hour)) {
		return errors.New("due at must be at least 8 hours from now")
	}
	return nil
}
