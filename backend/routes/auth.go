package routes

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"merak-backend/common"
	"merak-backend/db"
	"merak-backend/models"
	"merak-backend/services"
)

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type userResponse struct {
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type authResponse struct {
	User   userResponse         `json:"user"`
	Tokens *services.TokenPair `json:"tokens"`
}

type usersListResponse struct {
	Users []userResponse `json:"users"`
}

type updateMeRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
}

func RegisterAuthRoutes(r chi.Router, authService *services.AuthService) {
	r.Route("/auth", func(r chi.Router) {
		r.Post("/register", registerHandler(authService))
		r.Post("/login", loginHandler(authService))
		r.Post("/refresh", refreshHandler(authService))
		r.Post("/logout", logoutHandler(authService))
		r.Get("/me", meHandler(authService))
		r.Put("/me", updateMeHandler(authService))
		r.Get("/users", listUsersHandler(authService))
	})
}

func registerHandler(auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req registerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		user, tokens, err := auth.Register(db.DB, req.Username, req.Email, req.Password)
		if err != nil {
			writeAuthError(w, err)
			return
		}

		writeJSON(w, http.StatusCreated, common.OkResponse(authResponse{User: toUserResponse(user), Tokens: tokens}))
	}
}

func loginHandler(auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		user, tokens, err := auth.Login(db.DB, req.Identifier, req.Password)
		if err != nil {
			writeAuthError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(authResponse{User: toUserResponse(user), Tokens: tokens}))
	}
}

func refreshHandler(auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req refreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		tokens, err := auth.RefreshToken(db.DB, req.RefreshToken)
		if err != nil {
			writeAuthError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(tokens))
	}
}

func logoutHandler(auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, err := extractBearerToken(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, err.Error()))
			return
		}

		if err := auth.Logout(db.DB, token); err != nil {
			writeAuthError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(map[string]string{"message": "logged out"}))
	}
}

func meHandler(auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, err := extractBearerToken(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, err.Error()))
			return
		}

		claims, err := auth.VerifyAccessToken(db.DB, token)
		if err != nil {
			writeAuthError(w, err)
			return
		}

		user, err := auth.GetUser(db.DB, claims.Sub)
		if err != nil {
			writeAuthError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(toUserResponse(user)))
	}
}

func updateMeHandler(auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, err := extractBearerToken(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, common.NewErrorResponse(common.CODE_TOKEN_INVALID, err.Error()))
			return
		}

		claims, err := auth.VerifyAccessToken(db.DB, token)
		if err != nil {
			writeAuthError(w, err)
			return
		}

		var req updateMeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, "invalid request payload"))
			return
		}

		user, err := auth.UpdateUser(db.DB, claims.Sub, req.Username, req.Email)
		if err != nil {
			writeAuthError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, common.OkResponse(toUserResponse(user)))
	}
}

func listUsersHandler(auth *services.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		users, err := auth.ListUsers(db.DB)
		if err != nil {
			writeError(w, http.StatusInternalServerError, common.NewErrorResponse(common.CODE_INTERNAL_ERROR, err.Error()))
			return
		}

		result := make([]userResponse, 0, len(users))
		for _, u := range users {
			result = append(result, toUserResponse(&u))
		}

		writeJSON(w, http.StatusOK, common.OkResponse(usersListResponse{Users: result}))
	}
}

func toUserResponse(user *models.User) userResponse {
	return userResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		CreatedAt: user.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt: user.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

func extractBearerToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", errors.New("missing authorization header")
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return "", errors.New("invalid authorization header")
	}

	return parts[1], nil
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, payload common.ErrorResponse) {
	writeJSON(w, status, payload)
}

func writeAuthError(w http.ResponseWriter, err error) {
	code := common.CODE_INTERNAL_ERROR
	status := http.StatusInternalServerError
	message := err.Error()

	switch err {
	case services.ErrWeakPassword:
		code = common.CODE_WEAK_PASSWORD
		status = http.StatusBadRequest
		message = "password must be at least 8 characters and contain uppercase, lowercase, and numbers"
	case services.ErrUsernameExists, services.ErrEmailExists:
		code = common.CODE_USER_EXISTS
		status = http.StatusConflict
	case services.ErrInvalidCredentials:
		code = common.CODE_INVALID_CREDENTIALS
		status = http.StatusUnauthorized
	case services.ErrTokenInvalid:
		code = common.CODE_TOKEN_INVALID
		status = http.StatusUnauthorized
	case services.ErrTokenExpired:
		code = common.CODE_TOKEN_EXPIRED
		status = http.StatusUnauthorized
	case services.ErrSessionInvalid, services.ErrSessionExpired:
		code = common.CODE_SESSION_INVALID
		status = http.StatusUnauthorized
	case services.ErrUserNotFound:
		code = common.CODE_USER_NOT_FOUND
		status = http.StatusNotFound
	}

	writeError(w, status, common.NewErrorResponse(code, message))
}
