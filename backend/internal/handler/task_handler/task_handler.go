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
	teamstore "github.com/diagnosis/interactive-todo/internal/store/teams"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type TaskHandler struct {
	taskStore store.TaskStore
	teamStore teamstore.TeamStore
}

type input struct {
	TeamID      uuid.UUID  `json:"team_id"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	AssigneeID  *uuid.UUID `json:"assignee_id"`
	DueAt       time.Time  `json:"due_at"`
}

func NewTaskHandler(ts store.TaskStore, tms teamstore.TeamStore) *TaskHandler {
	return &TaskHandler{taskStore: ts, teamStore: tms}
}
func (h *TaskHandler) ListAssigneeTasksInTeam(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Info(ctx, "list assignee tasks in team: unauthorized")
		helper.RespondError(w, r, apperror.Unauthorized("authentication required"))
		return
	}

	teamIDStr := chi.URLParam(r, "team_id")
	teamID, err := uuid.Parse(teamIDStr)
	if err != nil {
		logger.Error(ctx, "list assignee tasks in team: invalid team id",
			"team_id", teamIDStr,
			"err", err,
		)
		helper.RespondError(w, r, apperror.BadRequest("invalid team id"))
		return
	}

	isMember, err := h.teamStore.IsMember(ctx, teamID, userID)
	if err != nil {
		logger.Error(ctx, "list assignee tasks in team: membership check failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if !isMember {
		logger.Info(ctx, "list assignee tasks in team: forbidden (not team member)",
			"user_id", userID,
			"team_id", teamID,
		)
		helper.RespondError(w, r, apperror.Forbidden("only team members can view team tasks"))
		return
	}

	tasks, err := h.taskStore.ListAssigneeTasksInTeam(ctx, teamID, userID)
	if err != nil {
		logger.Error(ctx, "list assignee tasks in team: store query failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	logger.Info(ctx, "list assignee tasks in team: success",
		"user_id", userID,
		"team_id", teamID,
		"count", len(tasks),
	)

	response := map[string]any{
		"user_id": userID,
		"team_id": teamID,
		"tasks":   tasks,
	}
	helper.RespondJSON(w, r, http.StatusOK, response)
}

func (h *TaskHandler) ListReporterTasksInTeam(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Info(ctx, "list reporter tasks in team: unauthorized")
		helper.RespondError(w, r, apperror.Unauthorized("authentication required"))
		return
	}

	teamIDStr := chi.URLParam(r, "team_id")
	teamID, err := uuid.Parse(teamIDStr)
	if err != nil {
		logger.Error(ctx, "list reporter tasks in team: invalid team id",
			"team_id", teamIDStr,
			"err", err,
		)
		helper.RespondError(w, r, apperror.BadRequest("invalid team id"))
		return
	}

	isMember, err := h.teamStore.IsMember(ctx, teamID, userID)
	if err != nil {
		logger.Error(ctx, "list reporter tasks in team: membership check failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if !isMember {
		logger.Info(ctx, "list reporter tasks in team: forbidden (not team member)",
			"user_id", userID,
			"team_id", teamID,
		)
		helper.RespondError(w, r, apperror.Forbidden("only team members can view team tasks"))
		return
	}

	tasks, err := h.taskStore.ListReporterTasksInTeam(ctx, teamID, userID)
	if err != nil {
		logger.Error(ctx, "list reporter tasks in team: store query failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	logger.Info(ctx, "list reporter tasks in team: success",
		"user_id", userID,
		"team_id", teamID,
		"count", len(tasks),
	)

	response := map[string]any{
		"user_id": userID,
		"team_id": teamID,
		"tasks":   tasks,
	}
	helper.RespondJSON(w, r, http.StatusOK, response)
}

func (h *TaskHandler) ListTeamTasks(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Info(ctx, "list team tasks: unauthorized")
		helper.RespondError(w, r, apperror.Unauthorized("authentication required"))
		return
	}

	teamIDStr := chi.URLParam(r, "team_id")
	teamID, err := uuid.Parse(teamIDStr)
	if err != nil {
		logger.Error(ctx, "list team tasks: invalid team id", "team_id", teamIDStr, "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid team id"))
		return
	}

	isMember, err := h.teamStore.IsMember(ctx, teamID, userID)
	if err != nil {
		logger.Error(ctx, "list team tasks: membership check failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if !isMember {
		logger.Info(ctx, "list team tasks: forbidden (not team member)",
			"user_id", userID,
			"team_id", teamID,
		)
		helper.RespondError(w, r, apperror.Forbidden("only team members can view team tasks"))
		return
	}

	tasks, err := h.taskStore.ListTeamTasks(ctx, teamID)
	if err != nil {
		logger.Error(ctx, "list team tasks: store query failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	logger.Info(ctx, "list team tasks: success",
		"user_id", userID,
		"team_id", teamID,
		"count", len(tasks),
	)

	response := map[string]any{
		"user_id": userID,
		"team_id": teamID,
		"tasks":   tasks,
	}
	helper.RespondJSON(w, r, http.StatusOK, response)
}

func (h *TaskHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	reporterID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("authentication required"))
		return
	}
	logger.Info(ctx, "creating task", "reporter_id", reporterID)

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	var in input
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&in); err != nil {
		logger.Error(ctx, "create task: bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid request body"))
		return
	}

	// Default assignee to reporter if not provided
	if in.AssigneeID == nil || *in.AssigneeID == uuid.Nil {
		in.AssigneeID = &reporterID
	}

	if err := taskInputValidation(in); err != nil {
		logger.Error(ctx, "create task: validation error", "err", err)
		helper.RespondError(w, r, apperror.BadRequest(err.Error()))
		return
	}

	// Ensure reporter is a member of the team
	isMember, err := h.teamStore.IsMember(ctx, in.TeamID, reporterID)
	if err != nil {
		logger.Error(ctx, "create task: membership check failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if !isMember {
		logger.Info(ctx, "create task: reporter not in team", "reporter_id", reporterID, "team_id", in.TeamID)
		helper.RespondError(w, r, apperror.Forbidden("only team members can create tasks"))
		return
	}

	// Ensure assignee is also a member of the team
	if *in.AssigneeID != reporterID {
		isAssigneeMember, err := h.teamStore.IsMember(ctx, in.TeamID, *in.AssigneeID)
		if err != nil {
			logger.Error(ctx, "create task: assignee membership check failed", "err", err)
			helper.RespondError(w, r, apperror.InternalError("internal error", err))
			return
		}
		if !isAssigneeMember {
			logger.Info(ctx, "create task: assignee not in team", "assignee_id", *in.AssigneeID, "team_id", in.TeamID)
			helper.RespondError(w, r, apperror.BadRequest("assignee must be a member of the team"))
			return
		}
	}

	now := time.Now().UTC()
	task, err := h.taskStore.Create(ctx, in.TeamID, in.Title, in.Description, reporterID, *in.AssigneeID, in.DueAt, now)
	if err != nil {
		logger.Error(ctx, "create task: store create failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("failed to create task", err))
		return
	}

	logger.Info(ctx, "task created", "task_id", task.ID)
	helper.RespondJSON(w, r, http.StatusCreated, task)
}

func (h *TaskHandler) ListTasksAsReporter(w http.ResponseWriter, r *http.Request) {
	h.listTasks(w, r, true)
}

func (h *TaskHandler) ListTasksAsAssignee(w http.ResponseWriter, r *http.Request) {
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
		logger.Error(ctx, "get task: invalid task id", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid task id"))
		return
	}

	task, err := h.getTaskByID(ctx, id)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			logger.Info(ctx, "get task: not found", "task_id", id)
			helper.RespondError(w, r, apperror.NotFound("task not found"))
			return
		}
		logger.Error(ctx, "get task: internal error", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	isMember, err := h.teamStore.IsMember(ctx, task.TeamID, userID)
	if err != nil {
		logger.Error(ctx, "get task: membership check failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if !isMember {
		logger.Info(ctx, "get task: forbidden (not team member)", "user_id", userID, "team_id", task.TeamID)
		helper.RespondError(w, r, apperror.Forbidden("forbidden"))
		return
	}

	response := map[string]any{
		"user_id": userID,
		"task":    task,
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

	taskID, err := parseTaskID(r)
	if err != nil {
		logger.Error(ctx, "assign task: invalid task id", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid task id"))
		return
	}

	task, err := h.getTaskByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			logger.Info(ctx, "assign task: task not found", "task_id", taskID)
			helper.RespondError(w, r, apperror.NotFound("task not found"))
			return
		}
		logger.Error(ctx, "assign task: failed to get task", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	// Check that current user is a member of the team
	isMember, err := h.teamStore.IsMember(ctx, task.TeamID, userID)
	if err != nil {
		logger.Error(ctx, "assign task: membership check failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if !isMember {
		logger.Info(ctx, "assign task: forbidden (not team member)", "user_id", userID, "team_id", task.TeamID)
		helper.RespondError(w, r, apperror.Forbidden("only team members can assign tasks"))
		return
	}

	// Only reporter can assign
	if userID != task.ReporterID {
		logger.Info(ctx, "assign task: forbidden (not reporter)",
			"user_id", userID,
			"reporter_id", task.ReporterID,
		)
		helper.RespondError(w, r, apperror.Forbidden("only task creator can assign task"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	var in struct {
		AssigneeID uuid.UUID `json:"assignee_id"`
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&in); err != nil {
		logger.Error(ctx, "assign task: bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid request body"))
		return
	}
	if in.AssigneeID == uuid.Nil {
		helper.RespondError(w, r, apperror.BadRequest("assignee_id is required"))
		return
	}

	// Ensure assignee is a member of the team
	isAssigneeMember, err := h.teamStore.IsMember(ctx, task.TeamID, in.AssigneeID)
	if err != nil {
		logger.Error(ctx, "assign task: assignee membership check failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}
	if !isAssigneeMember {
		logger.Info(ctx, "assign task: assignee not in team", "assignee_id", in.AssigneeID, "team_id", task.TeamID)
		helper.RespondError(w, r, apperror.BadRequest("assignee must be a member of the team"))
		return
	}

	task, err = h.taskStore.Assign(ctx, task.ID, in.AssigneeID, time.Now().UTC())
	if err != nil {
		logger.Error(ctx, "assign task: store assign failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	logger.Info(ctx, "task assigned", "task_id", task.ID, "assignee_id", task.AssigneeID)
	helper.RespondJSON(w, r, http.StatusOK, task)
}

func (h *TaskHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}

	taskID, err := parseTaskID(r)
	if err != nil {
		logger.Error(ctx, "update status: invalid task id", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid task id"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	var in struct {
		Status store.TaskStatus `json:"status"`
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&in); err != nil {
		logger.Error(ctx, "update status: bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid request body"))
		return
	}
	if !isValidStatus(in.Status) {
		helper.RespondError(w, r, apperror.BadRequest("invalid task status"))
		return
	}

	task, err := h.getTaskByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			logger.Info(ctx, "update status: task not found", "task_id", taskID)
			helper.RespondError(w, r, apperror.NotFound("task not found"))
			return
		}
		logger.Error(ctx, "update status: failed to get task", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	if userID != task.AssigneeID {
		logger.Info(ctx, "update status: forbidden (not assignee)",
			"user_id", userID,
			"assignee_id", task.AssigneeID,
		)
		helper.RespondError(w, r, apperror.Forbidden("only assignee can update task status"))
		return
	}

	updatedTask, err := h.taskStore.UpdateStatus(ctx, taskID, in.Status, time.Now().UTC())
	if err != nil {
		logger.Error(ctx, "update status: store update failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	logger.Info(ctx, "task status updated", "task_id", taskID, "status", in.Status)
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

	taskID, err := parseTaskID(r)
	if err != nil {
		logger.Error(ctx, "delete task: invalid task id", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid task id"))
		return
	}

	task, err := h.getTaskByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			helper.RespondError(w, r, apperror.NotFound("task not found"))
			return
		}
		logger.Error(ctx, "delete task: failed to get task", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	if userID != task.ReporterID {
		logger.Info(ctx, "delete task: forbidden (not reporter)",
			"user_id", userID,
			"reporter_id", task.ReporterID,
		)
		helper.RespondError(w, r, apperror.Forbidden("only task creator can delete"))
		return
	}

	if err := h.taskStore.DeleteTask(ctx, taskID); err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			helper.RespondError(w, r, apperror.NotFound("task not found"))
			return
		}
		logger.Error(ctx, "delete task: store delete failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	logger.Info(ctx, "task deleted", "task_id", taskID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *TaskHandler) HandlePatchTask(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	logger.Info(ctx, "patch task: start")

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}

	taskID, err := parseTaskID(r)
	if err != nil {
		logger.Error(ctx, "patch task: invalid task id", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid task id"))
		return
	}

	task, err := h.getTaskByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, store.ErrTaskNotFound) {
			helper.RespondError(w, r, apperror.NotFound("task not found"))
			return
		}
		logger.Error(ctx, "patch task: failed to get task", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	if task.ReporterID != userID {
		logger.Info(ctx, "patch task: forbidden (not reporter)",
			"user_id", userID,
			"reporter_id", task.ReporterID,
		)
		helper.RespondError(w, r, apperror.Forbidden("only creator can update title, description and due_at"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	var in patchTaskInput
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&in); err != nil {
		logger.Error(ctx, "patch task: bad json", "err", err)
		helper.RespondError(w, r, apperror.BadRequest("invalid request body"))
		return
	}

	if in.Title == nil && in.Description == nil && in.DueAt == nil {
		helper.RespondError(w, r, apperror.BadRequest("at least one of title, description, or due_at must be provided"))
		return
	}

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
			logger.Error(ctx, "patch task: store update failed", "err", err)
			helper.RespondError(w, r, apperror.InternalError("internal error", err))
		}
		return
	}

	logger.Info(ctx, "patch task: success", "task_id", taskID)
	helper.RespondJSON(w, r, http.StatusOK, updatedTask)
}

// ===== helpers =====

func (h *TaskHandler) listTasks(w http.ResponseWriter, r *http.Request, asReporter bool) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}

	logger.Info(ctx, "listing tasks", "user_id", userID, "as_reporter", asReporter)

	var (
		tasks []store.Task
		err   error
	)

	if asReporter {
		tasks, err = h.taskStore.GetTasksByReporterID(ctx, userID)
	} else {
		tasks, err = h.taskStore.GetTasksByAssigneeID(ctx, userID)
	}

	if err != nil {
		logger.Error(ctx, "list tasks: store query failed", "err", err)
		helper.RespondError(w, r, apperror.InternalError("internal error", err))
		return
	}

	logger.Info(ctx, "list tasks: success", "user_id", userID, "count", len(tasks))

	response := map[string]any{
		"user_id":     userID,
		"as_reporter": asReporter,
		"tasks":       tasks,
	}
	helper.RespondJSON(w, r, http.StatusOK, response)
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

func taskInputValidation(in input) error {
	title := strings.TrimSpace(in.Title)
	if len(title) < 1 || len(title) > 100 {
		return errors.New("title length must be between 1 and 100")
	}
	if in.TeamID == uuid.Nil {
		return errors.New("team_id is required")
	}
	if in.DueAt.Before(time.Now().UTC().Add(8 * time.Hour)) {
		return errors.New("due_at must be at least 8 hours from now")
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
