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
	teamstore "github.com/diagnosis/interactive-todo/internal/store/teams"
	userstore "github.com/diagnosis/interactive-todo/internal/store/users"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type TeamHandler struct {
	teamsStore teamstore.TeamStore
	userStore  userstore.UserStore
}

func NewTeamHandler(ts teamstore.TeamStore, us userstore.UserStore) *TeamHandler {
	return &TeamHandler{ts, us}
}
func (h *TeamHandler) ListTeamsForUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Error(ctx, "unauthorized list teams attempt")
		helper.RespondError(w, r, apperror.Unauthorized("authentication required"))
		return
	}

	teams, err := h.teamsStore.ListTeamsForUser(ctx, userID)
	if err != nil {
		internalError(ctx, w, r, err)
		return
	}

	logger.Info(ctx,
		"listed teams for authenticated user",
		"user_id", userID,
		"team_count", len(teams),
	)

	helper.RespondJSON(w, r, http.StatusOK, map[string]any{
		"user_id": userID,
		"teams":   teams,
	})
}
func (h *TeamHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Error(ctx, "unauthorized list members attempt")
		helper.RespondError(w, r, apperror.Unauthorized("authentication required"))
		return
	}

	// Adjust key if your route is /teams/{id}/members
	teamID, ok := parseID("team_id", r)
	if !ok {
		logger.Error(ctx, "invalid team id in path")
		helper.RespondError(w, r, apperror.BadRequest("invalid team id"))
		return
	}

	isMember, err := h.teamsStore.IsMember(ctx, teamID, userID)
	if err != nil {
		internalError(ctx, w, r, err)
		return
	}
	if !isMember {
		forbiddenError(ctx, w, r, "only team members can list all team members")
		return
	}

	members, err := h.teamsStore.ListMembersInTeam(ctx, teamID)
	if err != nil {
		internalError(ctx, w, r, err)
		return
	}

	logger.Info(ctx, "successfully retrieved team members",
		"user_id", userID,
		"team_id", teamID,
		"member_count", len(members),
	)

	helper.RespondJSON(w, r, http.StatusOK, map[string]any{
		"team_id": teamID,
		"members": members,
	})
}

func (h *TeamHandler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	//check if user admin or task manager
	userId, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Error(ctx, "unauthorized")
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}
	user, err := h.userStore.GetUserByID(ctx, userId)
	if err != nil {
		if errors.Is(err, userstore.ErrNotFound) {
			helper.RespondError(w, r, apperror.NotFound("user not found"))
			return
		}
		internalError(ctx, w, r, err)
		return
	}
	if user.UserType != userstore.TypeAdmin && user.UserType != userstore.TypeTaskManager {
		helper.RespondError(w, r, apperror.Forbidden("only admin or task_manager can create team"))
		return
	}
	//get json
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	defer r.Body.Close()
	var in struct {
		Name string `json:"name"`
	}

	err = dec.Decode(&in)
	if err != nil {
		badJsonCheck(ctx, w, r, "bad json")
		return
	}

	name := strings.TrimSpace(in.Name)
	if len(name) == 0 {
		helper.RespondError(w, r, apperror.BadRequest("name is required"))
		return
	}
	if len(name) > 100 {
		helper.RespondError(w, r, apperror.BadRequest("name is too long"))
		return
	}

	created, err := h.teamsStore.CreateTeam(ctx, userId, name, time.Now().UTC())
	if err != nil {
		if errors.Is(err, teamstore.ErrTeamNameTaken) {
			logger.Info(ctx, "create team: name already taken", "name", in.Name)
			helper.RespondError(w, r, apperror.Conflict("team name already in use"))
			return
		}

		internalError(ctx, w, r, err)
		return
	}

	logger.Info(ctx,
		"team created successfully!",
		"team_id", created.ID,
		"owner_id", userId,
		"team_name", name,
	)
	helper.RespondJSON(w, r, http.StatusCreated, created)

}

