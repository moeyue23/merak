package routes

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"merak-backend/common"
	"merak-backend/db"
	"merak-backend/models"
	"merak-backend/services"
)

type inboxMessageResponse struct {
	ID        uint   `json:"id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	IsRead    bool   `json:"is_read"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

func RegisterInboxRoutes(r chi.Router, inboxService *services.InboxService, authService *services.AuthService) {
	r.Route("/inbox", func(r chi.Router) {
		r.Get("/", listInboxHandler(inboxService, authService))
		r.Get("/{id}", getInboxHandler(inboxService, authService))
		r.Put("/{id}/read", markInboxReadHandler(inboxService, authService))
		r.Delete("/{id}", deleteInboxHandler(inboxService, authService))
	})
}

func extractUserIDFromToken(r *http.Request, auth *services.AuthService) (uint, error) {
	token, err := extractBearerToken(r)
	if err != nil {
		return 0, err
	}

	claims, err := auth.VerifyAccessToken(db.DB, token)
	if err != nil {
		return 0, err
	}

	parsed, err := strconv.ParseUint(claims.Sub, 10, 64)
	if err != nil {
		return 0, err
	}

	return uint(parsed), nil
}

func listInboxHandler(inbox *services.InboxService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		messages, err := inbox.ListByUser(db.DB, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		if len(messages) == 0 {
			if seedErr := inbox.SeedSampleData(db.DB, userID); seedErr == nil {
				messages, _ = inbox.ListByUser(db.DB, userID)
			}
		}

		result := make([]inboxMessageResponse, 0, len(messages))
		for _, msg := range messages {
			result = append(result, toInboxResponse(&msg))
		}

		writeJSON(w, http.StatusOK, common.OkResponse(result))
	}
}

func getInboxHandler(inbox *services.InboxService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid message ID"))
			return
		}

		msg, err := inbox.GetByID(db.DB, uint(id), userID)
		if err != nil {
			writeError(w, http.StatusNotFound, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "message not found"))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(toInboxResponse(msg)))
	}
}

func markInboxReadHandler(inbox *services.InboxService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid message ID"))
			return
		}

		if err := inbox.MarkAsRead(db.DB, uint(id), userID); err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(map[string]string{"message": "marked as read"}))
	}
}

func deleteInboxHandler(inbox *services.InboxService, auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := extractUserIDFromToken(r, auth)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, "unauthorized"))
			return
		}

		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid message ID"))
			return
		}

		if err := inbox.Delete(db.DB, uint(id), userID); err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(map[string]string{"message": "deleted"}))
	}
}

func toInboxResponse(msg *models.InboxMessage) inboxMessageResponse {
	return inboxMessageResponse{
		ID:        msg.ID,
		Title:     msg.Title,
		Content:   msg.Content,
		IsRead:    msg.IsRead,
		CreatedAt: msg.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt: msg.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}
