import sql from '../database/db.js';
import embeddingService from './embeddingService.js';
import { createClient } from '@supabase/supabase-js';

const supabaseServiceRole = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class RoadmapService {
  /**
   * Get user's active roadmap with properly structured data
   */
  async getUserRoadmap(userId) {
    try {
      // Fetch the user's active learning path
      const { data: learningPath, error } = await supabaseServiceRole
        .from('user_learning_paths')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error || !learningPath) {
        console.log('No active roadmap found for user:', userId);
        return null;
      }

      // Transform the stored path_data to match frontend expectations
      const transformedRoadmap = await this.transformRoadmapData(learningPath);
      
      return transformedRoadmap;
    } catch (error) {
      console.error('Error fetching user roadmap:', error);
      throw error;
    }
  }

  /**
   * Transform stored roadmap data to match frontend structure
   */
  async transformRoadmapData(learningPath) {
    const pathData = learningPath.path_data;
    
    // Handle both flat modules and phased structures
    let allModules = [];
    
    if (pathData.modules) {
      allModules = pathData.modules;
    } else if (pathData.phases) {
      // Flatten phases into modules
      allModules = pathData.phases.reduce((acc, phase) => {
        return acc.concat(phase.modules || []);
      }, []);
    }

    // Transform modules to match frontend expectations
    const transformedModules = await Promise.all(
      allModules.map(async (module, index) => {
        // Generate a consistent module ID
        const moduleId = module.module_id || module.id || `module_${index + 1}`;
        
        // Fetch or generate module data
        const moduleData = await this.enhanceModuleData(module, moduleId, index);
        
        return moduleData;
      })
    );

    // Create the roadmap structure expected by frontend
    const roadmap = {
      path_id: learningPath.user_path_id,
      path_title: pathData.title || pathData.roadmap_title || pathData.path_name || learningPath.path_name,
      path_description: pathData.description || learningPath.path_description,
      estimated_duration_weeks: pathData.estimated_duration_weeks || pathData.estimated_completion_weeks || 12,
      path_modules: transformedModules.map((module, index) => ({
        path_id: learningPath.user_path_id,
        module_id: module.module_id,
        sequence_order: index + 1,
        is_completed: module.is_completed || false,
        completion_date: module.completion_date || null,
        module: module
      })),
      generationMethod: pathData.generationMethod || 'custom',
      userContext: pathData.userContext
    };

    return roadmap;
  }

  /**
   * Enhance module data with proper structure
   */
  async enhanceModuleData(module, moduleId, index) {
    // Try to fetch from database first
    let dbModule = null;
    try {
      const result = await sql`
        SELECT * FROM learning_modules WHERE module_id = ${moduleId}
      `;
      if (result.length > 0) {
        dbModule = result[0];
      }
    } catch (error) {
      console.log('Module not found in DB, using generated data');
    }

    // Build the enhanced module structure
    const enhancedModule = {
      module_id: moduleId,
      module_name: module.module_name || module.title || module.name || `Module ${index + 1}`,
      module_description: module.module_description || module.description || this.generateDefaultDescription(module.module_name || module.title),
      difficulty_level: module.difficulty_level || module.difficulty || 'beginner',
      estimated_completion_hours: module.estimated_completion_hours || module.estimated_hours || 5,
      prerequisites: module.prerequisites || [],
      skills_covered: module.skills_covered || [],
      created_at: module.created_at || new Date().toISOString(),
      updated_at: module.updated_at || new Date().toISOString(),
      is_completed: module.is_completed || false,
      status: module.status || '⏳ Pending',
      
      // Add resources
      resources: await this.getModuleResources(module, moduleId),
      
      // Add tasks
      tasks: await this.getModuleTasks(module, moduleId)
    };

    return enhancedModule;
  }

    async getModuleResources(module, moduleId) {
        const moduleName = module.module_name || module.title || module.name || `Module ${moduleId}`;
        let resources = [];

        // First, check if module already has well-structured resources
        if (module.resources && Array.isArray(module.resources) && module.resources.length > 0) {
            console.log("📚 Using existing module resources");
            resources = module.resources.map((resource, index) => {
                if (typeof resource === 'string') {
                    return {
                        resource_id: `${moduleId}_resource_${index + 1}`,
                        resource_title: resource,
                        url: this.generateResourceUrl(resource),
                        resource_type: this.detectResourceType(resource),
                        estimated_time_minutes: 30,
                        sequence_order: index + 1
                    };
                }
                
                // Ensure proper field names for objects
                return {
                    resource_id: resource.resource_id || `${moduleId}_resource_${index + 1}`,
                    resource_title: resource.resource_title || resource.title || `${moduleName} Resource ${index + 1}`,
                    url: resource.url || this.generateResourceUrl(resource.resource_title || resource.title || moduleName),
                    resource_type: resource.resource_type || resource.type || this.detectResourceType(resource.resource_title || resource.title || ''),
                    estimated_time_minutes: resource.estimated_time_minutes || 30,
                    sequence_order: resource.sequence_order || index + 1
                };
            });
            
            if (resources.length > 0) {
                return resources;
            }
        }

        // Try vector search
        try {
            const resourceResults = await embeddingService.findSimilarResources(moduleName, {
                preferredTypes: ['interactive', 'tutorial', 'video'],
                limit: 5
            });

            console.log("📦 Vector search results for module:", moduleName, resourceResults);

            if (Array.isArray(resourceResults) && resourceResults.length > 0) {
                return resourceResults.map((resource, index) => ({
                    resource_id: resource.resource_id || `${moduleId}_resource_${index + 1}`,
                    resource_title: resource.resource_title || resource.title,
                    url: resource.url,
                    resource_type: resource.resource_type || 'article',
                    estimated_time_minutes: resource.estimated_time_minutes || 30,
                    sequence_order: index + 1
                }));
            }
        } catch (error) {
            console.error('❌ Error during vector resource search:', error);
        }

        // Generate meaningful default resources based on module name
        console.log("🔧 Generating default resources for:", moduleName);
        return this.generateDefaultResourcesForModule(moduleName, moduleId);
    }

    // hardcoded default resource
    generateDefaultResourcesForModule(moduleName, moduleId) {
        const cleanName = moduleName.toLowerCase();
        const resources = [];
        
        // Generate contextual resources based on module name
        if (cleanName.includes('react')) {
            resources.push(
                {
                    resource_id: `${moduleId}_resource_1`,
                    resource_title: 'React Official Documentation - Getting Started',
                    url: 'https://react.dev/learn',
                    resource_type: 'documentation',
                    estimated_time_minutes: 45,
                    sequence_order: 1
                },
                {
                    resource_id: `${moduleId}_resource_2`,
                    resource_title: 'FreeCodeCamp: React Course for Beginners',
                    url: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
                    resource_type: 'video',
                    estimated_time_minutes: 480,
                    sequence_order: 2
                },
                {
                    resource_id: `${moduleId}_resource_3`,
                    resource_title: 'React Tutorial: Build a Tic-Tac-Toe Game',
                    url: 'https://react.dev/learn/tutorial-tic-tac-toe',
                    resource_type: 'tutorial',
                    estimated_time_minutes: 90,
                    sequence_order: 3
                }
            );
        } else if (cleanName.includes('javascript') || cleanName.includes('js')) {
            resources.push(
                {
                    resource_id: `${moduleId}_resource_1`,
                    resource_title: 'MDN: JavaScript Guide',
                    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
                    resource_type: 'documentation',
                    estimated_time_minutes: 60,
                    sequence_order: 1
                },
                {
                    resource_id: `${moduleId}_resource_2`,
                    resource_title: 'JavaScript.info - The Modern JavaScript Tutorial',
                    url: 'https://javascript.info/',
                    resource_type: 'tutorial',
                    estimated_time_minutes: 120,
                    sequence_order: 2
                }
            );
        } else {
            // Generic but meaningful resources
            resources.push(
                {
                    resource_id: `${moduleId}_resource_1`,
                    resource_title: `${moduleName} - Comprehensive Guide`,
                    url: this.generateResourceUrl(`${moduleName} comprehensive guide`),
                    resource_type: 'article',
                    estimated_time_minutes: 45,
                    sequence_order: 1
                },
                {
                    resource_id: `${moduleId}_resource_2`,
                    resource_title: `${moduleName} - Video Tutorial Series`,
                    url: this.generateResourceUrl(`${moduleName} video tutorial`),
                    resource_type: 'video',
                    estimated_time_minutes: 60,
                    sequence_order: 2
                },
                {
                    resource_id: `${moduleId}_resource_3`,
                    resource_title: `${moduleName} - Hands-on Practice`,
                    url: this.generateResourceUrl(`${moduleName} exercises`),
                    resource_type: 'interactive',
                    estimated_time_minutes: 30,
                    sequence_order: 3
                }
            );
        }
        
        return resources;
    }

    async getModuleTasks(module, moduleId) {
        const moduleName = module.module_name || module.title || module.name || `Module ${moduleId}`;
        let tasks = [];

        // Check if module already has tasks
        if (module.tasks && Array.isArray(module.tasks) && module.tasks.length > 0) {
            console.log("📋 Using existing module tasks");
            return module.tasks.map((task, index) => ({
                task_id: task.task_id || `${moduleId}_task_${index + 1}`,
                task_title: task.task_title || task.title || `Task ${index + 1}`,
                task_description: task.task_description || task.description || `Complete this hands-on task for ${moduleName}`,
                task_type: task.task_type || task.type || 'practice',
                estimated_time_minutes: task.estimated_time_minutes || 45,
                sequence_order: task.sequence_order || index + 1,
                is_completed: task.is_completed || false
            }));
        }

        // Try vector search
        try {
            const taskResults = await embeddingService.findSimilarTasks(moduleName, {
                limit: 3
            });

            console.log("📦 Vector search tasks for module:", moduleName, taskResults);

            if (Array.isArray(taskResults) && taskResults.length > 0) {
                return taskResults.map((task, index) => ({
                    task_id: task.task_id || `${moduleId}_task_${index + 1}`,
                    task_title: task.task_title || task.title,
                    task_description: task.task_description || task.description,
                    task_type: task.task_type || 'practice',
                    estimated_time_minutes: task.estimated_time_minutes || 45,
                    sequence_order: index + 1,
                    is_completed: false
                }));
            }
        } catch (error) {
            console.error('❌ Error during vector task search:', error);
        }

        // Generate meaningful default tasks
        console.log("🔧 Generating default tasks for:", moduleName);
        return this.generateDefaultTasksForModule(moduleName, moduleId);
    }

    // hardcoded default task
    generateDefaultTasksForModule(moduleName, moduleId) {
        const cleanName = moduleName.toLowerCase();
        const tasks = [];
        
        if (cleanName.includes('react')) {
            tasks.push(
                {
                    task_id: `${moduleId}_task_1`,
                    task_title: 'Build a Counter Component',
                    task_description: 'Create a React component that displays a counter with increment and decrement buttons. Use useState hook to manage the counter state.',
                    task_type: 'practice',
                    estimated_time_minutes: 30,
                    sequence_order: 1,
                    is_completed: false
                },
                {
                    task_id: `${moduleId}_task_2`,
                    task_title: 'Create a Todo List App',
                    task_description: 'Build a simple todo list application where users can add, remove, and mark tasks as complete. Practice state management and event handling.',
                    task_type: 'project',
                    estimated_time_minutes: 90,
                    sequence_order: 2,
                    is_completed: false
                }
            );
        } else if (cleanName.includes('javascript')) {
            tasks.push(
                {
                    task_id: `${moduleId}_task_1`,
                    task_title: 'Array Manipulation Exercises',
                    task_description: 'Complete 5 exercises involving array methods like map, filter, reduce. Focus on understanding how each method transforms data.',
                    task_type: 'practice',
                    estimated_time_minutes: 45,
                    sequence_order: 1,
                    is_completed: false
                },
                {
                    task_id: `${moduleId}_task_2`,
                    task_title: 'Build a Calculator',
                    task_description: 'Create a functional calculator using vanilla JavaScript. Implement basic operations and handle edge cases.',
                    task_type: 'project',
                    estimated_time_minutes: 60,
                    sequence_order: 2,
                    is_completed: false
                }
            );
        } else {
            // Generic but meaningful tasks
            tasks.push(
                {
                    task_id: `${moduleId}_task_1`,
                    task_title: `${moduleName} Fundamentals Practice`,
                    task_description: `Complete a series of exercises to reinforce your understanding of ${moduleName} core concepts. Focus on practical application of what you've learned.`,
                    task_type: 'practice',
                    estimated_time_minutes: 45,
                    sequence_order: 1,
                    is_completed: false
                },
                {
                    task_id: `${moduleId}_task_2`,
                    task_title: `Build a ${moduleName} Mini Project`,
                    task_description: `Apply your ${moduleName} knowledge by building a small project. This will help consolidate your learning and give you practical experience.`,
                    task_type: 'project',
                    estimated_time_minutes: 90,
                    sequence_order: 2,
                    is_completed: false
                }
            );
        }
        
        return tasks;
    }




  /**
   * Generate default module description
   */
  generateDefaultDescription(moduleName) {
    return `Learn the fundamentals of ${moduleName}|Practice with hands-on exercises|Apply knowledge to real-world projects|Master best practices and techniques`;
  }

  /**
   * Generate resource URL based on title
   */
  generateResourceUrl(title) {
    const searchTerm = title.toLowerCase();
    
    if (searchTerm.includes('documentation')) {
      return `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(title)}`;
    }
    
    if (searchTerm.includes('video')) {
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`;
    }
    
    return `https://www.google.com/search?q=${encodeURIComponent(title + ' tutorial')}`;
  }

  /**
   * Detect resource type from title
   */
  detectResourceType(title) {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('video') || lowerTitle.includes('youtube')) return 'video';
    if (lowerTitle.includes('documentation') || lowerTitle.includes('docs')) return 'documentation';
    if (lowerTitle.includes('course') || lowerTitle.includes('tutorial')) return 'tutorial';
    
    return 'article';
  }

  /**
   * Update module completion status
   */
  async updateModuleCompletion(userId, moduleId, isCompleted) {
    try {
      // Fetch current roadmap
      const roadmap = await this.getUserRoadmap(userId);
      if (!roadmap) throw new Error('No active roadmap found');

      // Update the module status in path_data
      const { data: learningPath } = await supabaseServiceRole
        .from('user_learning_paths')
        .select('path_data')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      const pathData = learningPath.path_data;
      
      // Update module status
      if (pathData.modules) {
        const moduleIndex = pathData.modules.findIndex(m => 
          (m.module_id || m.id || `module_${pathData.modules.indexOf(m) + 1}`) === moduleId
        );
        if (moduleIndex !== -1) {
          pathData.modules[moduleIndex].is_completed = isCompleted;
          pathData.modules[moduleIndex].completion_date = isCompleted ? new Date().toISOString() : null;
        }
      } else if (pathData.phases) {
        // Handle phased structure
        for (const phase of pathData.phases) {
          const moduleIndex = phase.modules?.findIndex(m => 
            (m.module_id || m.id) === moduleId
          ) ?? -1;
          if (moduleIndex !== -1) {
            phase.modules[moduleIndex].is_completed = isCompleted;
            phase.modules[moduleIndex].completion_date = isCompleted ? new Date().toISOString() : null;
            break;
          }
        }
      }

      // Save updated path_data
      const { error } = await supabaseServiceRole
        .from('user_learning_paths')
        .update({
          path_data: pathData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating module completion:', error);
      throw error;
    }
  }
}

export default new RoadmapService();