package routes

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"merak-backend/common"
	"merak-backend/db"
	"merak-backend/models"
	"merak-backend/services"
)

type createTeamRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type updateTeamRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type addMemberRequest struct {
	UserID uint   `json:"user_id"`
	Role   string `json:"role"`
}

type teamResponse struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	OwnerID     uint   `json:"owner_id"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type teamMemberResponse struct {
	ID        uint   `json:"id"`
	TeamID    uint   `json:"team_id"`
	UserID    uint   `json:"user_id"`
	Role      string `json:"role"`
	CreatedAt string `json:"created_at"`
}

func RegisterTeamRoutes(r chi.Router, teamService *services.TeamService, authService *services.AuthService) {
	r.Route("/teams", func(r chi.Router) {
		r.Get("/", listTeamsHandler(teamService, authService))
		r.Post("/", createTeamHandler(teamService, authService))
		r.Get("/{id}", getTeamHandler(teamService, authService))
		r.Put("/{id}", updateTeamHandler(teamService, authService))
		r.Delete("/{id}", deleteTeamHandler(teamService, authService))
		r.Post("/{id}/members", addMemberHandler(teamService, authService))
		r.Delete("/{id}/members/{user_id}", removeMemberHandler(teamService, authService))
	})
}

func listTeamsHandler(teams *services.TeamService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		result, err := teams.ListByUser(db.DB, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		resp := make([]teamResponse, 0, len(result))
		for _, t := range result {
			resp = append(resp, toTeamResponse(&t))
		}

		writeJSON(w, http.StatusOK, common.OkResponse(resp))
	}
}

func createTeamHandler(teams *services.TeamService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		var req createTeamRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		if req.Name == "" {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "team name is required"))
			return
		}

		team, err := teams.Create(db.DB, req.Name, req.Description, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		writeJSON(w, http.StatusCreated, common.OkResponse(toTeamResponse(team)))
	}
}

func getTeamHandler(teams *services.TeamService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := extractUserIDFromToken(r, auth); err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid team ID"))
			return
		}

		team, err := teams.GetByID(db.DB, uint(id))
		if err != nil {
			writeError(w, http.StatusNotFound, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "team not found"))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(toTeamResponse(team)))
	}
}

func updateTeamHandler(teams *services.TeamService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid team ID"))
			return
		}

		var req updateTeamRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		team, err := teams.Update(db.DB, uint(id), userID, req.Name, req.Description)
		if err != nil {
			writeError(w, http.StatusNotFound, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "team not found"))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(toTeamResponse(team)))
	}
}

func deleteTeamHandler(teams *services.TeamService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid team ID"))
			return
		}

		if err := teams.Delete(db.DB, uint(id), userID); err != nil {
			writeError(w, http.StatusNotFound, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "team not found"))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(map[string]string{"message": "deleted"}))
	}
}

func addMemberHandler(teams *services.TeamService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := extractUserIDFromToken(r, auth); err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid team ID"))
			return
		}

		var req addMemberRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		role := req.Role
		if role == "" {
			role = "member"
		}

		member, err := teams.AddMember(db.DB, uint(id), req.UserID, role)
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		writeJSON(w, http.StatusCreated, common.OkResponse(toTeamMemberResponse(member)))
	}
}

func removeMemberHandler(teams *services.TeamService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := extractUserIDFromToken(r, auth); err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid team ID"))
			return
		}

		memberIDStr := chi.URLParam(r, "user_id")
		memberID, err := strconv.ParseUint(memberIDStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid member user ID"))
			return
		}

		if err := teams.RemoveMember(db.DB, uint(id), uint(memberID)); err != nil {
			writeError(w, http.StatusNotFound, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "member not found"))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(map[string]string{"message": "removed"}))
	}
}

func toTeamResponse(t *models.Team) teamResponse {
	return teamResponse{
		ID:          t.ID,
		Name:        t.Name,
		Description: t.Description,
		OwnerID:     t.OwnerID,
		CreatedAt:   t.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   t.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

func toTeamMemberResponse(m *models.TeamMember) teamMemberResponse {
	return teamMemberResponse{
		ID:        m.ID,
		TeamID:    m.TeamID,
		UserID:    m.UserID,
		Role:      m.Role,
		CreatedAt: m.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}
