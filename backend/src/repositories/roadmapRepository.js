import BaseRepository from './base/baseRepository.js';

class RoadmapRepository extends BaseRepository {
  constructor() {
    super('user_learning_paths', 'user_path_id');
  }

  /**
   * Get user's active learning path with full module details
   */
  async findActiveByUserId(userId) {
    try {
      console.log('🗺️ Getting active learning path with modules for user:', userId);
      
      const client = this.db.serviceClient;
      
      // Get the user's active learning path
      const { data: pathData, error: pathError } = await client
        .from('user_learning_paths')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (pathError && pathError.code !== 'PGRST116') {
        throw pathError;
      }

      if (!pathData) {
        return null;
      }

      // Get modules for this path with progress (only active modules)
      const { data: modulesData, error: modulesError } = await client
        .from('user_module_progress')
        .select(`
          *,
          learning_modules (
            module_id,
            module_name,
            module_description,
            difficulty,
            estimated_hours,
            skills_covered,
            prerequisites
          )
        `)
        .eq('user_path_id', pathData.user_path_id)
        .eq('status', 'active')  // Only get active modules
        .order('sequence_order');

      if (modulesError) {
        throw modulesError;
      }

      // Transform the data to include modules with progress
      const modules = await Promise.all(
        (modulesData || []).map(async (moduleProgress) => {
          const module = moduleProgress.learning_modules;
          
          // Get resources for this module
          const resources = await this.getModuleResources(userId, module.module_id);
          
          // Get tasks for this module
          const tasks = await this.getModuleTasks(userId, module.module_id);

          return {
            ...module,
            // Progress data
            is_completed: moduleProgress.is_completed,
            completion_date: moduleProgress.completion_date,
            time_spent_minutes: moduleProgress.time_spent_minutes,
            progress_percentage: moduleProgress.progress_percentage,
            sequence_order: moduleProgress.sequence_order,
            started_at: moduleProgress.started_at,
            status: moduleProgress.status,
            // Related content
            resources,
            tasks
          };
        })
      );

      return {
        ...pathData,
        modules
      };
    } catch (error) {
      console.error('Error getting active learning path:', error);
      throw error;
    }
  }

  /**
   * Get resources for a module with user progress
   */
  async getModuleResources(userId, moduleId) {
    try {
      const client = this.db.serviceClient;
      
      const { data, error } = await client
        .from('module_resources')
        .select(`
          sequence_order,
          is_required,
          learning_resources (
            resource_id,
            resource_title,
            resource_type,
            url,
            description,
            estimated_time_minutes
          )
        `)
        .eq('module_id', moduleId)
        .order('sequence_order');

      if (error) throw error;

      return (data || []).map(item => ({
        ...item.learning_resources,
        sequence_order: item.sequence_order,
        is_required: item.is_required
      }));
    } catch (error) {
      console.error('Error getting module resources:', error);
      return [];
    }
  }

  /**
   * Get tasks for a module with user progress
   */
  async getModuleTasks(userId, moduleId) {
    try {
      const client = this.db.serviceClient;
      
      const { data, error } = await client
        .from('module_tasks')
        .select(`
          sequence_order,
          is_required,
          hands_on_tasks (
            task_id,
            task_title,
            task_description,
            task_type,
            estimated_time_minutes,
            instructions,
            solution_url
          )
        `)
        .eq('module_id', moduleId)
        .order('sequence_order');

      if (error) throw error;

      return (data || []).map(item => ({
        ...item.hands_on_tasks,
        sequence_order: item.sequence_order,
        is_required: item.is_required
      }));
    } catch (error) {
      console.error('Error getting module tasks:', error);
      return [];
    }
  }

