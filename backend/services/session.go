package services

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"merak-backend/models"
)

type SessionInfo struct {
	SessionID  string
	RefreshJTI string
}

type SessionService struct{}

func NewSessionService() *SessionService {
	return &SessionService{}
}

func (s *SessionService) CreateSession(db *gorm.DB, userID uint, refreshExpSeconds int64) (*SessionInfo, error) {
	now := time.Now().UTC()
	sessionID := uuid.NewString()
	refreshJTI := uuid.NewString()

	session := &models.AuthSession{
		ID:               sessionID,
		UserID:           userID,
		RefreshJTI:       refreshJTI,
		RefreshExpiresAt: now.Add(time.Duration(refreshExpSeconds) * time.Second),
		CreatedAt:        now,
		LastUsedAt:       now,
	}

	if err := db.Create(session).Error; err != nil {
		return nil, err
	}

	return &SessionInfo{SessionID: sessionID, RefreshJTI: refreshJTI}, nil
}

func (s *SessionService) CleanupExpiredForUser(db *gorm.DB, userID uint) error {
	return db.Where("user_id = ? AND refresh_expires_at < ?", userID, time.Now().UTC()).Delete(&models.AuthSession{}).Error
}

func (s *SessionService) LoadActiveSession(db *gorm.DB, sessionID string) (*models.AuthSession, error) {
	var session models.AuthSession
	if err := db.First(&session, "id = ?", sessionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSessionInvalid
		}
		return nil, err
	}

	if session.RefreshExpiresAt.Before(time.Now().UTC()) {
		_ = db.Delete(&session).Error
		return nil, ErrSessionExpired
	}

	return &session, nil
}

func (s *SessionService) RotateRefreshJTI(db *gorm.DB, session *models.AuthSession, refreshExpSeconds int64) (string, error) {
	newRefreshJTI := uuid.NewString()
	now := time.Now().UTC()

	session.RefreshJTI = newRefreshJTI
	session.RefreshExpiresAt = now.Add(time.Duration(refreshExpSeconds) * time.Second)
	session.LastUsedAt = now

	if err := db.Save(session).Error; err != nil {
		return "", err
	}

	return newRefreshJTI, nil
}

func (s *SessionService) DeleteSession(db *gorm.DB, sessionID string) error {
	return db.Delete(&models.AuthSession{}, "id = ?", sessionID).Error
}
