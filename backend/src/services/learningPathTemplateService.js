import embeddingService from './embeddingService.js';
import supabaseService from './core/supabaseService.js';

class LearningPathTemplateService {
  constructor() {
    this.db = supabaseService;
    this.similarityThreshold = 0.7; // Adjust base on testing
  }

  /**
   * Create user profile text for embedding generation
   */
  createUserProfileText(userContext) {
    const parts = [
      `Learning goals: ${userContext.goalsText}`,
      `Current skills: ${userContext.skillsText}`,
      `Experience level: ${userContext.experienceLevel}`,
      `Career stage: ${userContext.profile?.career_stage || 'student'}`,
      `Weekly time available: ${userContext.timeAvailable} hours`,
      `Focus areas: ${userContext.goalsText}` // Duplicate for emphasis
    ];
    
    return parts.join('. ');
  }

  /**
   * Search for similar learning path templates
   */
  async findSimilarTemplates(userContext, limit = 3) {
    try {
      console.log('🔍 Searching for similar learning path templates...');
      
      // Create user profile text and generate embedding
      const userProfileText = this.createUserProfileText(userContext);
      console.log('📝 User profile text:', userProfileText);
      
      const userEmbedding = await embeddingService.textToEmbedding(userProfileText);
      console.log('🔢 Generated user embedding, dimensions:', userEmbedding.length);

      // Convert embedding to string for PostgreSQL
      const embeddingStr = '[' + userEmbedding.join(',') + ']';

      // Search for similar templates using cosine similarity
      const { data: similarTemplates, error } = await this.db.serviceClient
        .rpc('find_similar_learning_paths', {
          query_embedding: embeddingStr,
          similarity_threshold: this.similarityThreshold,
          match_limit: limit
        });

      if (error) {
        console.error('❌ Error searching templates:', error);
        return [];
      }

      console.log(`✅ Found ${similarTemplates?.length || 0} similar templates`);
      
      // Log similarity scores for debugging
      if (similarTemplates && similarTemplates.length > 0) {
        similarTemplates.forEach((template, i) => {
          console.log(`📊 Template ${i + 1}: "${template.template_name}" - similarity: ${template.similarity?.toFixed(3)}`);
        });
      }

      return similarTemplates || [];
    } catch (error) {
      console.error('❌ Error finding similar templates:', error);
      return [];
    }
  }

  /**
   * Save a roadmap as a reusable template
   */
  async saveAsTemplate(roadmapData, userContext, originalUserEmbedding = null) {
    try {
      console.log('💾 Saving roadmap as template...');

      // Generate embedding for the roadmap if not provided
      let pathEmbedding = originalUserEmbedding;
      if (!pathEmbedding) {
        const templateText = this.createTemplateText(roadmapData, userContext);
        pathEmbedding = await embeddingService.textToEmbedding(templateText);
      }

      // Extract key information for template metadata
      const targetSkills = this.extractTargetSkills(roadmapData);
      const targetGoals = this.extractTargetGoals(roadmapData, userContext);
      
      const templateData = {
        template_name: roadmapData.roadmap_title || 'Custom Learning Path',
        template_description: roadmapData.description || 'AI-generated learning path',
        difficulty_level: roadmapData.overall_difficulty || 'beginner',
        estimated_duration_weeks: roadmapData.estimated_completion_weeks || 12,
        target_skills: targetSkills,
        target_goals: targetGoals,
        usage_count: 1,
        path_embedding: '[' + pathEmbedding.join(',') + ']',
        path_data: roadmapData // Store complete roadmap structure
      };

      const { data: template, error } = await this.db.serviceClient
        .from('learning_path_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Template saved successfully:', template.template_id);
      return template;
    } catch (error) {
      console.error('❌ Error saving template:', error);
      return null;
    }
  }

