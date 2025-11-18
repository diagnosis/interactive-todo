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
	"github.com/go-chi/chi/v5"
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
func (h *TaskHandler) GetTask(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}

	id, err := parseTaskID(r)
	if err != nil {
		helper.RespondError(w, r, apperror.Unauthorized("bad id"))
		return
	}
	task, err := h.getTaskByID(ctx, id)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			logger.Error(ctx, "no task", "err", err)
			helper.RespondError(w, r, apperror.NotFound("no task found"))
			return
		}
		logger.Error(ctx, "internal error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if task.ReporterID != userID && task.AssigneeID != userID {
		logger.Error(ctx, "forbidden")
		helper.RespondError(w, r, apperror.Forbidden("forbidden"))
		return
	}

	response := map[string]any{
		"userID": userID,
		"task":   task,
	}
	helper.RespondJSON(w, r, http.StatusOK, response)
}

func (h *TaskHandler) AssignTask(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}
	var in struct {
		AssigneeID uuid.UUID `json:"assignee_id"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	err := dec.Decode(&in)
	if err != nil {
		logger.Error(ctx, "bad json")
		helper.RespondError(w, r, apperror.BadRequest("bad request"))
		return
	}
	if in.AssigneeID == uuid.Nil {
		helper.RespondError(w, r, apperror.BadRequest("assignee id needed"))
		return
	}

	id, err := parseTaskID(r)
	if err != nil {
		helper.RespondError(w, r, apperror.Unauthorized("bad id"))
		return
	}
	task, err := h.getTaskByID(ctx, id)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			logger.Error(ctx, "no task", "err", err)
			helper.RespondError(w, r, apperror.NotFound("no task found"))
			return
		}
		logger.Error(ctx, "internal error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if userID != task.ReporterID {
		logger.Error(ctx, "only task creator can assign task")
		helper.RespondError(w, r, apperror.Forbidden("only task creator can assign task"))
		return
	}
	task, err = h.taskStore.Assign(ctx, task.ID, in.AssigneeID, time.Now().UTC())
	if err != nil {
		logger.Error(ctx, "internal", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	logger.Info(ctx, "task assigned", "assignee_id", task.AssigneeID)
	helper.RespondJSON(w, r, http.StatusOK, task)

}
func (h *TaskHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	//check authentication
	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}
	//parse taskIDid
	taskID, err := parseTaskID(r)
	if err != nil {
		logger.Error(ctx, "failed to parse id", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("bad task id"))
		return
	}
	//get body
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var in struct {
		Status store.TaskStatus `json:"status"`
	}
	if err = dec.Decode(&in); err != nil {
		logger.Error(ctx, "bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("bad request body"))
		return
	}
	defer r.Body.Close()
	//status check
	if !isValidStatus(in.Status) {
		helper.RespondError(w, r, apperror.BadRequest("task status invalid"))
		return
	}

	//get task

	task, err := h.getTaskByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			logger.Error(ctx, "no task", "err", err)
			helper.RespondError(w, r, apperror.NotFound("no task found"))
			return
		}
		logger.Error(ctx, "internal error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	//check if assignee is trying to update
	if userID != task.AssigneeID {
		logger.Error(ctx, "forbidden: only assignee can update status")
		helper.RespondError(w, r, apperror.Forbidden("only assignee can update task status"))
		return
	}
	updatedTask, err := h.taskStore.UpdateStatus(ctx, taskID, in.Status, time.Now().UTC())
	if err != nil {
		logger.Error(ctx, "unable to update status", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	logger.Info(ctx, "task status updated", "taskID", taskID, "status", in.Status)
	helper.RespondJSON(w, r, http.StatusOK, updatedTask)
}

func (h *TaskHandler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("authentication required"))
		return
	}
	// Get task ID
	taskID, err := parseTaskID(r)
	if err != nil {
		helper.RespondError(w, r, apperror.BadRequest("invalid task id"))
		return
	}

	task, err := h.getTaskByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			helper.RespondError(w, r, apperror.NotFound("task not found"))
			return
		}
		logger.Error(ctx, "failed to get task", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	// Only creator (reporter) can delete
	if userID != task.ReporterID {
		logger.Info(ctx, "forbidden: only task creator can delete")
		helper.RespondError(w, r, apperror.Forbidden("only task creator can delete"))
		return
	}
	// delete now
	if err = h.taskStore.DeleteTask(ctx, taskID); err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			helper.RespondError(w, r, apperror.NotFound("task not found"))
			return
		}
		logger.Error(ctx, "internal error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	logger.Info(ctx, "task deleted", "taskID", taskID)
	w.WriteHeader(http.StatusNoContent) // Just this!

}

func parseTaskID(r *http.Request) (uuid.UUID, error) {
	idstr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idstr)
	if err != nil {
		return uuid.Nil, err
	}
	return id, nil
}
func (h *TaskHandler) getTaskByID(ctx context.Context, id uuid.UUID) (*store.Task, error) {
	task, err := h.taskStore.GetTaskByID(ctx, id)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			return nil, store.ErrTaskNotFound
		}
		return nil, err
	}
	return task, nil
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
		if errors.Is(err, store.ErrTaskNotFound) {
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
func (h *TaskHandler) HandlePatchTask(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "patch task: start")

	// 1) Auth
	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}

	// 2) Parse task ID
	taskID, err := parseTaskID(r)
	if err != nil {
		logger.Error(ctx, "invalid task id", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid task id"))
		return
	}

	// 3) Load task (for perms + existence)
	task, err := h.getTaskByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			helper.RespondError(w, r, apperror.NotFound("task not found"))
			return
		}
		logger.Error(ctx, "failed to get task", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	// 4) Permission: only reporter can patch title/description/due_at
	if task.ReporterID != userID {
		logger.Info(ctx, "forbidden: only creator can update task details",
			"userID", userID,
			"reporterID", task.ReporterID,
		)
		helper.RespondError(w, r, apperror.Forbidden("only creator can update title, description and due_at"))
		return
	}

	// 5) Decode JSON body
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	var in patchTaskInput
	if err := dec.Decode(&in); err != nil {
		logger.Error(ctx, "bad json in patch task", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid request body"))
		return
	}

	// Optional: reject no-op patch
	if in.Title == nil && in.Description == nil && in.DueAt == nil {
		helper.RespondError(w, r, apperror.BadRequest("at least one of title, description, or due_at must be provided"))
		return
	}

	// 6) Delegate to store
	now := time.Now().UTC()
	updatedTask, err := h.taskStore.UpdateDetails(ctx, taskID, store.TaskUpdate{
		Title:       in.Title,
		Description: in.Description,
		DueAt:       in.DueAt,
	}, now)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrTaskNotFound):
			helper.RespondError(w, r, apperror.NotFound("task not found"))
		case errors.Is(err, store.ErrInvalidInput):
			helper.RespondError(w, r, apperror.BadRequest(err.Error()))
		default:
			logger.Error(ctx, "failed to update task details", "err", err)
			helper.RespondError(w, r, apperror.InternalError("internal error", err))
		}
		return
	}

	logger.Info(ctx, "patch task: success", "taskID", taskID)
	helper.RespondJSON(w, r, http.StatusOK, updatedTask)
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
func isValidStatus(status store.TaskStatus) bool {
	switch status {
	case store.OpenStatus, store.InProgressStatus, store.DoneStatus, store.CanceledStatus:
		return true
	default:
		return false
	}
}

type patchTaskInput struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	DueAt       *time.Time `json:"due_at"`
}