  /**
   * Create a new learning path from AI-generated roadmap
   */
  async createLearningPath(userId, roadmapData) {
    try {
      console.log('✨ Creating normalized learning path for user:', userId);
      console.log('📊 Input roadmap data:', {
        title: roadmapData.roadmap_title || roadmapData.path_name,
        hasModules: !!roadmapData.modules,
        hasPhases: !!roadmapData.phases,
        modulesCount: roadmapData.modules?.length || 0,
        phasesCount: roadmapData.phases?.length || 0
      });
      
      const client = this.db.serviceClient;

      // 1. Create the main learning path record
      const { data: pathData, error: pathError } = await client
        .from('user_learning_paths')
        .insert({
          user_id: userId,
          path_name: roadmapData.roadmap_title || roadmapData.path_name || 'My Learning Path',
          path_description: roadmapData.description || 'AI-generated learning path',
          status: 'active'
        })
        .select()
        .single();

      if (pathError) throw pathError;

      const userPathId = pathData.user_path_id;
      console.log('✅ Learning path created with ID:', userPathId);

      // 2. Extract modules from roadmap structure
      let modules = [];
      if (roadmapData.modules && Array.isArray(roadmapData.modules)) {
        modules = roadmapData.modules;
      } else if (roadmapData.phases && Array.isArray(roadmapData.phases)) {
        modules = roadmapData.phases.flatMap(phase => phase.modules || []);
      }

      if (modules.length === 0) {
        console.warn('⚠️ No modules found in roadmap data!');
        return pathData;
      }
      
      console.log(`📦 Processing ${modules.length} modules...`);

      // 3. Process each module
      for (let i = 0; i < modules.length; i++) {
        const moduleData = modules[i];
        
        console.log(`📝 Processing module ${i + 1}: ${moduleData.module_name || moduleData.name}`);
        
        try {
          // Create or find existing module
          const moduleId = await this.createOrFindModule(moduleData);
          
          // Link module to user's learning path
          await this.linkModuleToPath(userId, userPathId, moduleId, i + 1);
          
          // Process resources for this module
          if (moduleData.resources && moduleData.resources.length > 0) {
            await this.processModuleResources(moduleId, moduleData.resources);
          }

          // Process tasks for this module
          if (moduleData.tasks && moduleData.tasks.length > 0) {
            await this.processModuleTasks(moduleId, moduleData.tasks);
          }
          
          console.log(`✅ Module ${i + 1} processed successfully`);
        } catch (moduleError) {
          console.error(`❌ Error processing module ${i + 1}:`, moduleError);
          // Continue with other modules instead of failing completely
        }
      }

      console.log('✅ Normalized learning path created successfully');
      return pathData;
    } catch (error) {
      console.error('Error creating normalized learning path:', error);
      throw error;
    }
  }

