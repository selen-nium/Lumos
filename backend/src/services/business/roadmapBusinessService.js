import { userRepository, roadmapRepository, contentRepository } from '../../repositories/index.js';
import { User } from '../../models/index.js';
import ragOrchestrator from '../ai/ragOrchestrator.js';

class RoadmapBusinessService {
  constructor() {
    this.userRepo = userRepository;
    this.roadmapRepo = roadmapRepository;
    this.contentRepo = contentRepository;
  }

  /**
   * Generate new roadmap for user (onboarding flow)
   */
  async generateRoadmap(userId, userToken, profileData) {
    try {
      console.log('🗺️ Generating roadmap for user:', userId);

      // Validate user exists
      const userExists = await this.userRepo.exists({ id: userId });
      if (!userExists) {
        throw new Error('User not found');
      }

      // Update user profile with onboarding data
      if (profileData) {
        await this._updateUserProfileData(userId, profileData);
      }

      // Generate roadmap using RAG orchestrator
      const { roadmap: roadmapData } = await ragOrchestrator.generateInitialRoadmap(userId, profileData);
      
      // ENHANCED DEBUGGING AND PROCESSING:
      console.log('🔍 Generated roadmap data FULL:', JSON.stringify(roadmapData, null, 2));
      
      // Extract modules properly
      let modules = [];
      if (roadmapData.modules && Array.isArray(roadmapData.modules)) {
        modules = roadmapData.modules;
      } else if (roadmapData.phases && Array.isArray(roadmapData.phases)) {
        modules = roadmapData.phases.flatMap(phase => phase.modules || []);
      }
      
      console.log('🔍 Extracted modules:', {
        count: modules.length,
        moduleNames: modules.map(m => m.module_name || m.name)
      });
      
      if (modules.length === 0) {
        throw new Error('No modules found in generated roadmap');
      }
      
      // Ensure roadmap has modules in the right place
      const processedRoadmap = {
        ...roadmapData,
        modules: modules // Ensure modules are at top level
      };

      console.log('🔍 Processed roadmap for saving:', {
        title: processedRoadmap.roadmap_title || processedRoadmap.path_name,
        modulesCount: processedRoadmap.modules?.length || 0
      });

      // Save roadmap using new normalized approach
      await this.roadmapRepo.createLearningPath(userId, processedRoadmap);

      console.log('✅ Roadmap generated and saved successfully');
      
      // Get stats for response
      const stats = await this.roadmapRepo.getRoadmapStats(userId);
      
      return {
        success: true,
        roadmapInfo: {
          title: stats.title,
          totalModules: stats.totalModules,
          totalHours: stats.estimatedHours,
          estimatedWeeks: Math.ceil(stats.estimatedHours / 10),
          enhanced: true
        }
      };

    } catch (error) {
      console.error('❌ Roadmap generation error:', error);
      throw error;
    }
  }

  /**
   * Get user's roadmap with all details
   */
  async getUserRoadmap(userId) {
    try {
      console.log('📚 Getting roadmap for user:', userId);

      const roadmapData = await this.roadmapRepo.findActiveByUserId(userId);
      
      if (!roadmapData) {
        return {
          success: false,
          error: 'No active roadmap found'
        };
      }

      return {
        success: true,
        roadmap: {
          path_id: roadmapData.user_path_id,
          path_title: roadmapData.path_name,
          path_description: roadmapData.path_description,
          modules: roadmapData.modules || [],
          created_at: roadmapData.created_at,
          updated_at: roadmapData.updated_at
        }
      };

    } catch (error) {
      console.error('❌ Error fetching roadmap:', error);
      throw error;
    }
  }

  /**
   * Update module completion status
   */
  async updateModuleCompletion(moduleId, userId, isCompleted) {
    try {
      console.log('📝 Updating module completion:', { moduleId, userId, isCompleted });

      const result = await this.roadmapRepo.updateModuleCompletion(userId, moduleId, isCompleted);
      
      // Get updated stats
      const stats = await this.roadmapRepo.getRoadmapStats(userId);
      
      return {
        success: true,
        message: 'Module completion status updated',
        progress: {
          totalModules: stats.totalModules,
          completedModules: stats.completedModules,
          completedPercentage: stats.completionPercentage
        }
      };

    } catch (error) {
      console.error('❌ Error updating module completion:', error);
      throw error;
    }
  }

