import supabaseService from "../core/supabaseService.js";

class RoadmapDataService {
    constructor() {
        this.db = supabaseService;
    }

    //core roadmap operations
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

        // Get modules for this path with progress
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
            .eq('status', 'active')
            .order('sequence_order');

        if (modulesError) {
            throw modulesError;
        }

        // Transform modules data
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

        // Get all current active modules to check for reuse
        const { data: currentModules } = await client
            .from('user_module_progress')
            .select('module_id, sequence_order, is_completed, completion_date, learning_modules(module_name)')
            .eq('user_path_id', userPathId)
            .eq('status', 'active')
            .order('sequence_order');

        // Create a map of existing modules for quick lookup
        const existingModulesMap = new Map();
        if (currentModules) {
            currentModules.forEach(mod => {
            existingModulesMap.set(mod.module_id, {
                isCompleted: mod.is_completed,
                completionDate: mod.completion_date,
                sequenceOrder: mod.sequence_order,
                moduleName: mod.learning_modules?.module_name
            });
            });
        }

        // Extract modules from the modified roadmap structure
        let modules = [];
        if (modifiedRoadmap.modules && Array.isArray(modifiedRoadmap.modules)) {
            modules = modifiedRoadmap.modules;
        } else if (modifiedRoadmap.phases && Array.isArray(modifiedRoadmap.phases)) {
            modules = modifiedRoadmap.phases.flatMap(phase => phase.modules || []);
        }

        console.log(`📦 Processing ${modules.length} modified modules...`);

        // Handle different modification types
        const modificationType = modifiedRoadmap.modification_type;
        
