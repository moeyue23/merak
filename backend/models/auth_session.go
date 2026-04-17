package models

import "time"

type AuthSession struct {
	ID               string    `gorm:"primaryKey;size:36" json:"id"`
	UserID           uint      `gorm:"not null;index" json:"user_id"`
	RefreshJTI       string    `gorm:"size:255;not null;index" json:"refresh_jti"`
	RefreshExpiresAt time.Time `gorm:"not null" json:"refresh_expires_at"`
	CreatedAt        time.Time `json:"created_at"`
	LastUsedAt       time.Time `gorm:"not null" json:"last_used_at"`
}
