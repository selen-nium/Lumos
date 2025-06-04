import BaseRepository from './base/baseRepository.js';

class ContentRepository extends BaseRepository {
  constructor() {
    super('learning_modules', 'module_id'); // Default to modules table
  }

  // ========================================
  // MODULES OPERATIONS
  // ========================================

  /**
   * Search for existing modules by name or description
   */
  async searchModules(searchTerm, options = {}) {
    try {
      console.log('🔍 Searching modules:', searchTerm);
      
      const client = this.db.serviceClient;
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

  /**
   * Get module by ID with full details
   */
  async getModuleById(moduleId) {
    try {
      console.log('📖 Getting module by ID:', moduleId);
      
      const client = this.db.serviceClient;
      
      // Get module
      const { data: module, error: moduleError } = await client
        .from('learning_modules')
        .select('*')
        .eq('module_id', moduleId)
        .single();

      if (moduleError) throw moduleError;
      if (!module) return null;

      // Get resources for this module
      const { data: resources, error: resourcesError } = await client
        .from('module_resources')
        .select(`
          sequence_order,
          is_required,
          learning_resources (*)
        `)
        .eq('module_id', moduleId)
        .order('sequence_order');

      if (resourcesError) throw resourcesError;

      // Get tasks for this module
      const { data: tasks, error: tasksError } = await client
        .from('module_tasks')
        .select(`
          sequence_order,
          is_required,
          hands_on_tasks (*)
        `)
        .eq('module_id', moduleId)
        .order('sequence_order');

      if (tasksError) throw tasksError;

      return {
        ...module,
        resources: (resources || []).map(r => ({
          ...r.learning_resources,
          sequence_order: r.sequence_order,
          is_required: r.is_required
        })),
        tasks: (tasks || []).map(t => ({
          ...t.hands_on_tasks,
          sequence_order: t.sequence_order,
          is_required: t.is_required
        }))
      };
    } catch (error) {
      console.error('Error getting module by ID:', error);
      throw error;
    }
  }

  /**
   * Get popular modules
   */
  async getPopularModules(limit = 10) {
    try {
      console.log('🔥 Getting popular modules');
      
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from('learning_modules')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting popular modules:', error);
      throw error;
    }
  }

  // ========================================
  // RESOURCES OPERATIONS
  // ========================================

  /**
   * Search for existing resources
   */
  async searchResources(searchTerm, options = {}) {
    try {
      console.log('🔍 Searching resources:', searchTerm);
      
      const client = this.db.serviceClient;
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

  /**
   * Get popular resources
   */
  async getPopularResources(limit = 20) {
    try {
      console.log('📖 Getting popular resources');
      
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from('learning_resources')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting popular resources:', error);
      throw error;
    }
  }

  // ========================================
  // TASKS OPERATIONS
  // ========================================

  /**
   * Search for existing tasks
   */
  async searchTasks(searchTerm, options = {}) {
    try {
      console.log('🔍 Searching tasks:', searchTerm);
      
      const client = this.db.serviceClient;
      let query = client
        .from('hands_on_tasks')
        .select('*')
        .or(`task_title.ilike.%${searchTerm}%,task_description.ilike.%${searchTerm}%`)
        .order('usage_count', { ascending: false });

      if (options.taskType) {
        query = query.eq('task_type', options.taskType);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw error;
    }
  }

  // ========================================
  // LEARNING PATH TEMPLATES
  // ========================================

  /**
   * Search for similar learning path templates
   */
  async searchTemplates(userGoals, userSkills, options = {}) {
    try {
      console.log('🔍 Searching templates for goals/skills:', { userGoals, userSkills });
      
      const client = this.db.serviceClient;
      let query = client
        .from('learning_path_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false });

      // Filter by difficulty if specified
      if (options.maxDifficulty) {
        query = query.lte('difficulty_level', options.maxDifficulty);
      }

      // Filter by duration if specified
      if (options.maxDurationWeeks) {
        query = query.lte('estimated_duration_weeks', options.maxDurationWeeks);
      }

      if (options.limit) {
        query = query.limit(options.limit || 10);
      }

      const { data, error } = await query;
      if (error) throw error;

      // For now, return all templates. Later we'll add vector similarity search
      return data || [];
    } catch (error) {
      console.error('Error searching templates:', error);
      throw error;
    }
  }

  /**
   * Get template with full module structure
   */
  async getTemplateById(templateId) {
    try {
      console.log('📋 Getting template by ID:', templateId);
      
      const client = this.db.serviceClient;
      
      // Get template
      const { data: template, error: templateError } = await client
        .from('learning_path_templates')
        .select('*')
        .eq('template_id', templateId)
        .single();

      if (templateError) throw templateError;
      if (!template) return null;

      // Get modules for this template
      const { data: templateModules, error: modulesError } = await client
        .from('template_modules')
        .select(`
          sequence_order,
          is_required,
          learning_modules (*)
        `)
        .eq('template_id', templateId)
        .order('sequence_order');

      if (modulesError) throw modulesError;

      // For each module, get its resources and tasks
      const modules = await Promise.all(
        (templateModules || []).map(async (tm) => {
          const module = tm.learning_modules;
          const fullModule = await this.getModuleById(module.module_id);
          
          return {
            ...fullModule,
            sequence_order: tm.sequence_order,
            is_required: tm.is_required
          };
        })
      );

      return {
        ...template,
        modules
      };
    } catch (error) {
      console.error('Error getting template by ID:', error);
      throw error;
    }
  }

  // ========================================
  // SKILLS AND GOALS (Reference Data)
  // ========================================

  /**
   * Get all available skills
   */
  async getAllSkills() {
    try {
      console.log('📋 Getting all skills');
      
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from('skills')
        .select('*')
        .order('category, skill_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching skills:', error);
      throw error;
    }
  }

  /**
   * Get all available goals
   */
  async getAllGoals() {
    try {
      console.log('🎯 Fetching all goals');
      
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from('goals')
        .select('*')
        .order('goal_id');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }
  }

  // ========================================
  // ANALYTICS AND STATISTICS
  // ========================================

  /**
   * Get content statistics
   */
  async getContentStats() {
    try {
      console.log('📊 Getting content statistics');
      
      const client = this.db.serviceClient;
      
      const [modulesCount, resourcesCount, tasksCount, templatesCount] = await Promise.all([
        client.from('learning_modules').select('*', { count: 'exact', head: true }),
        client.from('learning_resources').select('*', { count: 'exact', head: true }),
        client.from('hands_on_tasks').select('*', { count: 'exact', head: true }),
        client.from('learning_path_templates').select('*', { count: 'exact', head: true })
      ]);

      return {
        modules: modulesCount.count || 0,
        resources: resourcesCount.count || 0,
        tasks: tasksCount.count || 0,
        templates: templatesCount.count || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting content statistics:', error);
      throw error;
    }
  }

  /**
   * Get learning analytics
   */
  async getLearningAnalytics() {
    try {
      console.log('📈 Getting learning analytics');
      
      const client = this.db.serviceClient;
      
      // Get most popular content
      const [popularModules, popularResources, popularTemplates] = await Promise.all([
        this.getPopularModules(5),
        this.getPopularResources(10),
        client.from('learning_path_templates')
          .select('template_name, usage_count')
          .order('usage_count', { ascending: false })
          .limit(5)
          .then(({ data }) => data || [])
      ]);

      return {
        popularModules,
        popularResources,
        popularTemplates,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting learning analytics:', error);
      throw error;
    }
  }

  // ========================================
  // CONTENT RECOMMENDATIONS
  // ========================================

  /**
   * Get recommendations for a user
   */
  async getRecommendations(userId, type = 'all', limit = 5) {
    try {
      console.log('💡 Getting content recommendations:', { userId, type, limit });
      
      // For now, return popular content. Later we'll implement personalized recommendations
      const recommendations = {};

      if (type === 'all' || type === 'modules') {
        recommendations.modules = await this.getPopularModules(limit);
      }
      
      if (type === 'all' || type === 'resources') {
        recommendations.resources = await this.getPopularResources(limit);
      }
      
      if (type === 'all' || type === 'templates') {
        const client = this.db.serviceClient;
        const { data } = await client
          .from('learning_path_templates')
          .select('*')
          .eq('is_public', true)
          .order('usage_count', { ascending: false })
          .limit(limit);
        
        recommendations.templates = data || [];
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  }

  // ========================================
  // VECTOR SEARCH (Placeholder for future implementation)
  // ========================================

  /**
   * Search content using vector similarity (to be implemented with embeddings)
   */
  async vectorSearch(query, contentType = 'modules', options = {}) {
    console.log('🔮 Vector search not yet implemented, falling back to text search');
    
    switch (contentType) {
      case 'modules':
        return await this.searchModules(query, options);
      case 'resources':
        return await this.searchResources(query, options);
      case 'tasks':
        return await this.searchTasks(query, options);
      default:
        return [];
    }
  }
}

export default ContentRepository;