        if (modificationType === 'add_modules') {
            console.log('➕ Processing ADD_MODULES: Preserving existing modules and adding new ones');
            
            // Find which modules are new
            const existingModuleNames = new Set(
            Array.from(existingModulesMap.values()).map(m => m.moduleName?.toLowerCase())
            );
            
            const newModules = modules.filter(module => {
            const moduleName = (module.module_name || module.name || '').toLowerCase();
            return !existingModuleNames.has(moduleName);
            });
            
            console.log(`🆕 Found ${newModules.length} truly new modules to add`);
            console.log(`🔄 Keeping ${existingModulesMap.size} existing modules`);
            
            // Get the highest sequence order from existing modules
            let maxSequenceOrder = 0;
            if (currentModules && currentModules.length > 0) {
            maxSequenceOrder = Math.max(...currentModules.map(m => m.sequence_order || 0));
            }
            
            // Process only the new modules
            for (let i = 0; i < newModules.length; i++) {
            const moduleData = newModules[i];
            const sequenceOrder = maxSequenceOrder + i + 1;
            
            const moduleName = moduleData.module_name || 
                                moduleData.name || 
                                moduleData.title ||
                                `New Module ${i + 1}`;
            
            console.log(`📝 Adding new module ${i + 1}: ${moduleName}`);
            
            try {
                // Create new module (always new for add_modules)
                const moduleId = await this.createModule({
                ...moduleData,
                module_name: moduleName,
                name: moduleName
                });
                
                // Process resources and tasks for new module
                if (moduleData.resources && Array.isArray(moduleData.resources)) {
                await this.processModuleResources(moduleId, moduleData.resources);
                }
                
                if (moduleData.tasks && Array.isArray(moduleData.tasks)) {
                await this.processModuleTasks(moduleId, moduleData.tasks);
                }
                
                // Link new module to the learning path
                const { error: insertError } = await client
                .from('user_module_progress')
                .insert({
                    user_id: userId,
                    user_path_id: userPathId,
                    module_id: moduleId,
                    sequence_order: sequenceOrder,
                    is_completed: false,
                    progress_percentage: 0,
                    status: 'active',
                    started_at: null,
                    completion_date: null
                });

                if (insertError) throw insertError;
                
                console.log(`✅ New module ${i + 1} added successfully at position ${sequenceOrder}`);
                
            } catch (moduleError) {
                console.error(`❌ Error adding new module ${i + 1}:`, moduleError);
                // Continue with other modules instead of failing completely
            }
            }
            
        } else {
            console.log(`🔄 Processing ${modificationType}: Full roadmap replacement`);

            // Archive ALL old modules first
            console.log('📦 Archiving all old modules...');
            const { error: archiveError } = await client
            .from('user_module_progress')
            .update({ 
                status: 'archived'
            })
            .eq('user_path_id', userPathId)
            .eq('status', 'active');

            if (archiveError) {
            console.warn('Warning: Could not archive old modules:', archiveError);
            }

            // Process each module in the modified roadmap
            for (let i = 0; i < modules.length; i++) {
            const moduleData = modules[i];
            
            // Ensure module has a name
            const moduleName = moduleData.module_name || 
                                moduleData.name || 
                                moduleData.title ||
                                `Module ${i + 1}`;
            
            console.log(`📝 Processing modified module ${i + 1}: ${moduleName}`);
            
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
                } else {
                // Create new module
                console.log(`🆕 Creating new module: ${moduleName}`);
                moduleId = await this.createModule({
                    ...moduleData,
                    module_name: moduleName,
                    name: moduleName
                });
                }
                
                console.log(`🔗 Creating NEW active progress entry for module: ${moduleId}`);
                
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
                    completion_date: completionDate
                }, {
                    onConflict: 'user_id,user_path_id,module_id'
                })
                .select();

                if (upsertError) {
                console.error(`❌ Error inserting module progress:`, upsertError);
                throw upsertError;
                }
                console.log(`✅ Module ${i + 1} linked successfully with status 'active'`);
                
            } catch (moduleError) {
                console.error(`❌ Error processing module ${i + 1}:`, moduleError);
                // Continue with other modules instead of failing completely
            }
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

    async createLearningPath(userId, roadmapData) {
        try {
        console.log('✨ Creating learning path for user:', userId);
        
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
            // Create module
            const moduleId = await this.createModule(moduleData);
            
            // Link module to user's learning path
            await this.linkModuleToPath(userId, userPathId, moduleId, i + 1);
            
            // ✨ NEW: Process resources for this module
            if (moduleData.resources && Array.isArray(moduleData.resources) && moduleData.resources.length > 0) {
                console.log(`📚 Processing ${moduleData.resources.length} resources for module ${moduleId}`);
                await this.processModuleResources(moduleId, moduleData.resources);
            }
            
            // ✨ NEW: Process tasks for this module  
            if (moduleData.tasks && Array.isArray(moduleData.tasks) && moduleData.tasks.length > 0) {
                console.log(`✏️ Processing ${moduleData.tasks.length} tasks for module ${moduleId}`);
                await this.processModuleTasks(moduleId, moduleData.tasks);
            }
            
            console.log(`✅ Module ${i + 1} processed successfully with resources and tasks`);
            } catch (moduleError) {
            console.error(`❌ Error processing module ${i + 1}:`, moduleError);
            // Continue with other modules instead of failing completely
            }
        }

        console.log('✅ Learning path created successfully');
        return pathData;
        } catch (error) {
        console.error('Error creating learning path:', error);
        throw error;
        }
    }

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

    //module operations
    async createModule(moduleData) {
        try {
        const client = this.db.serviceClient;
        
        const moduleName = moduleData.module_name || 
                            moduleData.name || 
                            moduleData.title ||
                            'Untitled Module';
        
        // Create new module
        const { data: newModule, error: createError } = await client
            .from('learning_modules')
            .insert({
            module_name: moduleName,
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
        console.error('Error creating module:', error);
        throw error;
        }
    }

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
            status: 'active',
            started_at: null
            });

        if (error) throw error;
        
        console.log(`🔗 Linked module ${moduleId} to path ${userPathId} at position ${sequenceOrder}`);
        } catch (error) {
        console.error('Error linking module to path:', error);
        throw error;
        }
    }

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


    //module contents
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


    // resource & task creation
    async createOrFindResource(resourceData) {
        try {
        const client = this.db.serviceClient;
        const resourceTitle = resourceData.resource_title || resourceData.title || 'Untitled Resource';
        const resourceType = (resourceData.resource_type || resourceData.type || 'article').toLowerCase();
        
        // Generate a proper URL if none provided or if it's a placeholder
        let url = resourceData.url || '';
        if (!url || url === 'https://example.com' || url === '#' || url.includes('placeholder')) {
            url = this.generateResourceUrl(resourceTitle, resourceType);
            console.log(`🔗 Generated URL for "${resourceTitle}": ${url}`);
        }
        
        // Try to find existing resource by title and URL
        let query = client
            .from('learning_resources')
            .select('resource_id, usage_count')
            .ilike('resource_title', resourceTitle);
            
        if (url && url !== '#') {
            query = query.eq('url', url);
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

        // Create new resource with generated URL
        const { data: newResource, error: createError } = await client
            .from('learning_resources')
            .insert({
            resource_title: resourceTitle,
            resource_type: resourceType,
            url: url,
            description: resourceData.description || '',
            estimated_time_minutes: resourceData.estimated_time_minutes || 30,
            usage_count: 1,
            created_by_ai: true
            })
            .select('resource_id')
            .single();

        if (createError) throw createError;

        console.log(`🆕 Created new resource: ${resourceTitle} with URL: ${url}`);
        return newResource.resource_id;
        } catch (error) {
        console.error('Error creating/finding resource:', error);
        throw error;
        }
    }

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


    // backup functions
    async backupCurrentRoadmap(userId) {
        try {
        console.log('💾 Creating backup of current roadmap for user:', userId);
        
        // Get current roadmap data
        const currentRoadmap = await this.findActiveByUserId(userId);
        if (!currentRoadmap) return null;

        // Create a simple backup entry (we'll store it as JSON in a simple way)
        const client = this.db.serviceClient;
        
        // Check if we have a backup table, if not, just create an in-memory backup ID
        try {
            const backupData = {
            user_id: userId,
            backup_data: currentRoadmap,
            backup_type: 'pre_modification',
            created_at: new Date().toISOString()
            };

            // Try to insert into backup table if it exists
            const { data: backup, error: backupError } = await client
            .from('roadmap_backups')
            .insert(backupData)
            .select('id')
            .single();

            if (!backupError && backup) {
            console.log('💾 Roadmap backup created in database:', backup.id);
            return backup.id;
            }
        } catch (error) {
            console.log('📄 Backup table not available, creating in-memory backup');
        }
        
        // Fallback: create a simple backup ID for logging
        const backupId = 'backup-' + Date.now() + '-' + userId;
        console.log('📄 Roadmap backup logged (in-memory):', backupId);
        
        return backupId;
        } catch (error) {
        console.error('Error creating roadmap backup:', error);
        return null;
        }
    }

    async restoreFromBackup(userId, backupId) {
        try {
        console.log('🔄 Restoring roadmap from backup:', backupId);
        
        const client = this.db.serviceClient;
        
        try {
            // Try to get backup data from database if backup table exists
            const { data: backup, error: backupError } = await client
            .from('roadmap_backups')
            .select('backup_data')
            .eq('id', backupId)
            .eq('user_id', userId)
            .single();

            if (!backupError && backup) {
            // Restore the roadmap using the backup data
            const result = await this.updateUserRoadmap(userId, backup.backup_data);
            
            console.log('✅ Roadmap restored from database backup');
            return { success: true, restored: true };
            }
        } catch (error) {
            console.log('Backup table not available or backup not found');
        }

        // If we can't restore from database backup, just log that we attempted restoration
        console.log('⚠️ Could not restore from backup - backup system is simplified');
        console.log('🔄 User can regenerate roadmap if needed');
        
        return { 
            success: true, 
            restored: false,
            message: 'Backup restoration not available - please regenerate roadmap if needed'
        };
        } catch (error) {
        console.error('Error restoring from backup:', error);
        throw error;
        }
    }

    async getModificationHistory(userId) {
        try {
        console.log('📜 Getting roadmap modification history for user:', userId);
        
        const client = this.db.serviceClient;
        
        // Get modification history from user_learning_paths
        const { data: pathData, error: pathError } = await client
            .from('user_learning_paths')
            .select('created_at, updated_at, path_name')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (pathError && pathError.code !== 'PGRST116') {
            console.warn('No active learning path found for modification history');
            return { history: [], lastModified: null, created: null };
        }

        // Get archived modules as a proxy for modification history
        const { data: archivedModules, error: archiveError } = await client
            .from('user_module_progress')
            .select(`
            updated_at,
            status,
            learning_modules (module_name)
            `)
            .eq('user_id', userId)
            .eq('status', 'archived')
            .order('updated_at', { ascending: false })
            .limit(10);

        if (archiveError) {
            console.warn('Error fetching archived modules:', archiveError);
        }

        // Create a simplified modification history
        const history = (archivedModules || []).map((item, index) => ({
            id: `mod_${index}`,
            type: 'module_archive',
            description: `Module "${item.learning_modules?.module_name || 'Unknown'}" was modified`,
            timestamp: item.updated_at,
            status: item.status
        }));

        return {
            history,
            lastModified: pathData?.updated_at,
            created: pathData?.created_at
        };
        } catch (error) {
        console.error('Error getting modification history:', error);
        return { history: [], lastModified: null, created: null };
        }
    }

    //utils
    generateResourceUrl(resourceTitle, resourceType) {
        const title = resourceTitle.toLowerCase();
        const type = (resourceType || 'article').toLowerCase();
        
        // Remove common prefixes to get the core topic
        const cleanTitle = title
        .replace(/^(youtube:?|video:?|tutorial:?|course:?|guide:?|docs?:?|documentation:?)\s*/i, '')
        .replace(/\s*(tutorial|guide|course|documentation|docs)$/i, '')
        .trim();
        
        // Encode for URL safety
        const encodedTitle = encodeURIComponent(cleanTitle);
        const searchTerm = cleanTitle.replace(/[^\w\s]/g, '').replace(/\s+/g, '+');
        
        // Generate URLs based on resource type and title patterns
        if (type === 'video' || title.includes('youtube')) {
        return `https://www.youtube.com/results?search_query=${searchTerm}`;
        }
        
        if (type === 'documentation' || title.includes('mdn') || title.includes('docs')) {
        if (title.includes('javascript') || title.includes('js')) {
            return `https://developer.mozilla.org/en-US/search?q=${encodedTitle}`;
        }
        if (title.includes('react')) {
            return `https://react.dev/learn`;
        }
        if (title.includes('node')) {
            return `https://nodejs.org/en/docs`;
        }
        if (title.includes('css')) {
            return `https://developer.mozilla.org/en-US/docs/Web/CSS`;
        }
        if (title.includes('html')) {
            return `https://developer.mozilla.org/en-US/docs/Web/HTML`;
        }
        // Default to MDN search
        return `https://developer.mozilla.org/en-US/search?q=${encodedTitle}`;
        }
        
        if (type === 'tutorial' || title.includes('freecodecamp') || title.includes('tutorial')) {
        if (title.includes('freecodecamp')) {
            return `https://www.freecodecamp.org/learn`;
        }
        if (title.includes('w3schools')) {
            return `https://www.w3schools.com/default.asp`;
        }
        // Default to FreeCodeCamp
        return `https://www.freecodecamp.org/learn`;
        }
        
        if (type === 'course' || title.includes('coursera') || title.includes('udemy')) {
        if (title.includes('coursera')) {
            return `https://www.coursera.org/search?query=${searchTerm}`;
        }
        if (title.includes('udemy')) {
            return `https://www.udemy.com/courses/search/?q=${searchTerm}`;
        }
        if (title.includes('edx')) {
            return `https://www.edx.org/search?q=${searchTerm}`;
        }
        // Default to Coursera
        return `https://www.coursera.org/search?query=${searchTerm}`;
        }
        
        if (title.includes('github')) {
        return `https://github.com/search?q=${searchTerm}&type=repositories`;
        }
        
        if (title.includes('stackoverflow') || title.includes('stack overflow')) {
        return `https://stackoverflow.com/search?q=${searchTerm}`;
        }
        
        if (title.includes('medium')) {
        return `https://medium.com/search?q=${searchTerm}`;
        }
        
        if (title.includes('dev.to')) {
        return `https://dev.to/search?q=${searchTerm}`;
        }
        
        // Technology-specific defaults
        if (title.includes('react')) {
        return `https://react.dev/learn`;
        }
        
        if (title.includes('vue')) {
        return `https://vuejs.org/guide/`;
        }
        
        if (title.includes('angular')) {
        return `https://angular.io/docs`;
        }
        
        if (title.includes('python')) {
        return `https://docs.python.org/3/`;
        }
        
        if (title.includes('java') && !title.includes('javascript')) {
        return `https://docs.oracle.com/en/java/`;
        }
        
        if (title.includes('c++') || title.includes('cpp')) {
        return `https://en.cppreference.com/`;
        }
        
        if (title.includes('rust')) {
        return `https://doc.rust-lang.org/book/`;
        }
        
        if (title.includes('go') || title.includes('golang')) {
        return `https://golang.org/doc/`;
        }
        
        // Default fallback: Use DuckDuckGo search (more privacy-friendly than Google)
        return `https://duckduckgo.com/?q=${searchTerm}+tutorial`;
    }
}

const roadmapDataService = new RoadmapDataService();
export default roadmapDataService;