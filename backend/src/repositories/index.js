import dataService from '../services/data/dataService.js';

class UserRepositoryCompat {
  constructor() {
    this.dataService = dataService;
  }

  async getProfile(userId) {
    return await this.dataService.getProfile(userId);
  }

  async updateProfile(userId, updates) {
    return await this.dataService.updateProfile(userId, updates);
  }

  async getUserSkills(userId) {
    return await this.dataService.getUserSkills(userId);
  }

  async updateUserSkills(userId, skillIds) {
    return await this.dataService.updateUserSkills(userId, skillIds);
  }

  async getUserGoals(userId) {
    return await this.dataService.getUserGoals(userId);
  }

  async updateUserGoals(userId, goalIds) {
    return await this.dataService.updateUserGoals(userId, goalIds);
  }

  async exists(criteria) {
    return await this.dataService.exists(criteria);
  }

  async healthCheck() {
    return await this.dataService.healthCheck();
  }

  async getUserStats(userId) {
    return await this.dataService.getUserStats(userId);
  }

  async hasCompletedOnboarding(userId) {
    try {
      const profile = await this.dataService.getProfile(userId);
      return profile?.onboarding_complete === true;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  async completeOnboarding(userId) {
    try {
      console.log('✅ Marking onboarding complete for user:', userId);
      return await this.dataService.updateProfile(userId, {
        onboarding_complete: true
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  async getLearningPreferences(userId) {
    try {
      const profile = await this.dataService.getProfile(userId);
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

  // Additional methods that might be used by services
  async getProfileByEmail(email) {
    try {
      console.log('👤 Getting user profile by email:', email);
      
      const client = this.dataService.db.serviceClient;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error getting user profile by email:', error);
      throw error;
    }
  }

  async upsertProfile(userId, profileData) {
    try {
      console.log('🔄 Upserting user profile:', userId);
      
      const dataWithId = { ...profileData, id: userId };
      
      const client = this.dataService.db.serviceClient;
      const { data, error } = await client
        .from('profiles')
        .upsert(dataWithId, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error upserting user profile:', error);
      throw error;
    }
  }

  async completeUserGoal(userId, goalId) {
    try {
      console.log('✅ Completing user goal:', { userId, goalId });
      
      const client = this.dataService.db.serviceClient;
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

  // Add any other methods your services currently use
  get db() {
    return this.dataService.db;
  }
}

class RoadmapRepositoryCompat {
  constructor() {
    this.dataService = dataService;
  }

  async findActiveByUserId(userId) {
    return await this.dataService.findActiveByUserId(userId);
  }

  async createLearningPath(userId, roadmapData) {
    return await this.dataService.createLearningPath(userId, roadmapData);
  }

  async updateModuleCompletion(userId, moduleId, isCompleted) {
    return await this.dataService.updateModuleCompletion(userId, moduleId, isCompleted);
  }

  async getRoadmapStats(userId) {
    return await this.dataService.getRoadmapStats(userId);
  }

  async healthCheck() {
    return await this.dataService.healthCheck();
  }

  // Compatibility methods for existing service calls
  async updateUserRoadmap(userId, modifiedRoadmap) {
    return await this.dataService.updateUserRoadmap(userId, modifiedRoadmap);
  }

  async getModificationHistory(userId) {
    return await this.dataService.getModificationHistory(userId);
  }

  async backupCurrentRoadmap(userId) {
    return await this.dataService.backupCurrentRoadmap(userId);
  }

  async restoreFromBackup(userId, backupId) {
    return await this.dataService.restoreFromBackup(userId, backupId);
  }

  // Additional methods for full compatibility
  async createModule(moduleData) {
    return await this.dataService.createModule(moduleData);
  }

  async linkModuleToPath(userId, userPathId, moduleId, sequenceOrder) {
    return await this.dataService.linkModuleToPath(userId, userPathId, moduleId, sequenceOrder);
  }

  async getModuleResources(userId, moduleId) {
    return await this.dataService.getModuleResources(userId, moduleId);
  }

  async getModuleTasks(userId, moduleId) {
    return await this.dataService.getModuleTasks(userId, moduleId);
  }

  async processModuleResources(moduleId, resourcesData) {
    return await this.dataService.processModuleResources(moduleId, resourcesData);
  }

  async processModuleTasks(moduleId, tasksData) {
    return await this.dataService.processModuleTasks(moduleId, tasksData);
  }

  async createOrFindResource(resourceData) {
    return await this.dataService.createOrFindResource(resourceData);
  }

  async createOrFindTask(taskData) {
    return await this.dataService.createOrFindTask(taskData);
  }

  async count(criteria = {}) {
    return await this.dataService.count('user_learning_paths', criteria);
  }

  get db() {
    return this.dataService.db;
  }
}

class ContentRepositoryCompat {
  constructor() {
    this.dataService = dataService;
  }

  async getAllSkills() {
    return await this.dataService.getAllSkills();
  }

  async getAllGoals() {
    return await this.dataService.getAllGoals();
  }

  async healthCheck() {
    return await this.dataService.healthCheck();
  }

  // Add any other methods your services currently use
  async getRecommendations(userId, type = 'all', limit = 5) {
    return await this.dataService.getRecommendations(userId, type, limit);
  }

  async getUserStats(userId) {
    return await this.dataService.getUserStats(userId);
  }

  // Additional content methods that might be used
  async searchModules(searchTerm, options = {}) {
    try {
      console.log('🔍 Searching modules:', searchTerm);
      
      const client = this.dataService.db.serviceClient;
      let query = client
        .from('learning_modules')
        .select('*')
        .or(`module_name.ilike.%${searchTerm}%,module_description.ilike.%${searchTerm}%`)
        .order('usage_count', { ascending: false });

      if (options.difficulty) {
        query = query.eq('difficulty', options.difficulty);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error searching modules:', error);
      throw error;
    }
  }

  async searchResources(searchTerm, options = {}) {
    try {
      console.log('🔍 Searching resources:', searchTerm);
      
      const client = this.dataService.db.serviceClient;
      let query = client
        .from('learning_resources')
        .select('*')
        .or(`resource_title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('usage_count', { ascending: false });

      if (options.resourceType) {
        query = query.eq('resource_type', options.resourceType);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error searching resources:', error);
      throw error;
    }
  }

  async getRecommendations(userId, type = 'all', limit = 5) {
    return await this.dataService.getRecommendations(userId, type, limit);
  }

  async getUserStats(userId) {
    return await this.dataService.getUserStats(userId);
  }

  // Additional content methods that might be used
  async searchModules(searchTerm, options = {}) {
    return await this.dataService.searchModules(searchTerm, options);
  }

  async searchResources(searchTerm, options = {}) {
    return await this.dataService.searchResources(searchTerm, options);
  }

  async searchTasks(searchTerm, options = {}) {
    return await this.dataService.searchTasks(searchTerm, options);
  }

  async getModuleById(moduleId) {
    return await this.dataService.getModuleById(moduleId);
  }

  async getPopularModules(limit = 10) {
    return await this.dataService.getPopularModules(limit);
  }

  async getPopularResources(limit = 20) {
    return await this.dataService.getPopularResources(limit);
  }

  async getContentStats() {
    return await this.dataService.getContentStats();
  }

  async getLearningAnalytics() {
    return await this.dataService.getLearningAnalytics();
  }

  async searchTemplates(userGoals, userSkills, options = {}) {
    return await this.dataService.searchTemplates(userGoals, userSkills, options);
  }

  async getTemplateById(templateId) {
    return await this.dataService.getTemplateById(templateId);
  }

  async vectorSearch(query, contentType = 'modules', options = {}) {
    return await this.dataService.vectorSearch(query, contentType, options);
  }

  get db() {
    return this.dataService.db;
  }
}

// Create repository instances with compatibility layer
const userRepository = new UserRepositoryCompat();
const roadmapRepository = new RoadmapRepositoryCompat();
const contentRepository = new ContentRepositoryCompat();

// Export individual repositories (maintains existing interface)
export {
  userRepository,
  roadmapRepository,
  contentRepository
};

// Export repository factory (maintains existing interface)
export class RepositoryFactory {
  static getUserRepository() {
    return userRepository;
  }

  static getRoadmapRepository() {
    return roadmapRepository;
  }

  static getContentRepository() {
    return contentRepository;
  }

  static getAllRepositories() {
    return {
      userRepository,
      roadmapRepository,
      contentRepository
    };
  }

  // Health check for all repositories
  static async healthCheck() {
    try {
      const health = await dataService.healthCheck();
      
      return {
        status: health.status,
        repositories: [
          { name: 'UserRepository', status: health.status },
          { name: 'RoadmapRepository', status: health.status },
          { name: 'ContentRepository', status: health.status }
        ],
        timestamp: health.timestamp
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

export default {
  userRepository,
  roadmapRepository,
  contentRepository,
  RepositoryFactory
};