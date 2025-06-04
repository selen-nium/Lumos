import BaseModel from './base/BaseModel.js';
import { ModelUtils } from './base/ModelUtils.js';
import Module from './Module.js';

class Roadmap extends BaseModel {
    constructor(data = {}) {
        super(data);
        
        this.pathId = data.path_id || data.pathId || data.user_path_id;
        this.userId = data.user_id || data.userId;
        this.pathName = data.path_name || data.pathName || data.title || data.roadmap_title || '';
        this.pathDescription = data.path_description || data.pathDescription || data.description || '';
        this.estimatedDurationWeeks = data.estimated_duration_weeks || data.estimatedDurationWeeks || 12;
        this.status = data.status || 'active';
        this.generationMethod = data.generation_method || data.generationMethod || 'custom';
        
        // Initialize modules as Module instances
        this.modules = this.initializeModules(data);
        
        // Calculate progress
        this.totalModules = this.modules.length;
        this.completedModules = this.getCompletedModulesCount();
        this.completedPercentage = this.calculateCompletionPercentage();
        this.totalHours = this.calculateTotalHours();
        
        // Metadata
        this.userContext = data.userContext || data.user_context || {};
        this.modificationType = data.modification_type || data.modificationType;
        this.changesApplied = data.changes_applied || data.changesApplied || [];
    }

    /**
     * Initialize modules from various data formats
     */
    initializeModules(data) {
        let modulesData = [];
        
        // Handle different data structures
        if (data.modules && Array.isArray(data.modules)) {
            modulesData = data.modules;
        } else if (data.path_data && data.path_data.modules) {
            modulesData = data.path_data.modules;
        } else if (data.path_data && data.path_data.phases) {
            // Flatten phases into modules
            modulesData = data.path_data.phases.reduce((acc, phase) => {
                return acc.concat(phase.modules || []);
            }, []);
        } else if (data.phases && Array.isArray(data.phases)) {
            // Direct phases array
            modulesData = data.phases.reduce((acc, phase) => {
                return acc.concat(phase.modules || []);
            }, []);
        }
        
        // Convert to Module instances
        return modulesData.map((moduleData, index) => {
            if (moduleData instanceof Module) {
                return moduleData;
            }
            
            // Ensure sequence order
            if (!moduleData.sequence_order && !moduleData.sequenceOrder) {
                moduleData.sequence_order = index + 1;
            }
            
            return new Module(moduleData);
        });
    }

    /**
     * Validate roadmap data
     */
    validate() {
        super.validate();
        
        if (!this.pathName || this.pathName.length < 1) {
            this.addError('pathName', 'Roadmap name is required');
        }
        
        if (!ModelUtils.isInRange(this.estimatedDurationWeeks, 1, 104)) {
            this.addError('estimatedDurationWeeks', 'Duration must be between 1 and 104 weeks');
        }
        
        if (this.modules.length === 0) {
            this.addError('modules', 'Roadmap must have at least one module');
        }
        
        // Validate all modules
        this.modules.forEach((module, index) => {
            if (!module.isValid()) {
                this.addError(`module_${index}`, `Module ${index + 1} is invalid`);
            }
        });
    }

    /**
     * Get completed modules count
     */
    getCompletedModulesCount() {
        return this.modules.filter(module => module.isCompleted).length;
    }

    /**
     * Calculate completion percentage
     */
    calculateCompletionPercentage() {
        if (this.modules.length === 0) return 0;
        return Math.round((this.getCompletedModulesCount() / this.modules.length) * 100);
    }

    /**
     * Calculate total estimated hours
     */
    calculateTotalHours() {
        return this.modules.reduce((total, module) => total + module.estimatedHours, 0);
    }

    /**
     * Get next incomplete module
     */
    getNextModule() {
        return this.modules.find(module => !module.isCompleted);
    }

    /**
     * Get current module (first incomplete)
     */
    getCurrentModule() {
        return this.getNextModule();
    }

    /**
     * Get module by ID
     */
    getModule(moduleId) {
        return this.modules.find(module => 
            module.moduleId === moduleId || 
            module.id === moduleId
        );
    }

    /**
     * Add a module to the roadmap
     */
    addModule(moduleData) {
        const module = moduleData instanceof Module ? 
            moduleData : new Module(moduleData);
        
        module.sequenceOrder = this.modules.length + 1;
        this.modules.push(module);
        this.updateProgress();
        this.markDirty();
        return this;
    }

    /**
     * Remove a module from the roadmap
     */
    removeModule(moduleId) {
        const index = this.modules.findIndex(module => 
            module.moduleId === moduleId || module.id === moduleId
        );
        
        if (index !== -1) {
            this.modules.splice(index, 1);
            this.reorderModules();
            this.updateProgress();
            this.markDirty();
        }
        
        return this;
    }

