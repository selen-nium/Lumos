import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

class SupabaseService {
  constructor() {
    // Service role client (bypasses RLS)
    this.serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Regular client (respects RLS)
    this.client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  // ========================================
  // USER LEARNING PATHS OPERATIONS
  // ========================================

  /**
   * Get user's active learning path
   */
  async getUserLearningPath(userId) {
    try {
      console.log('📚 Fetching learning path for user:', userId);
      
      const { data, error } = await this.serviceClient
        .from('user_learning_paths')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user learning path:', error);
      throw new Error(`Failed to fetch learning path: ${error.message}`);
    }
  }

  /**
   * Create new learning path
   */
  async createLearningPath(pathData) {
    try {
      console.log('✨ Creating new learning path for user:', pathData.user_id);
      
      const { data, error } = await this.serviceClient
        .from('user_learning_paths')
        .insert({
          ...pathData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Learning path created successfully');
      return data;
    } catch (error) {
      console.error('Error creating learning path:', error);
      throw new Error(`Failed to create learning path: ${error.message}`);
    }
  }

  /**
   * Update existing learning path
   */
  async updateLearningPath(userId, updates) {
    try {
      console.log('📝 Updating learning path for user:', userId);
      
      const { data, error } = await this.serviceClient
        .from('user_learning_paths')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Learning path updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating learning path:', error);
      throw new Error(`Failed to update learning path: ${error.message}`);
    }
  }

  /**
   * Upsert learning path (create or update)
   */
  async upsertLearningPath(pathData) {
    try {
      // Check if path exists
      const existing = await this.getUserLearningPath(pathData.user_id);
      
      if (existing) {
        // Update existing
        return await this.updateLearningPath(pathData.user_id, {
          path_name: pathData.path_name,
          path_data: pathData.path_data
        });
      } else {
        // Create new
        return await this.createLearningPath(pathData);
      }
    } catch (error) {
      console.error('Error upserting learning path:', error);
      throw error;
    }
  }

  // ========================================
  // USER PROFILES OPERATIONS
  // ========================================

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    try {
      console.log('👤 Fetching profile for user:', userId);
      
      const { data, error } = await this.serviceClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updates) {
    try {
      console.log('📝 Updating profile for user:', userId);
      
      const { data, error } = await this.serviceClient
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Profile updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  // ========================================
  // USER SKILLS OPERATIONS
  // ========================================

  /**
   * Get user skills with skill details
   */
  async getUserSkills(userId) {
    try {
      console.log('🛠️ Fetching skills for user:', userId);
      
      const { data, error } = await this.serviceClient
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
        .eq('user_id', userId);

      if (error) throw error;

      // Transform the data to flatten the structure
      return data.map(item => ({
        skill_id: item.skill_id,
        skill_name: item.skills.skill_name,
        category: item.skills.category,
        proficiency_level: item.proficiency_level
      }));
    } catch (error) {
      console.error('Error fetching user skills:', error);
      throw new Error(`Failed to fetch user skills: ${error.message}`);
    }
  }

  /**
   * Upsert user skills
   */
  async upsertUserSkills(userId, skills) {
    try {
      console.log('💼 Upserting skills for user:', userId);
      
      const userSkills = skills.map(skillId => ({
        user_id: userId,
        skill_id: skillId,
        proficiency_level: 3 // Default proficiency
      }));

      const { data, error } = await this.serviceClient
        .from('user_skills')
        .upsert(userSkills, {
          onConflict: 'user_id,skill_id'
        });

      if (error) throw error;

      console.log('✅ Skills upserted successfully');
      return data;
    } catch (error) {
      console.error('Error upserting user skills:', error);
      throw new Error(`Failed to upsert skills: ${error.message}`);
    }
  }

  // ========================================
  // USER GOALS OPERATIONS
  // ========================================

  /**
   * Get user goals with goal details
   */
  async getUserGoals(userId) {
    try {
      console.log('🎯 Fetching goals for user:', userId);
      
      const { data, error } = await this.serviceClient
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
        .eq('is_completed', false);

      if (error) throw error;

      // Transform the data to flatten the structure
      return data.map(item => ({
        goal_id: item.goal_id,
        goal_title: item.goals.goal_title,
        goal_description: item.goals.goal_description,
        is_completed: item.is_completed
      }));
    } catch (error) {
      console.error('Error fetching user goals:', error);
      throw new Error(`Failed to fetch user goals: ${error.message}`);
    }
  }

  /**
   * Upsert user goals
   */
  async upsertUserGoals(userId, goals) {
    try {
      console.log('🎯 Upserting goals for user:', userId);
      
      const userGoals = goals.map(goalId => ({
        user_id: userId,
        goal_id: goalId,
        is_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await this.serviceClient
        .from('user_goals')
        .upsert(userGoals, {
          onConflict: 'user_id,goal_id'
        });

      if (error) throw error;

      console.log('✅ Goals upserted successfully');
      return data;
    } catch (error) {
      console.error('Error upserting user goals:', error);
      throw new Error(`Failed to upsert goals: ${error.message}`);
    }
  }

  // ========================================
  // CONTENT OPERATIONS (Skills, Goals reference data)
  // ========================================

  /**
   * Get all available skills
   */
  async getAllSkills() {
    try {
      console.log('📋 Fetching all skills');
      
      const { data, error } = await this.serviceClient
        .from('skills')
        .select('*')
        .order('category, skill_name');

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching skills:', error);
      throw new Error(`Failed to fetch skills: ${error.message}`);
    }
  }

  /**
   * Get all available goals
   */
  async getAllGoals() {
    try {
      console.log('🎯 Fetching all goals');
      
      const { data, error } = await this.serviceClient
        .from('goals')
        .select('*')
        .order('goal_id');

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching goals:', error);
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }
  }

  // ========================================
  // LEARNING CONTENT OPERATIONS
  // ========================================

  /**
   * Get learning modules
   */
  async getLearningModules(filters = {}) {
    try {
      console.log('📚 Fetching learning modules with filters:', filters);
      
      let query = this.serviceClient
        .from('learning_modules')
        .select('*');

      // Apply filters
      if (filters.skillId) {
        query = query.eq('skill_id', filters.skillId);
      }
      
      if (filters.difficulty) {
        query = query.eq('difficulty_level', filters.difficulty);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching learning modules:', error);
      throw new Error(`Failed to fetch learning modules: ${error.message}`);
    }
  }

  /**
   * Get learning resources
   */
  async getLearningResources(filters = {}) {
    try {
      console.log('📖 Fetching learning resources with filters:', filters);
      
      let query = this.serviceClient
        .from('learning_resources')
        .select('*');

      // Apply filters
      if (filters.skillId) {
        query = query.eq('skill_id', filters.skillId);
      }
      
      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching learning resources:', error);
      throw new Error(`Failed to fetch learning resources: ${error.message}`);
    }
  }

  // ========================================
  // HEALTH CHECK AND UTILITY METHODS
  // ========================================

  /**
   * Check database connection health
   */
  async healthCheck() {
    try {
      const { data, error } = await this.serviceClient
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) throw error;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connection: 'active'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        connection: 'failed'
      };
    }
  }

  /**
   * Execute custom query (for complex operations)
   */
  async executeCustomQuery(table, operation, params = {}) {
    try {
      console.log(`🔍 Executing custom query on ${table}:`, operation);
      
      let query = this.serviceClient.from(table);
      
      switch (operation) {
        case 'select':
          query = query.select(params.select || '*');
          break;
        case 'insert':
          query = query.insert(params.data);
          break;
        case 'update':
          query = query.update(params.data);
          break;
        case 'delete':
          query = query.delete();
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      // Apply filters
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      if (params.orderBy) {
        query = query.order(params.orderBy.column, { ascending: params.orderBy.ascending });
      }

      // Apply limit
      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error executing custom query:', error);
      throw new Error(`Custom query failed: ${error.message}`);
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const [usersCount, pathsCount, skillsCount, goalsCount] = await Promise.all([
        this.serviceClient.from('profiles').select('id', { count: 'exact', head: true }),
        this.serviceClient.from('user_learning_paths').select('id', { count: 'exact', head: true }),
        this.serviceClient.from('skills').select('id', { count: 'exact', head: true }),
        this.serviceClient.from('goals').select('id', { count: 'exact', head: true })
      ]);

      return {
        users: usersCount.count,
        learningPaths: pathsCount.count,
        skills: skillsCount.count,
        goals: goalsCount.count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching database stats:', error);
      throw new Error(`Failed to fetch database stats: ${error.message}`);
    }
  }

  // ========================================
  // TRANSACTION HELPER
  // ========================================

  /**
   * Execute multiple operations in a transaction-like manner
   */
  async executeInTransaction(operations) {
    const results = [];
    const errors = [];

    try {
      for (const operation of operations) {
        try {
          const result = await operation();
          results.push(result);
        } catch (error) {
          errors.push(error);
          // Stop on first error
          break;
        }
      }

      if (errors.length > 0) {
        throw new Error(`Transaction failed: ${errors[0].message}`);
      }

      return results;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }
}

export default new SupabaseService();