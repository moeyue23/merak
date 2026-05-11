package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"merak-backend/db"
	"merak-backend/routes"
	"merak-backend/services"
)

func main() {
	if err := db.InitDB(); err != nil {
		log.Fatalf("failed to initialize db: %v", err)
	}

	jwtService := services.NewJwtServiceFromEnv()
	passwordService := services.NewPasswordService()
	authService := services.NewAuthService(jwtService, passwordService, services.NewSessionService())
	inboxService := services.NewInboxService()
	projectService := services.NewProjectService()
	issueService := services.NewIssueService()

	router := chi.NewRouter()

	router.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175", "http://localhost:4173", "http://127.0.0.1:4173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	router.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	routes.RegisterAuthRoutes(router, authService)
	routes.RegisterInboxRoutes(router, inboxService, authService)
	routes.RegisterProjectRoutes(router, projectService, authService)
	routes.RegisterIssueRoutes(router, issueService, authService)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Serving on http://127.0.0.1:%s\n", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", port), router))
}
