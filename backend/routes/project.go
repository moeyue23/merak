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

type createProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type updateProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type projectResponse struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	OwnerID     uint   `json:"owner_id"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

func RegisterProjectRoutes(r chi.Router, projectService *services.ProjectService, authService *services.AuthService) {
	r.Route("/projects", func(r chi.Router) {
		r.Get("/", listProjectsHandler(projectService, authService))
		r.Post("/", createProjectHandler(projectService, authService))
		r.Get("/{id}", getProjectHandler(projectService, authService))
		r.Put("/{id}", updateProjectHandler(projectService, authService))
		r.Delete("/{id}", deleteProjectHandler(projectService, authService))
	})
}

func listProjectsHandler(projects *services.ProjectService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		ownerOnly := r.URL.Query().Get("owner") == "true"

		var result []models.Project
		if ownerOnly {
			result, err = projects.ListByOwner(db.DB, userID)
		} else {
			result, err = projects.ListAll(db.DB)
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		resp := make([]projectResponse, 0, len(result))
		for _, p := range result {
			resp = append(resp, toProjectResponse(&p))
		}

		writeJSON(w, http.StatusOK, common.OkResponse(resp))
	}
}

func createProjectHandler(projects *services.ProjectService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		var req createProjectRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		if req.Name == "" {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "project name is required"))
			return
		}

		project, err := projects.Create(db.DB, req.Name, req.Description, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		writeJSON(w, http.StatusCreated, common.OkResponse(toProjectResponse(project)))
	}
}

func getProjectHandler(projects *services.ProjectService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := extractUserIDFromToken(r, auth); err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid project ID"))
			return
		}

		project, err := projects.GetByID(db.DB, uint(id))
		if err != nil {
			writeError(w, http.StatusNotFound, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "project not found"))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(toProjectResponse(project)))
	}
}

func updateProjectHandler(projects *services.ProjectService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := extractUserIDFromToken(r, auth); err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid project ID"))
			return
		}

		var req updateProjectRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		project, err := projects.Update(db.DB, uint(id), req.Name, req.Description)
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(toProjectResponse(project)))
	}
}

func deleteProjectHandler(projects *services.ProjectService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid project ID"))
			return
		}

		if err := projects.Delete(db.DB, uint(id), userID); err != nil {
			writeError(w, http.StatusNotFound, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "project not found"))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(map[string]string{"message": "deleted"}))
	}
}

func toProjectResponse(p *models.Project) projectResponse {
	return projectResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		OwnerID:     p.OwnerID,
		CreatedAt:   p.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   p.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}
