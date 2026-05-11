package models

import "time"

type Issue struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"size:255;not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Status      string    `gorm:"size:20;not null;default:todo;index" json:"status"`
	Priority    string    `gorm:"size:10;not null;default:medium" json:"priority"`
	ProjectID   uint      `gorm:"not null;index" json:"project_id"`
	AssigneeID  uint      `gorm:"not null;index" json:"assignee_id"`
	ReporterID  uint      `gorm:"not null;index" json:"reporter_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
