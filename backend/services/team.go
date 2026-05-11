package services

import (
	"gorm.io/gorm"

	"merak-backend/models"
)

type TeamService struct{}

func NewTeamService() *TeamService {
	return &TeamService{}
}

func (s *TeamService) Create(db *gorm.DB, name, description string, ownerID uint) (*models.Team, error) {
	team := &models.Team{
		Name:        name,
		Description: description,
		OwnerID:     ownerID,
	}
	if err := db.Create(team).Error; err != nil {
		return nil, err
	}

	// Auto-add owner as admin member
	member := &models.TeamMember{
		TeamID: team.ID,
		UserID: ownerID,
		Role:   "admin",
	}
	if err := db.Create(member).Error; err != nil {
		return nil, err
	}

	return team, nil
}

func (s *TeamService) ListByUser(db *gorm.DB, userID uint) ([]models.Team, error) {
	var teams []models.Team
	if err := db.
		Joins("JOIN team_members ON team_members.team_id = teams.id").
		Where("team_members.user_id = ?", userID).
		Order("teams.created_at desc").
		Find(&teams).Error; err != nil {
		return nil, err
	}
	return teams, nil
}

func (s *TeamService) GetByID(db *gorm.DB, id uint) (*models.Team, error) {
	var team models.Team
	if err := db.First(&team, id).Error; err != nil {
		return nil, err
	}
	return &team, nil
}

func (s *TeamService) Update(db *gorm.DB, id, ownerID uint, name, description string) (*models.Team, error) {
	var team models.Team
	if err := db.First(&team, id).Error; err != nil {
		return nil, err
	}

	if team.OwnerID != ownerID {
		return nil, gorm.ErrRecordNotFound
	}

	if name != "" {
		team.Name = name
	}
	if description != "" {
		team.Description = description
	}

	if err := db.Save(&team).Error; err != nil {
		return nil, err
	}
	return &team, nil
}

func (s *TeamService) Delete(db *gorm.DB, id, ownerID uint) error {
	result := db.Where("id = ? AND owner_id = ?", id, ownerID).Delete(&models.Team{})
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	// Cascade delete members
	db.Where("team_id = ?", id).Delete(&models.TeamMember{})
	return result.Error
}

func (s *TeamService) ListMembers(db *gorm.DB, teamID uint) ([]models.TeamMember, error) {
	var members []models.TeamMember
	if err := db.Where("team_id = ?", teamID).Order("created_at asc").Find(&members).Error; err != nil {
		return nil, err
	}
	return members, nil
}

func (s *TeamService) AddMember(db *gorm.DB, teamID, userID uint, role string) (*models.TeamMember, error) {
	member := &models.TeamMember{
		TeamID: teamID,
		UserID: userID,
		Role:   role,
	}
	if err := db.Create(member).Error; err != nil {
		return nil, err
	}
	return member, nil
}

func (s *TeamService) RemoveMember(db *gorm.DB, teamID, userID uint) error {
	result := db.Where("team_id = ? AND user_id = ?", teamID, userID).Delete(&models.TeamMember{})
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}
