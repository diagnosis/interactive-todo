package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/diagnosis/interactive-todo/internal/logger"
	store "github.com/diagnosis/interactive-todo/internal/store/tasks"
	"github.com/google/uuid"
)

type TaskHandler struct {
	taskStore store.TaskStore
}

func NewTaskHandler(ts store.TaskStore) *TaskHandler {
	return &TaskHandler{ts}
}

func (h *TaskHandler) HandleCreateTask(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	logger.Debug(ctx, "Creating new task")
	defer cancel()

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	//in here i will have to login before create so i can capture user info. so shall i use cookie, or header or session? using authorization header making more sense
	var in struct {
		Title       string     `json:"title"`
		Description string     `json:"description"`
		ReporterID  uuid.UUID  `json:"reporter_id"`
		AssigneeID  *uuid.UUID `json:"assignee_id"`
		DueAt       time.Time  `json:"due_at"`
	}
	dec.Decode(&in)

}
