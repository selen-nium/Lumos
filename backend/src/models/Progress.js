import BaseModel from './base/BaseModel.js';
import { ModelUtils } from './base/ModelUtils.js';

class Progress extends BaseModel {
    constructor(data = {}) {
        super(data);
        
        this.progressId = data.progress_id || data.progressId || data.id;
        this.userId = data.user_id || data.userId;
        this.resourceId = data.resource_id || data.resourceId;
        this.taskId = data.task_id || data.taskId;
        this.moduleId = data.module_id || data.moduleId;
        this.completionStatus = data.completion_status || data.completionStatus || 'not_started';
        this.timeSpentMinutes = data.time_spent_minutes || data.timeSpentMinutes || 0;
        this.completionDate = data.completion_date || data.completionDate;
        this.notes = data.notes || '';
        this.score = data.score;
        this.attempts = data.attempts || 0;
        
        // Streak tracking
        this.streakCount = data.streak_count || data.streakCount || 0;
        this.lastActivityDate = data.last_activity_date || data.lastActivityDate;
        this.longestStreak = data.longest_streak || data.longestStreak || 0;
    }

    /**
     * Validate progress data
     */
    validate() {
        super.validate();
        
        const validStatuses = ['not_started', 'in_progress', 'completed', 'paused'];
        if (!validStatuses.includes(this.completionStatus)) {
            this.addError('completionStatus', `Status must be one of: ${validStatuses.join(', ')}`);
        }
        
        if (!ModelUtils.isInRange(this.timeSpentMinutes, 0, 10080)) { // Max 1 week
            this.addError('timeSpentMinutes', 'Time spent must be between 0 and 10080 minutes');
        }
        
        if (this.score && !ModelUtils.isInRange(this.score, 0, 100)) {
            this.addError('score', 'Score must be between 0 and 100');
        }
    }

    /**
     * Mark as completed
     */
    markCompleted(score = null) {
        this.completionStatus = 'completed';
        this.completionDate = new Date().toISOString();
        this.lastActivityDate = new Date().toISOString();
        
        if (score !== null) {
            this.score = score;
        }
        
        this.updateStreak();
        this.markDirty();
        return this;
    }

    /**
     * Mark as in progress
     */
    markInProgress() {
        if (this.completionStatus === 'not_started') {
            this.completionStatus = 'in_progress';
            this.lastActivityDate = new Date().toISOString();
            this.markDirty();
        }
        return this;
    }

    /**
     * Add time spent
     */
    addTimeSpent(minutes) {
        this.timeSpentMinutes += minutes;
        this.lastActivityDate = new Date().toISOString();
        this.markInProgress();
        this.markDirty();
        return this;
    }

    /**
     * Add attempt
     */
    addAttempt() {
        this.attempts += 1;
        this.lastActivityDate = new Date().toISOString();
        this.markInProgress();
        this.markDirty();
        return this;
    }

    /**
     * Update learning streak
     */
    updateStreak() {
        const today = new Date().toDateString();
        const lastActivity = this.lastActivityDate ? 
            new Date(this.lastActivityDate).toDateString() : null;
        
        if (lastActivity === today) {
            // Already logged today, don't increment
            return this;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        if (lastActivity === yesterdayStr) {
            // Consecutive day, increment streak
            this.streakCount += 1;
        } else if (!lastActivity) {
            // First activity
            this.streakCount = 1;
        } else {
            // Streak broken, reset
            this.streakCount = 1;
        }
        
        // Update longest streak
        if (this.streakCount > this.longestStreak) {
            this.longestStreak = this.streakCount;
        }
        
        this.lastActivityDate = new Date().toISOString();
        this.markDirty();
        return this;
    }

    /**
     * Check if streak is active (studied today or yesterday)
     */
    isStreakActive() {
        if (!this.lastActivityDate) return false;
        
        const lastActivity = new Date(this.lastActivityDate);
        const now = new Date();
        const diffDays = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
        
        return diffDays <= 1;
    }

    /**
     * Get formatted time spent
     */
    getFormattedTimeSpent() {
        return ModelUtils.formatDuration(this.timeSpentMinutes);
    }

    /**
     * Get completion percentage (for in-progress items)
     */
    getCompletionPercentage() {
        switch (this.completionStatus) {
            case 'completed': return 100;
            case 'in_progress': return this.score || 50;
            case 'paused': return this.score || 25;
            default: return 0;
        }
    }

    /**
     * Get status icon
     */
    getStatusIcon() {
        const icons = {
            'not_started': '⏳',
            'in_progress': '🔄',
            'completed': '✅',
            'paused': '⏸️'
        };
        return icons[this.completionStatus] || '⏳';
    }

    /**
     * Get progress summary
     */
    getSummary() {
        return {
            id: this.progressId,
            status: this.completionStatus,
            icon: this.getStatusIcon(),
            timeSpent: this.getFormattedTimeSpent(),
            completionPercentage: this.getCompletionPercentage(),
            score: this.score,
            attempts: this.attempts,
            streakCount: this.streakCount,
            isStreakActive: this.isStreakActive(),
            lastActivity: this.lastActivityDate
        };
    }

    /**
     * Calculate study efficiency (completion vs time spent)
     */
    getEfficiencyScore(expectedTimeMinutes) {
        if (!expectedTimeMinutes || this.timeSpentMinutes === 0) return null;
        
        const efficiency = (expectedTimeMinutes / this.timeSpentMinutes) * 100;
        return Math.min(Math.max(efficiency, 0), 200); // Cap at 200%
    }

    /**
     * Get learning insights
     */
    getInsights(expectedTimeMinutes) {
        const insights = [];
        
        if (this.completionStatus === 'completed') {
            const efficiency = this.getEfficiencyScore(expectedTimeMinutes);
            
            if (efficiency && efficiency > 120) {
                insights.push('Completed faster than expected! Great job!');
            } else if (efficiency && efficiency < 80) {
                insights.push('Took a bit longer, but completion is what matters!');
            }
            
            if (this.score && this.score >= 90) {
                insights.push('Excellent score achieved!');
            }
        }
        
        if (this.streakCount >= 7) {
            insights.push(`Amazing ${this.streakCount}-day learning streak!`);
        }
        
        if (this.attempts > 3) {
            insights.push('Persistence pays off - keep practicing!');
        }
        
        return insights;
    }
}

export default Progress;