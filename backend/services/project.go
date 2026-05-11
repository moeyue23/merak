package services

import (
	"gorm.io/gorm"

	"merak-backend/models"
)

type ProjectService struct{}

func NewProjectService() *ProjectService {
	return &ProjectService{}
}

func (s *ProjectService) Create(db *gorm.DB, name, description string, ownerID uint) (*models.Project, error) {
	project := &models.Project{
		Name:        name,
		Description: description,
		OwnerID:     ownerID,
	}
	if err := db.Create(project).Error; err != nil {
		return nil, err
	}
	return project, nil
}

func (s *ProjectService) ListByOwner(db *gorm.DB, ownerID uint) ([]models.Project, error) {
	var projects []models.Project
	if err := db.Where("owner_id = ?", ownerID).Order("created_at desc").Find(&projects).Error; err != nil {
		return nil, err
	}
	return projects, nil
}

func (s *ProjectService) ListAll(db *gorm.DB) ([]models.Project, error) {
	var projects []models.Project
	if err := db.Order("created_at desc").Find(&projects).Error; err != nil {
		return nil, err
	}
	return projects, nil
}

func (s *ProjectService) GetByID(db *gorm.DB, id uint) (*models.Project, error) {
	var project models.Project
	if err := db.First(&project, id).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

func (s *ProjectService) Update(db *gorm.DB, id uint, name, description string) (*models.Project, error) {
	var project models.Project
	if err := db.First(&project, id).Error; err != nil {
		return nil, err
	}

	if name != "" {
		project.Name = name
	}
	if description != "" {
		project.Description = description
	}

	if err := db.Save(&project).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

func (s *ProjectService) Delete(db *gorm.DB, id, ownerID uint) error {
	result := db.Where("id = ? AND owner_id = ?", id, ownerID).Delete(&models.Project{})
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}
