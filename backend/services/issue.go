package services

import (
	"gorm.io/gorm"

	"merak-backend/models"
)

type IssueService struct{}

func NewIssueService() *IssueService {
	return &IssueService{}
}

func (s *IssueService) ListByAssignee(db *gorm.DB, assigneeID uint) ([]models.Issue, error) {
	var issues []models.Issue
	if err := db.Where("assignee_id = ?", assigneeID).Order("created_at desc").Find(&issues).Error; err != nil {
		return nil, err
	}
	return issues, nil
}

func (s *IssueService) ListByProject(db *gorm.DB, projectID uint) ([]models.Issue, error) {
	var issues []models.Issue
	if err := db.Where("project_id = ?", projectID).Order("created_at desc").Find(&issues).Error; err != nil {
		return nil, err
	}
	return issues, nil
}

func (s *IssueService) Create(db *gorm.DB, title, description, status, priority string, projectID, assigneeID, reporterID uint) (*models.Issue, error) {
	issue := &models.Issue{
		Title:       title,
		Description: description,
		Status:      status,
		Priority:    priority,
		ProjectID:   projectID,
		AssigneeID:  assigneeID,
		ReporterID:  reporterID,
	}
	if err := db.Create(issue).Error; err != nil {
		return nil, err
	}
	return issue, nil
}

func (s *IssueService) GetByID(db *gorm.DB, id uint) (*models.Issue, error) {
	var issue models.Issue
	if err := db.First(&issue, id).Error; err != nil {
		return nil, err
	}
	return &issue, nil
}

func (s *IssueService) Update(db *gorm.DB, id uint, updates map[string]interface{}) (*models.Issue, error) {
	var issue models.Issue
	if err := db.First(&issue, id).Error; err != nil {
		return nil, err
	}

	if err := db.Model(&issue).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Re-fetch to get updated values
	if err := db.First(&issue, id).Error; err != nil {
		return nil, err
	}
	return &issue, nil
}

func (s *IssueService) Delete(db *gorm.DB, id uint) error {
	result := db.Delete(&models.Issue{}, id)
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}
