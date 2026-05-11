package services

import (
	"time"

	"gorm.io/gorm"

	"merak-backend/models"
)

type InboxService struct{}

func NewInboxService() *InboxService {
	return &InboxService{}
}

func (s *InboxService) ListByUser(db *gorm.DB, userID uint) ([]models.InboxMessage, error) {
	var messages []models.InboxMessage
	if err := db.Where("user_id = ?", userID).Order("created_at desc").Find(&messages).Error; err != nil {
		return nil, err
	}
	return messages, nil
}

func (s *InboxService) GetByID(db *gorm.DB, id, userID uint) (*models.InboxMessage, error) {
	var msg models.InboxMessage
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&msg).Error; err != nil {
		return nil, err
	}
	return &msg, nil
}

func (s *InboxService) MarkAsRead(db *gorm.DB, id, userID uint) error {
	return db.Model(&models.InboxMessage{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true).Error
}

func (s *InboxService) Delete(db *gorm.DB, id, userID uint) error {
	return db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.InboxMessage{}).Error
}

func (s *InboxService) SeedSampleData(db *gorm.DB, userID uint) error {
	var count int64
	db.Model(&models.InboxMessage{}).Where("user_id = ?", userID).Count(&count)
	if count > 0 {
		return nil
	}

	messages := []models.InboxMessage{
		{
			UserID:    userID,
			Title:     "Welcome to Merak!",
			Content:   "Welcome to Merak, your new project management tool. Get started by creating your first project or exploring the workspace. We're excited to have you on board!",
			IsRead:    false,
			CreatedAt: time.Now().Add(-24 * time.Hour),
		},
		{
			UserID:    userID,
			Title:     "Project Alpha milestone reached",
			Content:   "The Project Alpha team has reached the Q1 milestone ahead of schedule. All critical tasks have been completed. Great work everyone! Review the project dashboard for detailed progress.",
			IsRead:    false,
			CreatedAt: time.Now().Add(-2 * time.Hour),
		},
		{
			UserID:    userID,
			Title:     "New team member joined",
			Content:   "Jane Smith has joined the Engineering team. She'll be working on the backend infrastructure team starting next Monday. Please give her a warm welcome!",
			IsRead:    true,
			CreatedAt: time.Now().Add(-48 * time.Hour),
		},
	}

	return db.Create(&messages).Error
}
