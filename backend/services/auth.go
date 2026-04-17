package services

import (
	"errors"
	"strconv"

	"gorm.io/gorm"

	"merak-backend/models"
)

var (
	ErrWeakPassword       = errors.New("weak password")
	ErrUsernameExists     = errors.New("username already exists")
	ErrEmailExists        = errors.New("email already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrTokenInvalid       = errors.New("invalid token")
	ErrTokenExpired       = errors.New("token expired")
	ErrSessionInvalid     = errors.New("session invalid")
	ErrSessionExpired     = errors.New("session expired")
	ErrUserNotFound       = errors.New("user not found")
)

type AuthService struct {
	jwt      *JwtService
	password *PasswordService
	session  *SessionService
}

func NewAuthService(jwt *JwtService, password *PasswordService, session *SessionService) *AuthService {
	return &AuthService{
		jwt:      jwt,
		password: password,
		session:  session,
	}
}

func (s *AuthService) Register(db *gorm.DB, username, email, password string) (*models.User, *TokenPair, error) {
	if !s.password.CheckPasswordStrength(password) {
		return nil, nil, ErrWeakPassword
	}

	var count int64
	if err := db.Model(&models.User{}).Where("username = ?", username).Count(&count).Error; err != nil {
		return nil, nil, err
	}
	if count > 0 {
		return nil, nil, ErrUsernameExists
	}

	if err := db.Model(&models.User{}).Where("email = ?", email).Count(&count).Error; err != nil {
		return nil, nil, err
	}
	if count > 0 {
		return nil, nil, ErrEmailExists
	}

	hash, err := s.password.HashPassword(password)
	if err != nil {
		return nil, nil, err
	}

	user := &models.User{
		Username:     username,
		Email:        email,
		PasswordHash: hash,
	}

	if err := db.Create(user).Error; err != nil {
		return nil, nil, err
	}

	sessionInfo, err := s.session.CreateSession(db, user.ID, s.jwt.RefreshExpSeconds())
	if err != nil {
		return nil, nil, err
	}

	tokenPair, err := s.jwt.GenerateTokenPair(
		strconv.FormatUint(uint64(user.ID), 10),
		user.Username,
		user.Email,
		sessionInfo.SessionID,
		sessionInfo.RefreshJTI,
	)
	if err != nil {
		return nil, nil, err
	}

	return user, tokenPair, nil
}

func (s *AuthService) Login(db *gorm.DB, identifier, password string) (*models.User, *TokenPair, error) {
	var user models.User
	if err := db.Where("username = ? OR email = ?", identifier, identifier).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, err
	}

	valid, err := s.password.VerifyPassword(password, user.PasswordHash)
	if err != nil {
		return nil, nil, err
	}
	if !valid {
		return nil, nil, ErrInvalidCredentials
	}

	if err := s.session.CleanupExpiredForUser(db, user.ID); err != nil {
		return nil, nil, err
	}

	sessionInfo, err := s.session.CreateSession(db, user.ID, s.jwt.RefreshExpSeconds())
	if err != nil {
		return nil, nil, err
	}

	tokenPair, err := s.jwt.GenerateTokenPair(
		strconv.FormatUint(uint64(user.ID), 10),
		user.Username,
		user.Email,
		sessionInfo.SessionID,
		sessionInfo.RefreshJTI,
	)
	if err != nil {
		return nil, nil, err
	}

	return &user, tokenPair, nil
}

func (s *AuthService) RefreshToken(db *gorm.DB, refreshToken string) (*TokenPair, error) {
	claims, err := s.jwt.VerifyRefreshToken(refreshToken)
	if err != nil {
		return nil, err
	}

	session, err := s.session.LoadActiveSession(db, claims.Sid)
	if err != nil {
		return nil, err
	}

	if session.RefreshJTI != claims.Jti {
		return nil, ErrTokenInvalid
	}

	if strconv.FormatUint(uint64(session.UserID), 10) != claims.Sub {
		return nil, ErrSessionInvalid
	}

	newJTI, err := s.session.RotateRefreshJTI(db, session, s.jwt.RefreshExpSeconds())
	if err != nil {
		return nil, err
	}

	return s.jwt.GenerateTokenPair(claims.Sub, claims.Username, claims.Email, claims.Sid, newJTI)
}

func (s *AuthService) VerifyAccessToken(db *gorm.DB, accessToken string) (*Claims, error) {
	claims, err := s.jwt.VerifyAccessToken(accessToken)
	if err != nil {
		return nil, err
	}

	session, err := s.session.LoadActiveSession(db, claims.Sid)
	if err != nil {
		return nil, err
	}

	if strconv.FormatUint(uint64(session.UserID), 10) != claims.Sub {
		return nil, ErrSessionInvalid
	}

	return claims, nil
}

func (s *AuthService) GetUser(db *gorm.DB, userID string) (*models.User, error) {
	parsed, err := strconv.ParseUint(userID, 10, 64)
	if err != nil {
		return nil, ErrUserNotFound
	}

	var user models.User
	if err := db.First(&user, parsed).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

func (s *AuthService) ListUsers(db *gorm.DB) ([]models.User, error) {
	var users []models.User
	if err := db.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (s *AuthService) Logout(db *gorm.DB, accessToken string) error {
	claims, err := s.VerifyAccessToken(db, accessToken)
	if err != nil {
		return err
	}
	return s.session.DeleteSession(db, claims.Sid)
}
