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

type createIssueRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	ProjectID   uint   `json:"project_id"`
	AssigneeID  uint   `json:"assignee_id"`
}

type updateIssueRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	Priority    *string `json:"priority"`
	AssigneeID  *uint   `json:"assignee_id"`
}

type issueResponse struct {
	ID          uint   `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	ProjectID   uint   `json:"project_id"`
	AssigneeID  uint   `json:"assignee_id"`
	ReporterID  uint   `json:"reporter_id"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

func RegisterIssueRoutes(r chi.Router, issueService *services.IssueService, authService *services.AuthService) {
	r.Route("/issues", func(r chi.Router) {
		r.Get("/", listIssuesHandler(issueService, authService))
		r.Post("/", createIssueHandler(issueService, authService))
		r.Get("/{id}", getIssueHandler(issueService, authService))
		r.Put("/{id}", updateIssueHandler(issueService, authService))
		r.Delete("/{id}", deleteIssueHandler(issueService, authService))
	})
}

func listIssuesHandler(issues *services.IssueService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		assigneeStr := r.URL.Query().Get("assignee_id")
		var result []models.Issue
		if assigneeStr == "me" {
			result, err = issues.ListByAssignee(db.DB, userID)
		} else if assigneeStr != "" {
			parsed, parseErr := strconv.ParseUint(assigneeStr, 10, 64)
			if parseErr != nil {
				writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid assignee_id"))
				return
			}
			result, err = issues.ListByAssignee(db.DB, uint(parsed))
		} else {
			// Default to current user's issues
			result, err = issues.ListByAssignee(db.DB, userID)
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		resp := make([]issueResponse, 0, len(result))
		for _, i := range result {
			resp = append(resp, toIssueResponse(&i))
		}

		writeJSON(w, http.StatusOK, common.OkResponse(resp))
	}
}

func createIssueHandler(issues *services.IssueService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		var req createIssueRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		if req.Title == "" {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "issue title is required"))
			return
		}

		if req.ProjectID == 0 {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "project_id is required"))
			return
		}

		if req.AssigneeID == 0 {
			req.AssigneeID = userID
		}

		priority := req.Priority
		if priority == "" {
			priority = "medium"
		}

		issue, err := issues.Create(db.DB, req.Title, req.Description, "todo", priority, req.ProjectID, req.AssigneeID, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		writeJSON(w, http.StatusCreated, common.OkResponse(toIssueResponse(issue)))
	}
}

func getIssueHandler(issues *services.IssueService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := extractUserIDFromToken(r, auth); err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid issue ID"))
			return
		}

		issue, err := issues.GetByID(db.DB, uint(id))
		if err != nil {
			writeError(w, http.StatusNotFound, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "issue not found"))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(toIssueResponse(issue)))
	}
}

func updateIssueHandler(issues *services.IssueService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := extractUserIDFromToken(r, auth); err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid issue ID"))
			return
		}

		var req updateIssueRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		updates := make(map[string]interface{})
		if req.Title != nil {
			updates["title"] = *req.Title
		}
		if req.Description != nil {
			updates["description"] = *req.Description
		}
		if req.Status != nil {
			updates["status"] = *req.Status
		}
		if req.Priority != nil {
			updates["priority"] = *req.Priority
		}
		if req.AssigneeID != nil {
			updates["assignee_id"] = *req.AssigneeID
		}

		if len(updates) == 0 {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "no fields to update"))
			return
		}

		issue, err := issues.Update(db.DB, uint(id), updates)
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(toIssueResponse(issue)))
	}
}

func deleteIssueHandler(issues *services.IssueService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := extractUserIDFromToken(r, auth); err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid issue ID"))
			return
		}

		if err := issues.Delete(db.DB, uint(id)); err != nil {
			writeError(w, http.StatusNotFound, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "issue not found"))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(map[string]string{"message": "deleted"}))
	}
}

func toIssueResponse(i *models.Issue) issueResponse {
	return issueResponse{
		ID:          i.ID,
		Title:       i.Title,
		Description: i.Description,
		Status:      i.Status,
		Priority:    i.Priority,
		ProjectID:   i.ProjectID,
		AssigneeID:  i.AssigneeID,
		ReporterID:  i.ReporterID,
		CreatedAt:   i.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   i.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}
