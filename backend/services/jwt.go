package services

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JwtConfig struct {
	AccessSecret      string
	RefreshSecret     string
	AccessExpSeconds  int64
	RefreshExpSeconds int64
}

type JwtService struct {
	config JwtConfig
}

type Claims struct {
	Sub       string `json:"sub"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Sid       string `json:"sid"`
	Jti       string `json:"jti,omitempty"`
	TokenType string `json:"type"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

func NewJwtService(config JwtConfig) *JwtService {
	return &JwtService{config: config}
}

func NewJwtServiceFromEnv() *JwtService {
	accessSecret := os.Getenv("JWT_ACCESS_SECRET")
	if accessSecret == "" {
		accessSecret = "default_access_secret_change_in_production"
	}

	refreshSecret := os.Getenv("JWT_REFRESH_SECRET")
	if refreshSecret == "" {
		refreshSecret = "default_refresh_secret_change_in_production"
	}

	accessSeconds := int64(60 * 15)
	if v := os.Getenv("JWT_ACCESS_EXP_SECONDS"); v != "" {
		if parsed, err := time.ParseDuration(v + "s"); err == nil {
			accessSeconds = int64(parsed.Seconds())
		}
	}

	refreshSeconds := int64(60 * 60 * 24 * 7)
	if v := os.Getenv("JWT_REFRESH_EXP_SECONDS"); v != "" {
		if parsed, err := time.ParseDuration(v + "s"); err == nil {
			refreshSeconds = int64(parsed.Seconds())
		}
	}

	return NewJwtService(JwtConfig{
		AccessSecret:      accessSecret,
		RefreshSecret:     refreshSecret,
		AccessExpSeconds:  accessSeconds,
		RefreshExpSeconds: refreshSeconds,
	})
}

func (s *JwtService) GenerateAccessToken(userID, username, email, sessionID string) (*string, error) {
	now := time.Now().UTC()
	claims := Claims{
		Sub:       userID,
		Username:  username,
		Email:     email,
		Sid:       sessionID,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(s.config.AccessExpSeconds) * time.Second)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.config.AccessSecret))
	if err != nil {
		return nil, err
	}

	return &signed, nil
}

func (s *JwtService) GenerateRefreshToken(userID, username, email, sessionID, refreshJTI string) (*string, error) {
	now := time.Now().UTC()
	claims := Claims{
		Sub:       userID,
		Username:  username,
		Email:     email,
		Sid:       sessionID,
		Jti:       refreshJTI,
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(s.config.RefreshExpSeconds) * time.Second)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.config.RefreshSecret))
	if err != nil {
		return nil, err
	}

	return &signed, nil
}

func (s *JwtService) GenerateTokenPair(userID, username, email, sessionID, refreshJTI string) (*TokenPair, error) {
	access, err := s.GenerateAccessToken(userID, username, email, sessionID)
	if err != nil {
		return nil, err
	}

	refresh, err := s.GenerateRefreshToken(userID, username, email, sessionID, refreshJTI)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  *access,
		RefreshToken: *refresh,
		TokenType:    "Bearer",
		ExpiresIn:    s.config.AccessExpSeconds,
	}, nil
}

func (s *JwtService) VerifyAccessToken(tokenString string) (*Claims, error) {
	return s.verifyToken(tokenString, s.config.AccessSecret, "access")
}

func (s *JwtService) VerifyRefreshToken(tokenString string) (*Claims, error) {
	return s.verifyToken(tokenString, s.config.RefreshSecret, "refresh")
}

func (s *JwtService) verifyToken(tokenString, secret, expectedType string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrTokenInvalid
	}

	if !token.Valid {
		return nil, ErrTokenInvalid
	}

	if claims.TokenType != expectedType {
		return nil, ErrTokenInvalid
	}

	return claims, nil
}

func (s *JwtService) AccessExpSeconds() int64 {
	return s.config.AccessExpSeconds
}

func (s *JwtService) RefreshExpSeconds() int64 {
	return s.config.RefreshExpSeconds
}
