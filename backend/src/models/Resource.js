import BaseModel from './base/BaseModel.js';
import { ModelUtils } from './base/ModelUtils.js';

class Resource extends BaseModel {
    constructor(data = {}) {
        super(data);
        
        this.resourceId = data.resource_id || data.resourceId || data.id;
        this.resourceTitle = data.resource_title || data.resourceTitle || data.title || '';
        this.url = data.url || '';
        this.resourceType = data.resource_type || data.resourceType || data.type || 'article';
        this.estimatedTimeMinutes = data.estimated_time_minutes || data.estimatedTimeMinutes || 30;
        this.sequenceOrder = data.sequence_order || data.sequenceOrder || 1;
        this.isRequired = data.is_required || data.isRequired || true;
        this.description = data.description || '';
        
        // Progress tracking
        this.isCompleted = data.is_completed || data.isCompleted || false;
        this.completionDate = data.completion_date || data.completionDate || null;
        this.timeSpent = data.timeSpent || 0;
        this.rating = data.rating || null;
        this.notes = data.notes || '';
    }

    /**
     * Validate resource data
     */
    validate() {
        super.validate();
        
        if (!this.resourceTitle || this.resourceTitle.length < 1) {
            this.addError('resourceTitle', 'Resource title is required');
        }
        
        if (this.url && !ModelUtils.isValidUrl(this.url)) {
            this.addError('url', 'Invalid URL format');
        }
        
        const validTypes = ['video', 'article', 'documentation', 'tutorial', 'interactive', 'course'];
        if (!validTypes.includes(this.resourceType)) {
            this.addError('resourceType', `Resource type must be one of: ${validTypes.join(', ')}`);
        }
        
        if (!ModelUtils.isInRange(this.estimatedTimeMinutes, 1, 1440)) {
            this.addError('estimatedTimeMinutes', 'Estimated time must be between 1 and 1440 minutes');
        }
        
        if (this.rating && !ModelUtils.isInRange(this.rating, 1, 5)) {
            this.addError('rating', 'Rating must be between 1 and 5');
        }
    }

    /**
     * Mark resource as completed
     */
    markCompleted() {
        this.isCompleted = true;
        this.completionDate = new Date().toISOString();
        this.markDirty();
        return this;
    }

    /**
     * Mark resource as incomplete
     */
    markIncomplete() {
        this.isCompleted = false;
        this.completionDate = null;
        this.markDirty();
        return this;
    }

    /**
     * Add time spent on resource
     */
    addTimeSpent(minutes) {
        this.timeSpent += minutes;
        this.markDirty();
        return this;
    }

    /**
     * Set rating for resource
     */
    setRating(rating) {
        if (ModelUtils.isInRange(rating, 1, 5)) {
            this.rating = rating;
            this.markDirty();
        }
        return this;
    }

    /**
     * Add notes about the resource
     */
    addNotes(notes) {
        this.notes = ModelUtils.cleanString(notes, 1000);
        this.markDirty();
        return this;
    }

    /**
     * Get resource type icon
     */
    getTypeIcon() {
        const icons = {
            'video': '🎥',
            'article': '📄',
            'documentation': '📖',
            'tutorial': '🎯',
            'interactive': '💻',
            'course': '🎓'
        };
        return icons[this.resourceType] || '📄';
    }

    /**
     * Get resource type color
     */
    getTypeColor() {
        const colors = {
            'video': '#ef4444',        // red
            'article': '#3b82f6',      // blue
            'documentation': '#10b981', // green
            'tutorial': '#8b5cf6',     // purple
            'interactive': '#f59e0b',  // amber
            'course': '#6366f1'        // indigo
        };
        return colors[this.resourceType] || '#6b7280';
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
        return this.isCompleted ? '✅ Completed' : '⏳ Pending';
    }

    /**
     * Get display title
     */
    getTitle() {
        return this.resourceTitle;
    }

    /**
     * Check if resource has valid URL
     */
    hasValidUrl() {
        return this.url && ModelUtils.isValidUrl(this.url);
    }

    /**
     * Get resource summary
     */
    getSummary() {
        return {
            id: this.resourceId,
            title: this.resourceTitle,
            type: this.resourceType,
            icon: this.getTypeIcon(),
            duration: this.getFormattedDuration(),
            isCompleted: this.isCompleted,
            isRequired: this.isRequired,
            hasValidUrl: this.hasValidUrl(),
            rating: this.rating,
            status: this.getStatus()
        };
    }

    /**
     * Generate resource URL if missing
     */
    generateUrl() {
        if (this.url) return this.url;
        
        const title = this.resourceTitle.toLowerCase();
        const searchTerm = encodeURIComponent(this.resourceTitle);
        
        // Generate URLs based on resource type
        switch (this.resourceType) {
            case 'video':
                return `https://www.youtube.com/results?search_query=${searchTerm}`;
            case 'documentation':
                return `https://developer.mozilla.org/en-US/search?q=${searchTerm}`;
            case 'tutorial':
                return `https://www.freecodecamp.org/news/search/?query=${searchTerm}`;
            case 'course':
                return `https://www.coursera.org/search?query=${searchTerm}`;
            case 'interactive':
                return `https://codepen.io/search/pens?q=${searchTerm}`;
            default:
                return `https://www.google.com/search?q=${searchTerm}`;
        }
    }

    /**
     * Clone resource as template
     */
    cloneAsTemplate() {
        const cloned = this.clone();
        cloned.resourceId = ModelUtils.generateId();
        cloned.isCompleted = false;
        cloned.completionDate = null;
        cloned.timeSpent = 0;
        cloned.rating = null;
        cloned.notes = '';
        
        return cloned;
    }
}

export default Resource;