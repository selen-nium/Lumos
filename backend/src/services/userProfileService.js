import { userRepository, roadmapRepository, contentRepository } from '../repositories/index.js';
import { User } from '../models/index.js';

class UserProfileService {
    constructor() {
        this.userRepo = userRepository;
        this.roadmapRepo = roadmapRepository;
        this.contentRepo = contentRepository;
    }

    /**
     * Get user profile from database
     */
    async getUserProfile(userId) {
        try {
            console.log('👤 Getting user profile via repository:', userId);
            
            const profile = await this.userRepo.getProfile(userId);
            
            if (!profile) {
                throw new Error('User profile not found');
            }
            
            return User(profile);
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
            console.log('🛠️ Getting user skills via repository:', userId);
            
            return await this.userRepo.getUserSkills(userId);
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
            console.log('🎯 Getting user goals via repository:', userId);
            
            return await this.userRepo.getUserGoals(userId);
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
            console.log('🗺️ Getting current learning path via repository:', userId);
            
            return await this.roadmapRepo.findActiveByUserId(userId);
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
            console.log('🔍 Creating comprehensive user context:', userId);
            
            // Fetch all user data in parallel using repositories
            const [profile, skills, goals, currentPath] = await Promise.all([
                this.userRepo.getProfile(userId),
                this.userRepo.getUserSkills(userId),
                this.userRepo.getUserGoals(userId),
                this.roadmapRepo.findActiveByUserId(userId)
            ]);

            if (!profile) {
                throw new Error('User profile not found');
            }

            // Create structured context
            const userContext = {
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
                skillsText: skills.map(s => s.skill_name).join(', ') || 'No skills specified',
                goalsText: goals.map(g => g.goal_title).join(', ') || 'No goals specified',
                experienceLevel: this.determineExperienceLevel(profile.career_stage),
                preferredDifficulty: this.mapCareerStageToDefaultDifficulty(profile.career_stage),
                timeAvailable: profile.weekly_learning_hours || 5,
                learningStyle: profile.learning_style || 'mixed',
                
                // Additional context
                metadata: {
                    hasOnboardingComplete: profile.onboarding_complete,
                    isEmployed: profile.is_employed === 'yes',
                    userType: profile.user_type || 'mentee',
                    preferredLearningTime: profile.preferred_learning_time || 'evening',
                    createdAt: profile.created_at,
                    lastUpdated: profile.updated_at
                }
            };

            console.log('✅ User context created successfully:', {
                skillsCount: skills.length,
                goalsCount: goals.length,
                hasLearningPath: !!currentPath,
                experienceLevel: userContext.experienceLevel
            });

            return userContext;
        } catch (error) {
            console.error('Error creating user context:', error);
            throw error;
        }
    }

    /**
     * Update user profile using repository
     */
    async updateProfile(userId, updates) {
        const user = await this.getUserProfile(userId);
        user.update(updates);
        
        if (!user.isValid()) {
            throw new Error(`Validation failed: ${user.getErrors().map(e => e.message).join(', ')}`);
        }
        
        const saved = await this.userRepository.updateProfile(userId, user.toDatabase());
        return new User(saved);
    }

    /**
     * Update user skills using repository
     */
    async updateUserSkills(userId, skillIds) {
        try {
            console.log('💼 Updating user skills via repository:', userId);
            
            return await this.userRepo.updateUserSkills(userId, skillIds);
        } catch (error) {
            console.error('Error updating user skills:', error);
            throw error;
        }
    }

    /**
     * Update user goals using repository
     */
    async updateUserGoals(userId, goalIds) {
        try {
            console.log('🎯 Updating user goals via repository:', userId);
            
            return await this.userRepo.updateUserGoals(userId, goalIds);
        } catch (error) {
            console.error('Error updating user goals:', error);
            throw error;
        }
    }

