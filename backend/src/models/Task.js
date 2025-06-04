import BaseModel from './base/BaseModel.js';
import { ModelUtils } from './base/ModelUtils.js';

class Task extends BaseModel {
    constructor(data = {}) {
        super(data);
        
        this.taskId = data.task_id || data.taskId || data.id;
        this.taskTitle = data.task_title || data.taskTitle || data.title || '';
        this.taskDescription = data.task_description || data.taskDescription || data.description || '';
        this.taskType = data.task_type || data.taskType || data.type || 'practice';
        this.estimatedTimeMinutes = data.estimated_time_minutes || data.estimatedTimeMinutes || 45;
        this.sequenceOrder = data.sequence_order || data.sequenceOrder || 1;
        this.difficulty = data.difficulty || 'beginner';
        this.instructions = data.instructions || data.task_steps || '';
        this.solutionUrl = data.solution_url || data.solutionUrl || '';
        
        // Progress tracking
        this.isCompleted = data.is_completed || data.isCompleted || false;
        this.completionDate = data.completion_date || data.completionDate || null;
        this.timeSpent = data.timeSpent || 0;
        this.submissionUrl = data.submissionUrl || '';
        this.notes = data.notes || '';
        this.score = data.score || null;
        this.attempts = data.attempts || 0;
    }

    /**
     * Validate task data
     */
    validate() {
        super.validate();
        
        if (!this.taskTitle || this.taskTitle.length < 1) {
            this.addError('taskTitle', 'Task title is required');
        }
        
        if (!this.taskDescription || this.taskDescription.length < 10) {
            this.addError('taskDescription', 'Task description must be at least 10 characters');
        }
        
        const validTypes = ['practice', 'project', 'quiz', 'assignment'];
        if (!validTypes.includes(this.taskType)) {
            this.addError('taskType', `Task type must be one of: ${validTypes.join(', ')}`);
        }
        
        if (!ModelUtils.isInRange(this.estimatedTimeMinutes, 5, 480)) {
            this.addError('estimatedTimeMinutes', 'Estimated time must be between 5 and 480 minutes');
        }
        
        if (this.score && !ModelUtils.isInRange(this.score, 0, 100)) {
            this.addError('score', 'Score must be between 0 and 100');
        }
        
        if (this.solutionUrl && !ModelUtils.isValidUrl(this.solutionUrl)) {
            this.addError('solutionUrl', 'Invalid solution URL format');
        }
        
        if (this.submissionUrl && !ModelUtils.isValidUrl(this.submissionUrl)) {
            this.addError('submissionUrl', 'Invalid submission URL format');
        }
    }

    /**
     * Mark task as completed
     */
    markCompleted(score = null) {
        this.isCompleted = true;
        this.completionDate = new Date().toISOString();
        this.attempts += 1;
        
        if (score !== null) {
            this.score = score;
        }
        
        this.markDirty();
        return this;
    }

    /**
     * Mark task as incomplete
     */
    markIncomplete() {
        this.isCompleted = false;
        this.completionDate = null;
        this.markDirty();
        return this;
    }

    /**
     * Add time spent on task
     */
    addTimeSpent(minutes) {
        this.timeSpent += minutes;
        this.markDirty();
        return this;
    }

    /**
     * Set submission URL
     */
    setSubmission(url, notes = '') {
        this.submissionUrl = url;
        if (notes) {
            this.notes = notes;
        }
        this.markDirty();
        return this;
    }

    /**
     * Add attempt
     */
    addAttempt() {
        this.attempts += 1;
        this.markDirty();
        return this;
    }

    /**
     * Get task type icon
     */
    getTypeIcon() {
        const icons = {
            'practice': '💪',
            'project': '🚀',
            'quiz': '❓',
            'assignment': '📝'
        };
        return icons[this.taskType] || '📝';
    }

    /**
     * Get task type color
     */
    getTypeColor() {
        const colors = {
            'practice': '#10b981',     // green
            'project': '#8b5cf6',      // purple
            'quiz': '#f59e0b',         // amber
            'assignment': '#3b82f6'    // blue
        };
        return colors[this.taskType] || '#6b7280';
    }

    /**
     * Get difficulty level as number
     */
    getDifficultyLevel() {
        const mapping = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
        return mapping[this.difficulty] || 1;
    }

    /**
     * Get formatted duration
     */
    getFormattedDuration() {
        return ModelUtils.formatDuration(this.estimatedTimeMinutes);
    }

    /**
     * Get completion status
     */
    getStatus() {
        if (this.isCompleted) return '✅ Completed';
        if (this.submissionUrl) return '📤 Submitted';
        if (this.attempts > 0) return '🔄 In Progress';
        return '⏳ Not Started';
    }

    /**
     * Get display title
     */
    getTitle() {
        return this.taskTitle;
    }

    /**
     * Check if task has solution
     */
    hasSolution() {
        return this.solutionUrl && ModelUtils.isValidUrl(this.solutionUrl);
    }

    /**
     * Check if task has submission
     */
    hasSubmission() {
        return this.submissionUrl && ModelUtils.isValidUrl(this.submissionUrl);
    }

    /**
     * Get task summary
     */
    getSummary() {
        return {
            id: this.taskId,
            title: this.taskTitle,
            type: this.taskType,
            icon: this.getTypeIcon(),
            difficulty: this.difficulty,
            duration: this.getFormattedDuration(),
            isCompleted: this.isCompleted,
            hasSubmission: this.hasSubmission(),
            hasSolution: this.hasSolution(),
            score: this.score,
            attempts: this.attempts,
            status: this.getStatus()
        };
    }

    /**
     * Get instructions as array
     */
    getInstructionsArray() {
        if (!this.instructions) return [];
        
        // If it's already an array
        if (Array.isArray(this.instructions)) {
            return this.instructions;
        }
        
        // Split by newlines or steps
        return this.instructions
            .split(/\n|\d+\.\s/)
            .filter(step => step.trim().length > 0)
            .map(step => step.trim());
    }

    /**
     * Clone task as template
     */
    cloneAsTemplate() {
        const cloned = this.clone();
        cloned.taskId = ModelUtils.generateId();
        cloned.isCompleted = false;
        cloned.completionDate = null;
        cloned.timeSpent = 0;
        cloned.submissionUrl = '';
        cloned.notes = '';
        cloned.score = null;
        cloned.attempts = 0;
        
        return cloned;
    }
}

export default Task;