  /**
   * Customize an existing template for a specific user
   */
  async customizeTemplate(template, userContext) {
    try {
      console.log('🔧 Customizing template for user:', template.template_name);

      // Get the base roadmap structure
      const baseRoadmap = template.path_data;
      
      // Create a customized copy
      const customizedRoadmap = {
        ...baseRoadmap,
        roadmap_title: `${baseRoadmap.roadmap_title} - Customized`,
        generationMethod: 'template_customization',
        baseTemplate: {
          template_id: template.template_id,
          template_name: template.template_name,
          similarity_score: template.similarity
        },
        userContext: {
          skills: userContext.skillsText,
          goals: userContext.goalsText,
          experienceLevel: userContext.experienceLevel
        }
      };

      // Apply user-specific customizations
      if (baseRoadmap.modules && Array.isArray(baseRoadmap.modules)) {
        customizedRoadmap.modules = this.customizeModules(
          baseRoadmap.modules, 
          userContext
        );
      }

      // Update template usage count
      await this.incrementUsageCount(template.template_id);

      console.log('✅ Template customized successfully');
      return customizedRoadmap;
    } catch (error) {
      console.error('❌ Error customizing template:', error);
      throw error;
    }
  }

  /**
   * Get popular templates for bootstrapping
   */
  async getPopularTemplates(limit = 10) {
    try {
      const { data: templates, error } = await this.db.serviceClient
        .from('learning_path_templates')
        .select('template_id, template_name, template_description, difficulty_level, estimated_duration_weeks, target_skills, target_goals, usage_count')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return templates || [];
    } catch (error) {
      console.error('Error fetching popular templates:', error);
      return [];
    }
  }