    /**
     * Reorder modules sequence
     */
    reorderModules() {
        this.modules.forEach((module, index) => {
            module.sequenceOrder = index + 1;
        });
        this.markDirty();
        return this;
    }

    /**
     * Update progress calculations
     */
    updateProgress() {
        this.totalModules = this.modules.length;
        this.completedModules = this.getCompletedModulesCount();
        this.completedPercentage = this.calculateCompletionPercentage();
        this.totalHours = this.calculateTotalHours();
        this.markDirty();
        return this;
    }

    /**
     * Mark a module as completed
     */
    completeModule(moduleId) {
        const module = this.getModule(moduleId);
        if (module) {
            module.markCompleted();
            this.updateProgress();
            this.markDirty();
        }
        return this;
    }

    /**
     * Mark a module as incomplete
     */
    uncompleteModule(moduleId) {
        const module = this.getModule(moduleId);
        if (module) {
            module.markIncomplete();
            this.updateProgress();
            this.markDirty();
        }
        return this;
    }

    /**
     * Get roadmap progress summary
     */
    getProgressSummary() {
        return {
            totalModules: this.totalModules,
            completedModules: this.completedModules,
            completedPercentage: this.completedPercentage,
            totalHours: this.totalHours,
            estimatedWeeks: this.estimatedDurationWeeks,
            currentModule: this.getCurrentModule()?.getSummary(),
            nextModule: this.getNextModule()?.getSummary()
        };
    }

    /**
     * Get modules by difficulty
     */
    getModulesByDifficulty(difficulty) {
        return this.modules.filter(module => module.difficulty === difficulty);
    }

    /**
     * Get modules by completion status
     */
    getModulesByStatus(completed = true) {
        return this.modules.filter(module => module.isCompleted === completed);
    }

    /**
     * Check if roadmap is completed
     */
    isCompleted() {
        return this.completedPercentage >= 100;
    }

    /**
     * Get estimated completion date
     */
    getEstimatedCompletionDate(weeklyHours = 10) {
        const remainingHours = this.totalHours - this.getCompletedHours();
        const weeksRemaining = Math.ceil(remainingHours / weeklyHours);
        
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + (weeksRemaining * 7));
        
        return completionDate.toISOString();
    }

    /**
     * Get total hours spent on completed modules
     */
    getCompletedHours() {
        return this.modules
            .filter(module => module.isCompleted)
            .reduce((total, module) => total + module.estimatedHours, 0);
    }

    /**
     * Enhance roadmap with additional resources/tasks
     */
    enhance() {
        this.modules.forEach(module => {
            // Add default resources if missing
            if (module.resources.length === 0) {
                this.addDefaultResources(module);
            }
            
            // Add default tasks if missing
            if (module.tasks.length === 0) {
                this.addDefaultTasks(module);
            }
        });
        
        this.markDirty();
        return this;
    }

    /**
     * Add default resources to a module
     */
    addDefaultResources(module) {
        // This would typically call your resource generation service
        // For now, add basic structure
        const defaultResources = [
            {
                resourceTitle: `${module.moduleName} - Documentation`,
                resourceType: 'documentation',
                estimatedTimeMinutes: 30
            },
            {
                resourceTitle: `${module.moduleName} - Video Tutorial`,
                resourceType: 'video',
                estimatedTimeMinutes: 45
            }
        ];
        
        defaultResources.forEach(resourceData => {
            module.addResource(resourceData);
        });
    }

    /**
     * Add default tasks to a module
     */
    addDefaultTasks(module) {
        const defaultTasks = [
            {
                taskTitle: `${module.moduleName} - Practice Exercise`,
                taskType: 'practice',
                taskDescription: `Practice the concepts learned in ${module.moduleName}`,
                estimatedTimeMinutes: 60
            },
            {
                taskTitle: `${module.moduleName} - Mini Project`,
                taskType: 'project',
                taskDescription: `Build a small project using ${module.moduleName}`,
                estimatedTimeMinutes: 90
            }
        ];
        
        defaultTasks.forEach(taskData => {
            module.addTask(taskData);
        });
    }

    /**
     * Get roadmap in database format
     */
    toDatabase() {
        return {
            user_id: this.userId,
            path_name: this.pathName,
            path_description: this.pathDescription,
            status: this.status,
            path_data: {
                roadmap_title: this.pathName,
                estimated_duration_weeks: this.estimatedDurationWeeks,
                modules: this.modules.map(module => module.toJSON()),
                generation_method: this.generationMethod,
                user_context: this.userContext,
                modification_type: this.modificationType,
                changes_applied: this.changesApplied,
                enhanced_at: new Date().toISOString()
            },
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }

    /**
     * Create roadmap from database data
     */
    static fromDatabase(data) {
        if (!data) return null;
        
        // Merge path_data into main object for easier handling
        const mergedData = {
            ...data,
            ...data.path_data
        };
        
        return new Roadmap(mergedData);
    }
}

export default Roadmap;