  /**
   * Create or find existing module (for content reuse)
   */
  async createOrFindModule(moduleData) {
    try {
      const client = this.db.serviceClient;
      
      // Ensure we have a valid module name
      const moduleName = moduleData.module_name || 
                         moduleData.name || 
                         moduleData.title ||
                         'Untitled Module';
      
      console.log(`🔍 Looking for existing modules similar to: ${moduleName}`);
      
      // First, try to find existing similar module by name
      const { data: existingModules, error: searchError } = await client
        .from('learning_modules')
        .select('module_id, module_name, usage_count')
        .ilike('module_name', `%${moduleName}%`)
        .limit(3);

      if (searchError) throw searchError;

      // Check for exact or very similar matches
      const exactMatch = existingModules?.find(m => 
        m.module_name.toLowerCase() === moduleName.toLowerCase()
      );

      if (exactMatch) {
        console.log(`♻️ Reusing existing module: ${exactMatch.module_name}`);
        
        // Update usage count
        await client
          .from('learning_modules')
          .update({ 
            usage_count: (exactMatch.usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('module_id', exactMatch.module_id);
        
        return exactMatch.module_id;
      }

      // Create new module with proper validation
      const { data: newModule, error: createError } = await client
        .from('learning_modules')
        .insert({
          module_name: moduleName, // Ensure this is not null!
          module_description: moduleData.module_description || moduleData.description || `Learn ${moduleName}`,
          difficulty: this.normalizeDifficulty(moduleData.difficulty),
          estimated_hours: moduleData.estimated_hours || moduleData.estimated_completion_time_hours || 3,
          skills_covered: moduleData.skills_covered || [],
          prerequisites: moduleData.prerequisites || [],
          usage_count: 1,
          created_by_ai: true
        })
        .select('module_id')
        .single();

      if (createError) throw createError;

      console.log(`🆕 Created new module: ${moduleName} (ID: ${newModule.module_id})`);
      return newModule.module_id;
    } catch (error) {
      console.error('Error creating/finding module:', error);
      throw error;
    }
  }

  /**
   * Link module to user's learning path
   */
  async linkModuleToPath(userId, userPathId, moduleId, sequenceOrder) {
    try {
      const client = this.db.serviceClient;
      
      const { error } = await client
        .from('user_module_progress')
        .insert({
          user_id: userId,
          user_path_id: userPathId,
          module_id: moduleId,
          sequence_order: sequenceOrder,
          is_completed: false,
          progress_percentage: 0,
          started_at: null
        });

      if (error) throw error;
      
      console.log(`🔗 Linked module ${moduleId} to path ${userPathId} at position ${sequenceOrder}`);
    } catch (error) {
      console.error('Error linking module to path:', error);
      throw error;
    }
  }

  /**
   * Process resources for a module
   */
  async processModuleResources(moduleId, resourcesData) {
    try {
      const client = this.db.serviceClient;

      for (let i = 0; i < resourcesData.length; i++) {
        const resourceData = resourcesData[i];
        
        // Create or get resource
        const resourceId = await this.createOrFindResource(resourceData);
        
        // Link resource to module
        await client
          .from('module_resources')
          .upsert({
            module_id: moduleId,
            resource_id: resourceId,
            sequence_order: i + 1,
            is_required: true
          }, {
            onConflict: 'module_id,resource_id'
          });
      }
      
      console.log(`📚 Processed ${resourcesData.length} resources for module ${moduleId}`);
    } catch (error) {
      console.error('Error processing module resources:', error);
      throw error;
    }
  }

  /**
   * Create or find existing resource
   */
  async createOrFindResource(resourceData) {
    try {
      const client = this.db.serviceClient;
      const resourceTitle = resourceData.resource_title || resourceData.title || 'Untitled Resource';
      
      // Try to find existing resource by title and URL
      let query = client
        .from('learning_resources')
        .select('resource_id, usage_count')
        .ilike('resource_title', resourceTitle);
        
      if (resourceData.url) {
        query = query.eq('url', resourceData.url);
      }
      
      const { data: existing, error: searchError } = await query.limit(1);
      
      if (searchError) throw searchError;

      if (existing && existing.length > 0) {
        console.log(`♻️ Reusing existing resource: ${resourceTitle}`);
        
        // Update usage count
        await client
          .from('learning_resources')
          .update({ 
            usage_count: (existing[0].usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('resource_id', existing[0].resource_id);
        
        return existing[0].resource_id;
      }

      // Create new resource
      const { data: newResource, error: createError } = await client
        .from('learning_resources')
        .insert({
          resource_title: resourceTitle,
          resource_type: (resourceData.resource_type || resourceData.type || 'article').toLowerCase(),
          url: resourceData.url || '',
          description: resourceData.description || '',
          estimated_time_minutes: resourceData.estimated_time_minutes || 30,
          usage_count: 1,
          created_by_ai: true
        })
        .select('resource_id')
        .single();

      if (createError) throw createError;

      console.log(`🆕 Created new resource: ${resourceTitle}`);
      return newResource.resource_id;
    } catch (error) {
      console.error('Error creating/finding resource:', error);
      throw error;
    }
  }

  /**
   * Process tasks for a module
   */
  async processModuleTasks(moduleId, tasksData) {
    try {
      const client = this.db.serviceClient;

      for (let i = 0; i < tasksData.length; i++) {
        const taskData = tasksData[i];
        
        // Create or get task
        const taskId = await this.createOrFindTask(taskData);
        
        // Link task to module
        await client
          .from('module_tasks')
          .upsert({
            module_id: moduleId,
            task_id: taskId,
            sequence_order: i + 1,
            is_required: true
          }, {
            onConflict: 'module_id,task_id'
          });
      }
      
      console.log(`✏️ Processed ${tasksData.length} tasks for module ${moduleId}`);
    } catch (error) {
      console.error('Error processing module tasks:', error);
      throw error;
    }
  }

  /**
   * Create or find existing task
   */
  async createOrFindTask(taskData) {
    try {
      const client = this.db.serviceClient;
      const taskTitle = taskData.task_title || taskData.title || 'Untitled Task';
      
      // Try to find existing task
      const { data: existing, error: searchError } = await client
        .from('hands_on_tasks')
        .select('task_id, usage_count')
        .ilike('task_title', taskTitle)
        .limit(1);

      if (searchError) throw searchError;

      if (existing && existing.length > 0) {
        console.log(`♻️ Reusing existing task: ${taskTitle}`);
        
        // Update usage count
        await client
          .from('hands_on_tasks')
          .update({ 
            usage_count: (existing[0].usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('task_id', existing[0].task_id);
        
        return existing[0].task_id;
      }

      // Create new task
      const { data: newTask, error: createError } = await client
        .from('hands_on_tasks')
        .insert({
          task_title: taskTitle,
          task_description: taskData.task_description || taskData.description || 'Complete this task',
          task_type: (taskData.task_type || taskData.type || 'practice').toLowerCase(),
          estimated_time_minutes: taskData.estimated_time_minutes || 45,
          instructions: taskData.instructions || '',
          solution_url: taskData.solution_url || '',
          usage_count: 1,
          created_by_ai: true
        })
        .select('task_id')
        .single();

      if (createError) throw createError;

      console.log(`🆕 Created new task: ${taskTitle}`);
      return newTask.task_id;
    } catch (error) {
      console.error('Error creating/finding task:', error);
      throw error;
    }
  }

  /**
   * Update module completion status
   */
  async updateModuleCompletion(userId, moduleId, isCompleted) {
    try {
      console.log('📝 Updating module completion:', { userId, moduleId, isCompleted });
      
      const client = this.db.serviceClient;
      
      const updateData = {
        is_completed: isCompleted,
        progress_percentage: isCompleted ? 100 : 0,
        updated_at: new Date().toISOString()
      };

      if (isCompleted) {
        updateData.completion_date = new Date().toISOString();
      } else {
        updateData.completion_date = null;
      }

      const { data, error } = await client
        .from('user_module_progress')
        .update(updateData)
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Module completion updated');
      return data;
    } catch (error) {
      console.error('Error updating module completion:', error);
      throw error;
    }
  }

  /**
   * Get roadmap statistics
   */
  async getRoadmapStats(userId) {
    try {
      console.log('📈 Getting roadmap statistics for user:', userId);
      
      const roadmapData = await this.findActiveByUserId(userId);
      
      if (!roadmapData) {
        return {
          hasRoadmap: false,
          totalModules: 0,
          completedModules: 0,
          completionPercentage: 0,
          estimatedHours: 0
        };
      }

      const modules = roadmapData.modules || [];
      const totalModules = modules.length;
      const completedModules = modules.filter(m => m.is_completed).length;
      const completionPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
      const estimatedHours = modules.reduce((total, module) => total + (module.estimated_hours || 3), 0);

      return {
        hasRoadmap: true,
        title: roadmapData.path_name,
        totalModules,
        completedModules,
        completionPercentage,
        estimatedHours,
        createdAt: roadmapData.created_at,
        lastUpdated: roadmapData.updated_at
      };
    } catch (error) {
      console.error('Error getting roadmap statistics:', error);
      throw error;
    }
  }

  async updateUserRoadmap(userId, modifiedRoadmap) {
    try {
      console.log('🔄 Updating user roadmap with modifications for user:', userId);
      console.log('📊 Modified roadmap structure:', {
        title: modifiedRoadmap.roadmap_title || modifiedRoadmap.path_name,
        hasModules: !!modifiedRoadmap.modules,
        hasPhases: !!modifiedRoadmap.phases,
        modulesCount: modifiedRoadmap.modules?.length || 0,
        phasesCount: modifiedRoadmap.phases?.length || 0,
        modificationType: modifiedRoadmap.modification_type
      });
      
      const client = this.db.serviceClient;

      // Get the current learning path
      const { data: currentPath, error: fetchError } = await client
        .from('user_learning_paths')
        .select('user_path_id, path_name')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (fetchError) throw fetchError;
      if (!currentPath) throw new Error('No active learning path found');

      const userPathId = currentPath.user_path_id;

      // First, get all current active modules to check for reuse
      const { data: currentModules } = await client
        .from('user_module_progress')
        .select('module_id, sequence_order, is_completed, completion_date')
        .eq('user_path_id', userPathId)
        .eq('status', 'active');

      // Create a map of existing modules for quick lookup
      const existingModulesMap = new Map();
      if (currentModules) {
        currentModules.forEach(mod => {
          existingModulesMap.set(mod.module_id, {
            isCompleted: mod.is_completed,
            completionDate: mod.completion_date
          });
        });
      }

      // Archive ALL old modules first
      console.log('📦 Archiving all old modules...');
      const { error: archiveError } = await client
        .from('user_module_progress')
        .update({ 
          status: 'archived',
          // updated_at: new Date().toISOString()
        })
        .eq('user_path_id', userPathId)
        .eq('status', 'active');

      if (archiveError) {
        console.warn('Warning: Could not archive old modules:', archiveError);
      }

      // Extract modules from the modified roadmap structure
      let modules = [];
      if (modifiedRoadmap.modules && Array.isArray(modifiedRoadmap.modules)) {
        modules = modifiedRoadmap.modules;
      } else if (modifiedRoadmap.phases && Array.isArray(modifiedRoadmap.phases)) {
        modules = modifiedRoadmap.phases.flatMap(phase => phase.modules || []);
      }

      console.log(`📦 Processing ${modules.length} modified modules...`);

      // Process each module in the modified roadmap
      for (let i = 0; i < modules.length; i++) {
        const moduleData = modules[i];
        
        // Ensure module has a name
        const moduleName = moduleData.module_name || 
                          moduleData.name || 
                          moduleData.title ||
                          `Module ${i + 1}`;
        
        console.log(`📝 Processing modified module ${i + 1}: ${moduleName}`);
        console.log(`🔍 Module data:`, {
          aiModuleId: moduleData.module_id,
          moduleName: moduleName,
          hasExistingProgress: existingModulesMap.has(moduleData.module_id)
        });
        
        try {
          let moduleId;
          let isCompleted = false;
          let completionDate = null;
          
          const aiModuleId = moduleData.module_id;
          // Check if this looks like a valid UUID vs a sequential number
          const isValidUUID = aiModuleId && 
                            typeof aiModuleId === 'string' && 
                            aiModuleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          
          if (isValidUUID && existingModulesMap.has(aiModuleId)) {
            // Reuse existing module with preserved completion status
            moduleId = aiModuleId;
            const existingProgress = existingModulesMap.get(aiModuleId);
            isCompleted = existingProgress.isCompleted || false;
            completionDate = existingProgress.completionDate;
            console.log(`♻️ Reusing existing module: ${moduleName} (completed: ${isCompleted})`);
            console.log(`📊 Existing progress:`, existingProgress);
          } else {
            // Create new module
            console.log(`🆕 Creating new module: ${moduleName}`);
            moduleId = await this.createOrFindModule({
              ...moduleData,
              module_name: moduleName,
              name: moduleName
            });
          }
          console.log(`🔗 Creating NEW active progress entry for module: ${moduleId}`);
          console.log(`📋 Progress data:`, {
            user_id: userId,
            user_path_id: userPathId,
            module_id: moduleId,
            sequence_order: i + 1,
            is_completed: isCompleted,
            status: 'active'
          });
          
          // Link module to the updated learning path with fresh status
          const { data: upsertData, error: upsertError } = await client
            .from('user_module_progress')
            .upsert({
              user_id: userId,
              user_path_id: userPathId,
              module_id: moduleId,
              sequence_order: i + 1,
              is_completed: isCompleted,
              progress_percentage: isCompleted ? 100 : 0,
              status: 'active',
              started_at: null,
              completion_date: completionDate,
              // created_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,user_path_id,module_id'
            }
          )
            .select();

          if (upsertError) {
          console.error(`❌ Error inserting module progress:`, upsertError);
            throw insertError;
          }
          console.log(`✅ Module progress inserted:`, upsertData);
          console.log(`✅ Module ${i + 1} linked successfully with status 'active'`);

          // Process resources for new modules only
          if (!isValidUUID && moduleData.resources && moduleData.resources.length > 0) {
            await this.processModuleResources(moduleId, moduleData.resources);
          }

          // Process tasks for new modules only
          if (!isValidUUID && moduleData.tasks && moduleData.tasks.length > 0) {
            await this.processModuleTasks(moduleId, moduleData.tasks);
          }
          
          console.log(`✅ Module ${i + 1} processed successfully`);
          
        } catch (moduleError) {
          console.error(`❌ Error processing module ${i + 1}:`, moduleError);
          // Continue with other modules instead of failing completely
        }
      }

      // Update the learning path metadata
      const { error: updateError } = await client
        .from('user_learning_paths')
        .update({
          path_name: modifiedRoadmap.roadmap_title || modifiedRoadmap.path_name || currentPath.path_name,
          path_description: modifiedRoadmap.description || `Modified learning path - ${modifiedRoadmap.modification_type || 'updated'}`,
          updated_at: new Date().toISOString()
        })
        .eq('user_path_id', userPathId);

      if (updateError) {
        console.warn('Warning: Could not update path metadata:', updateError);
      }

      console.log('✅ User roadmap updated successfully');
      
      return {
        success: true,
        userPathId,
        modulesProcessed: modules.length,
        modificationType: modifiedRoadmap.modification_type
      };

    } catch (error) {
      console.error('❌ Error updating user roadmap:', error);
      throw error;
    }
  }

  async linkModuleToPath(userId, userPathId, moduleId, sequenceOrder, isCompleted = false) {
    try {
      const client = this.db.serviceClient;
      
      const { error } = await client
        .from('user_module_progress')
        .insert({
          user_id: userId,
          user_path_id: userPathId,
          module_id: moduleId,
          sequence_order: sequenceOrder,
          is_completed: isCompleted,
          progress_percentage: isCompleted ? 100 : 0,
          status: 'active',
          started_at: null,
          completion_date: isCompleted ? new Date().toISOString() : null
        });

      if (error) throw error;
      
      console.log(`🔗 Linked module ${moduleId} to path ${userPathId} at position ${sequenceOrder} (completed: ${isCompleted})`);
    } catch (error) {
      console.error('Error linking module to path:', error);
      throw error;
    }
  }

  async getModificationHistory(userId) {
    try {
      console.log('📜 Getting roadmap modification history for user:', userId);
      
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from('user_learning_paths')
        .select('modification_history, updated_at, created_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      
      return {
        history: data?.modification_history || [],
        lastModified: data?.updated_at,
        created: data?.created_at
      };
    } catch (error) {
      console.error('Error getting modification history:', error);
      return { history: [], lastModified: null, created: null };
    }
  }

  async backupCurrentRoadmap(userId) {
    try {
      console.log('💾 Creating backup of current roadmap for user:', userId);
      
      // Get current roadmap data
      const currentRoadmap = await this.findActiveByUserId(userId);
      if (!currentRoadmap) return null;

      // For now, just log the backup (we removed the backup table from simplified migration)
      console.log('📄 Roadmap backup logged (in-memory)');
      
      // You can implement actual backup storage later if needed
      return 'backup-' + Date.now();
    } catch (error) {
      console.error('Error creating roadmap backup:', error);
      return null;
    }
  }

  async restoreFromBackup(userId, backupId) {
    try {
      console.log('🔄 Restoring roadmap from backup:', backupId);
      
      const client = this.db.serviceClient;
      
      // Get backup data
      const { data: backup, error: backupError } = await client
        .from('roadmap_backups')
        .select('backup_data')
        .eq('backup_id', backupId)
        .eq('user_id', userId)
        .single();

      if (backupError) throw backupError;
      if (!backup) throw new Error('Backup not found');

      // Restore the roadmap (this would involve recreating the structure)
      // For now, we'll just update the path_data
      const { error: restoreError } = await client
        .from('user_learning_paths')
        .update({
          path_data: backup.backup_data,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (restoreError) throw restoreError;

      console.log('✅ Roadmap restored from backup');
      return { success: true };
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }

  /**
   * Normalize difficulty to consistent format
   */
  normalizeDifficulty(difficulty) {
    if (typeof difficulty === 'number') {
      if (difficulty <= 2) return 'beginner';
      if (difficulty <= 3) return 'intermediate';
      return 'advanced';
    }
    
    const diff = String(difficulty).toLowerCase();
    if (['beginner', 'easy', '1'].includes(diff)) return 'beginner';
    if (['intermediate', 'medium', '2', '3'].includes(diff)) return 'intermediate';
    if (['advanced', 'hard', '4', '5'].includes(diff)) return 'advanced';
    
    return 'beginner'; // default
  }
}

export default RoadmapRepository;