func (h *TeamHandler) HandleAddMember(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	//check if user admin or task manager
	userId, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Error(ctx, "unauthorized")
		helper.RespondError(w, r, apperror.Unauthorized("unauthorized"))
		return
	}

	teamId, ok := parseID("team_id", r)
	if !ok {
		logger.Error(ctx, "bad team id passed")
		helper.RespondError(w, r, apperror.BadRequest("bad team id"))
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	defer r.Body.Close()
	var in struct {
		UserID uuid.UUID          `json:"user_id"`
		Role   teamstore.TeamRole `json:"role"`
	}

	err := dec.Decode(&in)
	if err != nil {
		badJsonCheck(ctx, w, r, "bad json")
		return
	}
	if !isValidTeamRole(in.Role) {
		helper.RespondError(w, r, apperror.BadRequest("invalid role"))
		return
	}
	member, err := h.userStore.GetUserByID(ctx, in.UserID)
	if err != nil {
		if errors.Is(err, userstore.ErrNotFound) {
			helper.RespondError(w, r, apperror.NotFound("user not found"))
			return
		}
		internalError(ctx, w, r, err)
		return
	}

	isOwnerOrAdmin, err := h.teamsStore.IsOwnerOrAdmin(ctx, teamId, userId)
	if err != nil {
		internalError(ctx, w, r, err)
		return
	}
	if !isOwnerOrAdmin {
		helper.RespondError(w, r, apperror.Forbidden("only team owner/admin can add members"))
		return
	}
	err = h.teamsStore.AddMember(ctx, teamId, userId, member.ID, in.Role, time.Now().UTC())
	if err != nil {
		internalError(ctx, w, r, err)
		return
	}
	logger.Info(ctx, "new member added to team", "userId:", member.ID, "teamID", teamId)
	helper.RespondJSON(w, r, 200, map[string]any{
		"teamID": teamId,
		"member": member,
	})

}
func (h *TeamHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	currentUserID, ok := middleware.GetUserIDFromContext(ctx)
	if !ok {
		logger.Error(ctx, "unauthorized")
		helper.RespondError(w, r, apperror.Unauthorized("user not authorized"))
		return
	}

	teamID, ok := parseID("team_id", r)
	if !ok {
		logger.Error(ctx, "bad team id")
		helper.RespondError(w, r, apperror.BadRequest("bad team id"))
		return
	}

	isAdminOrOwner, err := h.teamsStore.IsOwnerOrAdmin(ctx, teamID, currentUserID)
	if err != nil {
		internalError(ctx, w, r, err)
		return
	}
	if !isAdminOrOwner {
		logger.Error(ctx, "only admin or owner can remove member from team")
		helper.RespondError(w, r, apperror.Forbidden("only team owner/admin can remove members"))
		return
	}

	userID, ok := parseID("user_id", r)
	if !ok {
		logger.Error(ctx, "bad user id")
		helper.RespondError(w, r, apperror.BadRequest("bad user id"))
		return
	}

	removed, err := h.teamsStore.RemoveMemberFromTeam(ctx, teamID, userID)
	if err != nil {
		internalError(ctx, w, r, err)
		return
	}
	if !removed {
		logger.Info(ctx, "member not found in team", "user_id", userID, "team_id", teamID)
		helper.RespondError(w, r, apperror.NotFound("member not found in this team"))
		return
	}

	logger.Info(ctx, "user removed from team", "user_id", userID, "team_id", teamID)
	helper.RespondJSON(w, r, http.StatusOK, map[string]any{
		"message": "member removed from team",
		"team_id": teamID,
		"user_id": userID,
	})
}
func parseID(key string, r *http.Request) (uuid.UUID, bool) {
	idstr := chi.URLParam(r, key)
	id, err := uuid.Parse(idstr)
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}

func badJsonCheck(ctx context.Context, w http.ResponseWriter, r *http.Request, msg string) {
	logger.Error(ctx, msg)
	helper.RespondError(w, r, apperror.BadRequest(msg))
}
func internalError(ctx context.Context, w http.ResponseWriter, r *http.Request, err error) {
	logger.Error(ctx, "internal error", "err", err)
	helper.RespondError(w, r, apperror.InternalError("internal error", err))
}
func isValidTeamRole(r teamstore.TeamRole) bool {
	switch r {
	case teamstore.RoleOwner, teamstore.RoleAdmin, teamstore.RoleMember:
		return true
	default:
		return false
	}
}

func forbiddenError(ctx context.Context, w http.ResponseWriter, r *http.Request, msg string) {
	logger.Error(ctx, msg)
	helper.RespondError(w, r, apperror.Forbidden(msg))
}
