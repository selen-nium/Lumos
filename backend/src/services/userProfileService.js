import sql from '../database/db.js';

class UserProfileService {
    /**
     * Get user profile from database
     */
    async getUserProfile(userId) {
        try {
            const result = await sql`
                SELECT * FROM profiles WHERE id = ${userId}
            `;
            
            if (result.length === 0) {
                throw new Error('User profile not found');
            }
            
            return result[0];
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }

    /**
     * Get user's current skills
     */
    async getUserSkills(userId) {
        try {
            const result = await sql`
                SELECT s.skill_id, s.skill_name, s.category, us.proficiency_level
                FROM user_skills us
                JOIN skills s ON us.skill_id = s.skill_id
                WHERE us.user_id = ${userId}
            `;
            
            return result;
        } catch (error) {
            console.error('Error fetching user skills:', error);
            throw error;
        }
    }

    /**
     * Get user's learning goals
     */
    async getUserGoals(userId) {
        try {
            const result = await sql`
                SELECT g.goal_id, g.goal_title, g.goal_description
                FROM user_goals ug
                JOIN goals g ON ug.goal_id = g.goal_id
                WHERE ug.user_id = ${userId} AND ug.is_completed = false
            `;
            
            return result;
        } catch (error) {
            console.error('Error fetching user goals:', error);
            throw error;
        }
    }

    /**
     * Get user's current learning path
     */
    async getCurrentLearningPath(userId) {
        try {
            const result = await sql`
                SELECT * FROM user_learning_paths 
                WHERE user_id = ${userId} 
                AND status = 'active'
                ORDER BY created_at DESC
                LIMIT 1
            `;
            
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching current learning path:', error);
            throw error;
        }
    }

    /**
     * Create a comprehensive user context for RAG
     */
    async createUserContext(userId) {
        try {
            const [profile, skills, goals, currentPath] = await Promise.all([
                this.getUserProfile(userId),
                this.getUserSkills(userId),
                this.getUserGoals(userId),
                this.getCurrentLearningPath(userId)
            ]);

            return {
                profile,
                skills: skills.map(s => ({
                    id: s.skill_id,
                    name: s.skill_name,
                    category: s.category,
                    proficiency: s.proficiency_level
                })),
                goals: goals.map(g => ({
                    id: g.goal_id,
                    title: g.goal_title,
                    description: g.goal_description
                })),
                currentPath,
                // Create text descriptions for RAG
                skillsText: skills.map(s => s.skill_name).join(', '),
                goalsText: goals.map(g => g.goal_title).join(', '),
                experienceLevel: this.determineExperienceLevel(profile.career_stage),
                preferredDifficulty: this.mapCareerStageToDefaultDifficulty(profile.career_stage),
                timeAvailable: profile.weekly_learning_hours || 5,
                learningStyle: profile.learning_style || 'mixed'
            };
        } catch (error) {
            console.error('Error creating user context:', error);
            throw error;
        }
    }

    /**
     * Helper: Determine experience level from career stage
     */
    determineExperienceLevel(careerStage) {
        const mapping = {
            'student': 'beginner',
            'early-career': 'beginner',
            'mid-career': 'intermediate',
            'senior': 'advanced',
            'career-break': 'intermediate'
        };
        return mapping[careerStage] || 'beginner';
    }

    /**
     * Helper: Map career stage to default difficulty preference
     */
    mapCareerStageToDefaultDifficulty(careerStage) {
        const mapping = {
            'student': 1,
            'early-career': 2,
            'mid-career': 3,
            'senior': 4,
            'career-break': 2
        };
        return mapping[careerStage] || 2;
    }
}

export default new UserProfileService();
