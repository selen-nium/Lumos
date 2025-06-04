import BaseModel from './base/BaseModel.js';
import { ModelUtils } from './base/ModelUtils.js';
import Resource from './Resource.js';
import Task from './Task.js';

class Module extends BaseModel {
    constructor(data = {}) {
        super(data);
        
        this.moduleId = data.module_id || data.moduleId || data.id;
        this.moduleName = data.module_name || data.moduleName || data.name || '';
        this.moduleDescription = data.module_description || data.moduleDescription || data.description || '';
        this.difficulty = data.difficulty_level || data.difficulty || 'beginner';
        this.estimatedHours = data.estimated_completion_time_hours || data.estimated_completion_hours || data.estimatedHours || 3;
        this.sequenceOrder = data.sequence_order || data.sequenceOrder || 1;
        this.isCompleted = data.is_completed || data.isCompleted || false;
        this.completionDate = data.completion_date || data.completionDate || null;
        this.prerequisites = data.prerequisites || [];
        this.skillsCovered = data.skills_covered || data.skillsCovered || [];
        
        // Initialize resources and tasks as model instances
        this.resources = this.initializeResources(data.resources || []);
        this.tasks = this.initializeTasks(data.tasks || []);
        
        // Progress tracking
        this.progressPercentage = data.progressPercentage || 0;
        this.timeSpent = data.timeSpent || 0;
        this.lastAccessed = data.lastAccessed || null;
    }

    /**
     * Initialize resources as Resource model instances
     */
    initializeResources(resourcesData) {
        return resourcesData.map(resourceData => {
            if (resourceData instanceof Resource) {
                return resourceData;
            }
            return new Resource(resourceData);
        });
    }

    /**
     * Initialize tasks as Task model instances
     */
    initializeTasks(tasksData) {
        return tasksData.map(taskData => {
            if (taskData instanceof Task) {
                return taskData;
            }
            return new Task(taskData);
        });
    }

    /**
     * Validate module data
     */
    validate() {
        super.validate();
        
        if (!this.moduleName || this.moduleName.length < 1) {
            this.addError('moduleName', 'Module name is required');
        }
        
        if (!['Beginner', 'Intermediate', 'Advanced'].includes(this.difficulty)) {
            this.addError('difficulty', 'Difficulty must be beginner, intermediate, or advanced');
        }
        
        if (!ModelUtils.isInRange(this.estimatedHours, 0.5, 100)) {
            this.addError('estimatedHours', 'Estimated hours must be between 0.5 and 100');
        }
        
        if (!ModelUtils.isInRange(this.sequenceOrder, 1, 1000)) {
            this.addError('sequenceOrder', 'Sequence order must be between 1 and 1000');
        }
    }

    /**
     * Mark module as completed
     */
    markCompleted() {
        this.isCompleted = true;
        this.completionDate = new Date().toISOString();
        this.progressPercentage = 100;
        this.markDirty();
        return this;
    }

    /**
     * Mark module as incomplete
     */
    markIncomplete() {
        this.isCompleted = false;
        this.completionDate = null;
        this.progressPercentage = 0;
        this.markDirty();
        return this;
    }

    /**
     * Update progress percentage
     */
    updateProgress(percentage) {
        this.progressPercentage = Math.max(0, Math.min(100, percentage));
        this.lastAccessed = new Date().toISOString();
        this.markDirty();
        
        // Auto-complete if 100%
        if (this.progressPercentage >= 100 && !this.isCompleted) {
            this.markCompleted();
        }
        
        return this;
    }

    /**
     * Add time spent on module
     */
    addTimeSpent(minutes) {
        this.timeSpent += minutes;
        this.lastAccessed = new Date().toISOString();
        this.markDirty();
        return this;
    }

    /**
     * Add a resource to the module
     */
    addResource(resourceData) {
        const resource = resourceData instanceof Resource ? 
            resourceData : new Resource(resourceData);
        
        resource.sequenceOrder = this.resources.length + 1;
        this.resources.push(resource);
        this.markDirty();
        return this;
    }

    /**
     * Add a task to the module
     */
    addTask(taskData) {
        const task = taskData instanceof Task ? 
            taskData : new Task(taskData);
        
        task.sequenceOrder = this.tasks.length + 1;
        this.tasks.push(task);
        this.markDirty();
        return this;
    }

    /**
     * Get completed resources count
     */
    getCompletedResourcesCount() {
        return this.resources.filter(resource => resource.isCompleted).length;
    }

    /**
     * Get completed tasks count
     */
    getCompletedTasksCount() {
        return this.tasks.filter(task => task.isCompleted).length;
    }

    /**
     * Calculate overall progress based on resources and tasks
     */
    calculateProgress() {
        const totalItems = this.resources.length + this.tasks.length;
        if (totalItems === 0) return 0;
        
        const completedItems = this.getCompletedResourcesCount() + this.getCompletedTasksCount();
        return Math.round((completedItems / totalItems) * 100);
    }

    /**
     * Check if prerequisites are met
     */
    canStart(completedModuleIds = []) {
        return this.prerequisites.every(prereqId => 
            completedModuleIds.includes(prereqId)
        );
    }

    /**
     * Get next incomplete resource
     */
    getNextResource() {
        return this.resources.find(resource => !resource.isCompleted);
    }

    /**
     * Get next incomplete task
     */
    getNextTask() {
        return this.tasks.find(task => !task.isCompleted);
    }

    /**
     * Get difficulty as number
     */
    getDifficultyLevel() {
        const mapping = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
        return mapping[this.difficulty] || 1;
    }

    /**
     * Get formatted duration
     */
    getFormattedDuration() {
        return ModelUtils.formatDuration(this.estimatedHours * 60);
    }

    /**
     * Get module status
     */
    getStatus() {
        if (this.isCompleted) return '✅ Completed';
        if (this.progressPercentage > 0) return '🔄 In Progress';
        return '⏳ Not Started';
    }

    /**
     * Get module summary for display
     */
    getSummary() {
        return {
            id: this.moduleId,
            name: this.moduleName,
            difficulty: this.difficulty,
            estimatedHours: this.estimatedHours,
            isCompleted: this.isCompleted,
            progressPercentage: this.progressPercentage,
            resourcesCount: this.resources.length,
            tasksCount: this.tasks.length,
            status: this.getStatus(),
            canStart: this.canStart(),
            nextResource: this.getNextResource()?.getTitle(),
            nextTask: this.getNextTask()?.getTitle()
        };
    }

    /**
     * Clone module with new ID
     */
    cloneAsTemplate() {
        const cloned = this.clone();
        cloned.moduleId = ModelUtils.generateId();
        cloned.isCompleted = false;
        cloned.completionDate = null;
        cloned.progressPercentage = 0;
        cloned.timeSpent = 0;
        cloned.lastAccessed = null;
        
        // Clone resources and tasks
        cloned.resources = this.resources.map(resource => resource.cloneAsTemplate());
        cloned.tasks = this.tasks.map(task => task.cloneAsTemplate());
        
        return cloned;
    }
}

export default Module;