    /**
     * Complete user onboarding
     */
    async completeOnboarding(userId, onboardingData) {
        try {
            console.log('🎉 Completing user onboarding:', userId);
            
            // Update profile, skills, and goals in a transaction-like manner
            const operations = [];

            // Update profile with onboarding data
            if (onboardingData.profileUpdates) {
                operations.push(() => this.userRepo.updateProfile(userId, {
                    ...onboardingData.profileUpdates,
                    onboarding_complete: true
                }));
            }

            // Update skills
            if (onboardingData.skills && onboardingData.skills.length > 0) {
                operations.push(() => this.userRepo.updateUserSkills(userId, onboardingData.skills));
            }

            // Update goals
            if (onboardingData.goals && onboardingData.goals.length > 0) {
                operations.push(() => this.userRepo.updateUserGoals(userId, onboardingData.goals));
            }

            // Execute all operations
            const results = await this.userRepo.db.executeInTransaction(operations);

            console.log('✅ Onboarding completed successfully');
            return { success: true, results };
        } catch (error) {
            console.error('Error completing onboarding:', error);
            throw error;
        }
    }

    /**
     * Get user learning statistics using repositories
     */
    async getUserStats(userId) {
        try {
            console.log('📊 Getting user statistics via repositories:', userId);
            
            // Get stats from different repositories
            const [userStats, roadmapStats] = await Promise.all([
                this.userRepo.getUserStats(userId),
                this.roadmapRepo.getRoadmapStats(userId)
            ]);

            return {
                ...userStats,
                roadmap: roadmapStats,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting user statistics:', error);
            throw error;
        }
    }

    /**
     * Get user's learning preferences
     */
    async getLearningPreferences(userId) {
        try {
            console.log('⚙️ Getting learning preferences:', userId);
            
            return await this.userRepo.getLearningPreferences(userId);
        } catch (error) {
            console.error('Error getting learning preferences:', error);
            throw error;
        }
    }

    /**
     * Get available skills and goals for reference
     */
    async getAvailableSkillsAndGoals() {
        try {
            console.log('📋 Getting available skills and goals');
            
            const [skills, goals] = await Promise.all([
                this.contentRepo.getAllSkills(),
                this.contentRepo.getAllGoals()
            ]);
            
            return { skills, goals };
        } catch (error) {
            console.error('Error fetching skills and goals:', error);
            throw error;
        }
    }

    /**
     * Search for content recommendations
     */
    async getContentRecommendations(userId, type = 'all', limit = 5) {
        try {
            console.log('💡 Getting content recommendations:', { userId, type, limit });
            
            return await this.contentRepo.getRecommendations(userId, type, limit);
        } catch (error) {
            console.error('Error getting content recommendations:', error);
            throw error;
        }
    }

    /**
     * Check if user exists and has completed onboarding
     */
    async validateUser(userId) {
        try {
            const profile = await this.userRepo.getProfile(userId);
            
            if (!profile) {
                return { exists: false, hasCompletedOnboarding: false };
            }

            return {
                exists: true,
                hasCompletedOnboarding: profile.onboarding_complete === true,
                profile: {
                    username: profile.username,
                    email: profile.email,
                    careerStage: profile.career_stage,
                    userType: profile.user_type
                }
            };
        } catch (error) {
            console.error('Error validating user:', error);
            return { exists: false, hasCompletedOnboarding: false, error: error.message };
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Determine experience level from career stage
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
     * Map career stage to default difficulty preference
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

    /**
     * Get user context summary ( logging/debugging)
     */
    getUserContextSummary(userContext) {
        return {
            userId: userContext.profile?.id,
            experienceLevel: userContext.experienceLevel,
            skillsCount: userContext.skills?.length || 0,
            goalsCount: userContext.goals?.length || 0,
            timeAvailable: userContext.timeAvailable,
            hasLearningPath: !!userContext.currentPath,
            onboardingComplete: userContext.metadata?.hasOnboardingComplete
        };
    }

    /**
     * Health check for user profile service
     */
    async healthCheck() {
        try {
            const repoHealth = await this.userRepo.db.healthCheck();
            
            return {
                status: repoHealth.status === 'healthy' ? 'healthy' : 'degraded',
                dependencies: {
                    userRepository: repoHealth.status,
                    database: repoHealth.connection
                },
                capabilities: {
                    profileManagement: repoHealth.status === 'healthy',
                    skillsManagement: repoHealth.status === 'healthy',
                    goalsManagement: repoHealth.status === 'healthy',
                    contextGeneration: true
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export default new UserProfileService();