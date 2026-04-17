package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"

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

	router := chi.NewRouter()
	router.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	routes.RegisterAuthRoutes(router, authService)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Serving on http://127.0.0.1:%s\n", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", port), router))
}