  /**
   * Seed initial templates from successful roadmaps
   */
  async seedInitialTemplates() {
    try {
      console.log('🌱 Seeding initial learning path templates...');

      // Check if we already have templates
      const { count } = await this.db.serviceClient
        .from('learning_path_templates')
        .select('template_id', { count: 'exact', head: true });

      if (count > 0) {
        console.log(`📊 ${count} templates already exist, skipping seed`);
        return;
      }

      // Create some initial templates based on common learning paths
      const initialTemplates = this.getInitialTemplates();

      for (const template of initialTemplates) {
        await this.saveAsTemplate(
          template.roadmapData,
          template.userContext
        );
      }

      console.log(`✅ Seeded ${initialTemplates.length} initial templates`);
    } catch (error) {
      console.error('❌ Error seeding templates:', error);
    }
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Create text representation of template for embedding
   */
  createTemplateText(roadmapData, userContext) {
    const parts = [
      `Learning path: ${roadmapData.roadmap_title}`,
      `Description: ${roadmapData.description}`,
      `Difficulty: ${roadmapData.overall_difficulty}`,
      `Duration: ${roadmapData.estimated_completion_weeks} weeks`,
      `Target goals: ${userContext?.goalsText || 'General web development'}`,
      `Skills taught: ${this.extractTargetSkills(roadmapData).join(', ')}`
    ];

    // Add module information
    if (roadmapData.modules && Array.isArray(roadmapData.modules)) {
      const moduleNames = roadmapData.modules.map(m => m.module_name || m.name).join(', ');
      parts.push(`Modules: ${moduleNames}`);
    }

    return parts.join('. ');
  }

  /**
   * Extract target skills from roadmap
   */
  extractTargetSkills(roadmapData) {
    const skills = new Set();
    
    if (roadmapData.modules && Array.isArray(roadmapData.modules)) {
      roadmapData.modules.forEach(module => {
        if (module.skills_covered && Array.isArray(module.skills_covered)) {
          module.skills_covered.forEach(skill => skills.add(skill));
        }
      });
    }

    return Array.from(skills);
  }

  /**
   * Extract target goals from roadmap and user context
   */
  extractTargetGoals(roadmapData, userContext) {
    const goals = [];
    
    // Add goals from user context
    if (userContext?.goals && Array.isArray(userContext.goals)) {
      userContext.goals.forEach(goal => {
        goals.push(goal.goal_title || goal.title || goal);
      });
    }

    // Add inferred goals from roadmap title/description
    const title = (roadmapData.roadmap_title || '').toLowerCase();
    if (title.includes('full stack')) goals.push('Full Stack Development');
    if (title.includes('frontend')) goals.push('Frontend Development');
    if (title.includes('backend')) goals.push('Backend Development');
    if (title.includes('data science')) goals.push('Data Science');
    if (title.includes('mobile')) goals.push('Mobile Development');

    return [...new Set(goals)]; // Remove duplicates
  }

  /**
   * Customize modules based on user context
   */
  customizeModules(modules, userContext) {
    const userSkills = userContext.skills?.map(s => s.skill_name?.toLowerCase()) || [];
    
    return modules.map(module => {
      // Skip modules for skills the user already knows well
      const moduleSkills = (module.skills_covered || []).map(s => s.toLowerCase());
      const hasSkillOverlap = moduleSkills.some(skill => userSkills.includes(skill));
      
      if (hasSkillOverlap && userContext.experienceLevel !== 'beginner') {
        return {
          ...module,
          difficulty: 'beginner', // Make it easier since they have some knowledge
          estimated_hours: Math.max(1, (module.estimated_hours || 3) - 1) // Reduce time
        };
      }

      // Adjust difficulty based on user experience
      if (userContext.experienceLevel === 'advanced' && module.difficulty === 'beginner') {
        return {
          ...module,
          difficulty: 'intermediate'
        };
      }

      return module;
    });
  }

  /**
   * Increment usage count for a template
   */
    async incrementUsageCount(templateId) {
        try {
            await this.db.serviceClient
            .from('learning_path_templates')
            .update({ usage_count: this.db.serviceClient.literal('usage_count + 1') })
            .eq('template_id', templateId);
        } catch (error) {
            // Silently fail - not critical
            console.debug('Could not increment usage count:', error.message);
        }
    }

  /**
   * Get initial templates for seeding
   */
  getInitialTemplates() {
    return [
      {
        userContext: {
          goalsText: 'Frontend Development, React, JavaScript',
          skillsText: 'HTML, CSS',
          experienceLevel: 'beginner'
        },
        roadmapData: {
          roadmap_title: 'Frontend Developer Path',
          description: 'Complete frontend development learning path',
          overall_difficulty: 'beginner',
          estimated_completion_weeks: 16,
          modules: [
            {
              module_name: 'JavaScript Fundamentals',
              module_description: 'Learn JavaScript basics',
              difficulty: 'beginner',
              estimated_hours: 8,
              skills_covered: ['JavaScript', 'ES6', 'DOM']
            },
            {
              module_name: 'React Basics',
              module_description: 'Introduction to React',
              difficulty: 'intermediate',
              estimated_hours: 12,
              skills_covered: ['React', 'JSX', 'Components']
            }
          ]
        }
      },
      {
        userContext: {
          goalsText: 'Full Stack Development, Node.js, Databases',
          skillsText: 'JavaScript, HTML, CSS',
          experienceLevel: 'intermediate'
        },
        roadmapData: {
          roadmap_title: 'Full Stack Developer Path',
          description: 'Complete full stack development learning path',
          overall_difficulty: 'intermediate',
          estimated_completion_weeks: 20,
          modules: [
            {
              module_name: 'Node.js Backend',
              module_description: 'Server-side JavaScript',
              difficulty: 'intermediate',
              estimated_hours: 10,
              skills_covered: ['Node.js', 'Express', 'APIs']
            },
            {
              module_name: 'Database Design',
              module_description: 'SQL and database concepts',
              difficulty: 'intermediate',
              estimated_hours: 8,
              skills_covered: ['SQL', 'PostgreSQL', 'Database Design']
            }
          ]
        }
      }
    ];
  }

  /**
   * Health check for template service
   */
  async healthCheck() {
    try {
      const { count } = await this.db.serviceClient
        .from('learning_path_templates')
        .select('template_id', { count: 'exact', head: true });

      return {
        status: 'healthy',
        templatesCount: count,
        embeddingService: 'available',
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

export default new LearningPathTemplateService();