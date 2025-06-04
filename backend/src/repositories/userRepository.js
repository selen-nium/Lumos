// all user related ops
import BaseRepository from './base/baseRepository.js';

class UserRepository extends BaseRepository {
  constructor() {
    super('profiles', 'id');
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    try {
      console.log('👤 Getting user profile:', userId);
      
      const profile = await this.findById(userId);
      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile by email
   */
  async getProfileByEmail(email) {
    try {
      console.log('👤 Getting user profile by email:', email);
      
      const profile = await this.findOneBy({ email });
      return profile;
    } catch (error) {
      console.error('Error getting user profile by email:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    try {
      console.log('📝 Updating user profile:', userId);
      
      // Validate required fields if creating new profile
      if (!await this.exists({ id: userId })) {
        this.validateRequiredFields(updates, ['email']);
      }
      
      const sanitizedUpdates = this.sanitizeData(updates);
      return await this.updateById(userId, sanitizedUpdates);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Create or update user profile (upsert)
   */
  async upsertProfile(userId, profileData) {
    try {
      console.log('🔄 Upserting user profile:', userId);
      
      const dataWithId = { ...profileData, id: userId };
      const sanitizedData = this.sanitizeData(dataWithId);
      
      return await this.upsert(sanitizedData, ['id']);
    } catch (error) {
      console.error('Error upserting user profile:', error);
      throw error;
    }
  }

  /**
   * Get user skills with skill details
   */
  async getUserSkills(userId) {
    try {
      console.log('🛠️ Getting user skills:', userId);
      
      // Use direct Supabase query instead of findWithRelations for better control
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from('user_skills')
        .select(`
          skill_id,
          proficiency_level,
          skills (
            skill_id,
            skill_name,
            category
          )
        `)
        .eq('user_id', userId)
        .order('skill_id');

      if (error) throw error;

      const result = data || [];
      
      // Transform the data to flatten the structure
      return result.map(item => ({
        skill_id: item.skill_id,
        skill_name: item.skills?.skill_name,
        category: item.skills?.category,
        proficiency_level: item.proficiency_level
      }));
    } catch (error) {
      console.error('Error getting user skills:', error);
      throw error;
    }
  }

  /**
   * Update user skills
   */
  async updateUserSkills(userId, skills) {
    try {
      console.log('💼 Updating user skills:', userId);
      
      if (!Array.isArray(skills)) {
        throw new Error('Skills must be an array');
      }

      // First, delete existing skills
      const client = this.db.serviceClient;
      await client
        .from('user_skills')
        .delete()
        .eq('user_id', userId);

      // Then insert new skills
      if (skills.length > 0) {
        const userSkills = skills.map(skillId => ({
          user_id: userId,
          skill_id: skillId,
          proficiency_level: 3 // Default proficiency
        }));

        const { data, error } = await client
          .from('user_skills')
          .insert(userSkills)
          .select();

        if (error) throw error;
        
        return data;
      }

      return [];
    } catch (error) {
      console.error('Error updating user skills:', error);
      throw error;
    }
  }

  /**
   * Get user goals with goal details
   */
  async getUserGoals(userId) {
    try {
      console.log('🎯 Getting user goals:', userId);
      
      // Use direct Supabase query for better control over joins
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from('user_goals')
        .select(`
          goal_id,
          is_completed,
          goals (
            goal_id,
            goal_title,
            goal_description
          )
        `)
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('goal_id');

      if (error) throw error;

      const result = data || [];
      
      // Transform the data to flatten the structure
      return result.map(item => ({
        goal_id: item.goal_id,
        goal_title: item.goals?.goal_title,
        goal_description: item.goals?.goal_description,
        is_completed: item.is_completed
      }));
    } catch (error) {
      console.error('Error getting user goals:', error);
      throw error;
    }
  }

  /**
   * Update user goals
   */
  async updateUserGoals(userId, goals) {
    try {
      console.log('🎯 Updating user goals:', userId);
      
      if (!Array.isArray(goals)) {
        throw new Error('Goals must be an array');
      }

      // First, delete existing goals
      const client = this.db.serviceClient;
      await client
        .from('user_goals')
        .delete()
        .eq('user_id', userId);

      // Then insert new goals
      if (goals.length > 0) {
        const userGoals = goals.map(goalId => ({
          user_id: userId,
          goal_id: goalId,
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { data, error } = await client
          .from('user_goals')
          .insert(userGoals)
          .select();

        if (error) throw error;
        
        return data;
      }

      return [];
    } catch (error) {
      console.error('Error updating user goals:', error);
      throw error;
    }
  }

  /**
   * Complete a user goal
   */
  async completeUserGoal(userId, goalId) {
    try {
      console.log('✅ Completing user goal:', { userId, goalId });
      
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from('user_goals')
        .update({ 
          is_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('goal_id', goalId)
        .select();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error completing user goal:', error);
      throw error;
    }
  }

  /**
   * Get user learning statistics
   */
  async getUserStats(userId) {
    try {
      console.log('📊 Getting user statistics:', userId);
      
      // Get counts in parallel
      const [completedModulesCount, totalGoalsCount, completedGoalsCount] = await Promise.all([
        // Get completed modules from roadmap
        this.db.serviceClient
          .from('user_learning_paths')
          .select('path_data')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single()
          .then(({ data }) => {
            if (!data?.path_data) return 0;
            const pathData = data.path_data;
            
            // Count completed modules
            let completed = 0;
            if (pathData.modules) {
              completed = pathData.modules.filter(m => m.isCompleted).length;
            } else if (pathData.phases) {
              completed = pathData.phases.reduce((total, phase) => {
                return total + (phase.modules?.filter(m => m.isCompleted).length || 0);
              }, 0);
            }
            return completed;
          })
          .catch(() => 0),
        
        // Count total goals
        this.db.serviceClient
          .from('user_goals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .then(({ count }) => count || 0),
        
        // Count completed goals
        this.db.serviceClient
          .from('user_goals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_completed', true)
          .then(({ count }) => count || 0)
      ]);

      return {
        completedModules: completedModulesCount,
        totalGoals: totalGoalsCount,
        completedGoals: completedGoalsCount,
        goalCompletionRate: totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      throw error;
    }
  }

  /**
   * Search users by criteria (for admin purposes)
   */
  async searchUsers(criteria = {}, options = {}) {
    try {
      console.log('🔍 Searching users:', criteria);
      
      const searchCriteria = {};
      
      // Handle search by email
      if (criteria.email) {
        searchCriteria.email = criteria.email;
      }
      
      // Handle search by career stage
      if (criteria.career_stage) {
        searchCriteria.career_stage = criteria.career_stage;
      }
      
      // Handle search by employment status
      if (criteria.is_employed !== undefined) {
        searchCriteria.is_employed = criteria.is_employed;
      }

      const users = await this.findBy(searchCriteria, {
        limit: options.limit || 50,
        orderBy: options.orderBy || { column: 'created_at', ascending: false }
      });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get users by career stage
   */
  async getUsersByCareerStage(careerStage, limit = 10) {
    try {
      console.log('👥 Getting users by career stage:', careerStage);
      
      return await this.findBy(
        { career_stage: careerStage },
        { 
          limit,
          orderBy: { column: 'created_at', ascending: false }
        }
      );
    } catch (error) {
      console.error('Error getting users by career stage:', error);
      throw error;
    }
  }

  /**
   * Get recently active users
   */
  async getRecentlyActiveUsers(days = 7, limit = 20) {
    try {
      console.log(`📅 Getting users active in last ${days} days`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .gte('updated_at', cutoffDate.toISOString())
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting recently active users:', error);
      throw error;
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(userId) {
    try {
      const profile = await this.getProfile(userId);
      return profile?.onboarding_complete === true;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as complete
   */
  async completeOnboarding(userId) {
    try {
      console.log('✅ Marking onboarding complete for user:', userId);
      
      return await this.updateById(userId, {
        onboarding_complete: true
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  /**
   * Get user's learning preferences
   */
  async getLearningPreferences(userId) {
    try {
      const profile = await this.getProfile(userId);
      
      if (!profile) return null;
      
      return {
        weeklyLearningHours: profile.weekly_learning_hours || 5,
        preferredLearningTime: profile.preferred_learning_time || 'evening',
        careerStage: profile.career_stage || 'student',
        isEmployed: profile.is_employed === 'yes',
        userType: profile.user_type || 'mentee'
      };
    } catch (error) {
      console.error('Error getting learning preferences:', error);
      throw error;
    }
  }
}

export default UserRepository;