  /**
   * Get user's learning progress and analytics
   */
  async getUserProgress(userId) {
    try {
      const stats = await this.roadmapRepo.getRoadmapStats(userId);
      
      if (!stats.hasRoadmap) {
        return { hasRoadmap: false };
      }

      // Get user for additional context
      const userData = await this.userRepo.getProfile(userId);
      const user = new User(userData);

      return {
        hasRoadmap: true,
        progress: {
          totalModules: stats.totalModules,
          completedModules: stats.completedModules,
          completedPercentage: stats.completionPercentage,
          totalHours: stats.estimatedHours
        },
        analytics: {
          experienceLevel: user.getExperienceLevel(),
          weeklyHours: user.weeklyLearningHours,
          estimatedCompletion: this._calculateEstimatedCompletion(
            stats.estimatedHours, 
            stats.completedModules, 
            stats.totalModules, 
            user.weeklyLearningHours
          ),
          achievements: this._calculateAchievements(stats)
        }
      };

    } catch (error) {
      console.error('❌ Error getting user progress:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations for user
   */
  async getRecommendations(userId, type = 'next_steps') {
    try {
      const roadmapData = await this.roadmapRepo.findActiveByUserId(userId);
      const userData = await this.userRepo.getProfile(userId);

      if (!roadmapData) {
        return {
          recommendations: [{
            type: 'setup',
            title: 'Complete Onboarding',
            description: 'Create your personalized learning roadmap',
            priority: 'high'
          }]
        };
      }

      const user = new User(userData);
      const modules = roadmapData.modules || [];
      const nextModule = modules.find(m => !m.is_completed);

      return {
        recommendations: this._generateRecommendations(type, modules, user, nextModule)
      };

    } catch (error) {
      console.error('❌ Error getting recommendations:', error);
      throw error;
    }
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  async _updateUserProfileData(userId, profileData) {
    const operations = [];

    if (profileData.skills?.length > 0) {
      operations.push(() => this.userRepo.updateUserSkills(userId, profileData.skills));
    }

    if (profileData.goals?.length > 0) {
      operations.push(() => this.userRepo.updateUserGoals(userId, profileData.goals));
    }

    // Update main profile fields
    const profileUpdates = {};
    ['career_stage', 'weekly_learning_hours', 'is_employed'].forEach(field => {
      if (profileData[field] !== undefined) {
        profileUpdates[field] = profileData[field];
      }
    });

    if (Object.keys(profileUpdates).length > 0) {
      operations.push(() => this.userRepo.updateProfile(userId, profileUpdates));
    }

    // Execute all updates
    if (operations.length > 0) {
      try {
        await Promise.all(operations.map(op => op()));
      } catch (error) {
        console.error('Error updating user profile data:', error);
        // Don't throw - this shouldn't block roadmap generation
      }
    }
  }

  _calculateEstimatedCompletion(totalHours, completedModules, totalModules, weeklyHours) {
    const remainingModules = totalModules - completedModules;
    if (remainingModules === 0) return new Date().toISOString();
    
    const avgHoursPerModule = totalHours / totalModules;
    const remainingHours = remainingModules * avgHoursPerModule;
    const weeksRemaining = Math.ceil(remainingHours / weeklyHours);
    
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + (weeksRemaining * 7));
    
    return completionDate.toISOString();
  }

  _calculateAchievements(stats) {
    const achievements = [];
    
    if (stats.completedModules === 1) {
      achievements.push({
        type: 'first_module',
        title: 'First Steps',
        message: 'Completed your first module! 🎉',
        icon: '🎯'
      });
    }
    
    if (stats.completionPercentage >= 25) {
      achievements.push({
        type: 'quarter_complete',
        title: 'Quarter Complete',
        message: '25% of your roadmap completed! 🏅',
        icon: '🌟'
      });
    }
    
    if (stats.completionPercentage >= 50) {
      achievements.push({
        type: 'half_complete',
        title: 'Halfway There',
        message: 'You\'re halfway through! 🌟',
        icon: '⭐'
      });
    }

    if (stats.completionPercentage >= 75) {
      achievements.push({
        type: 'three_quarters',
        title: 'Almost Done',
        message: '75% complete - you\'re almost there! 🚀',
        icon: '🎖️'
      });
    }

    if (stats.completionPercentage >= 100) {
      achievements.push({
        type: 'roadmap_complete',
        title: 'Roadmap Complete',
        message: 'Amazing work! You completed your entire roadmap! 🏆',
        icon: '👑'
      });
    }

    return achievements;
  }

  _generateRecommendations(type, modules, user, nextModule) {
    const recommendations = [];
    
    switch (type) {
      case 'next_steps':
        if (nextModule) {
          recommendations.push({
            type: 'continue_learning',
            title: `Continue with ${nextModule.module_name}`,
            description: `Next up: ${nextModule.module_description || 'Learn important concepts'}`,
            estimatedHours: nextModule.estimated_hours,
            priority: 'high',
            action: {
              type: 'navigate',
              path: `/module/${nextModule.module_id}`
            }
          });
        }
        break;

      case 'study_plan':
        const weeklyHours = user.weeklyLearningHours;
        if (weeklyHours < 3) {
          recommendations.push({
            type: 'time_management',
            title: 'Increase Study Time',
            description: 'Consider dedicating 3-5 hours per week for better progress',
            priority: 'medium'
          });
        }
        
        recommendations.push({
          type: 'schedule',
          title: 'Optimal Schedule',
          description: `Based on ${weeklyHours} hours/week, study ${Math.ceil(weeklyHours/3)} times per week`,
          priority: 'medium'
        });
        break;

      default:
        recommendations.push({
          type: 'consistency',
          title: 'Stay Consistent',
          description: 'Regular daily practice is more effective than cramming',
          priority: 'high'
        });
    }

    return recommendations;
  }

  async healthCheck() {
    try {
      const [userHealth, roadmapHealth, contentHealth] = await Promise.all([
        this.userRepo.healthCheck().catch(() => ({ status: 'unhealthy' })),
        this.roadmapRepo.healthCheck().catch(() => ({ status: 'unhealthy' })),
        this.contentRepo.healthCheck().catch(() => ({ status: 'unhealthy' }))
      ]);

      const isHealthy = [userHealth, roadmapHealth, contentHealth]
        .every(check => check.status === 'healthy');

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        dependencies: {
          userRepository: userHealth.status,
          roadmapRepository: roadmapHealth.status,
          contentRepository: contentHealth.status
        },
        capabilities: {
          roadmapGeneration: isHealthy,
          userDataAccess: userHealth.status === 'healthy',
          progressTracking: roadmapHealth.status === 'healthy'
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

export default new RoadmapBusinessService();