import BaseModel from './base/BaseModel.js';
import { ModelUtils } from './base/ModelUtils.js';

class User extends BaseModel {
    constructor(data = {}) {
        super(data);
        
        // User profile data
        this.username = data.username || '';
        this.email = data.email || '';
        this.isEmployed = data.is_employed || data.isEmployed || 'no';
        this.careerStage = data.career_stage || data.careerStage || 'student';
        this.company = data.company || '';
        this.role = data.role || '';
        this.weeklyLearningHours = data.weekly_learning_hours || data.weeklyLearningHours || 5;
        this.preferredLearningTime = data.preferred_learning_time || data.preferredLearningTime || 'evening';
        this.userType = data.user_type || data.userType || 'mentee';
        this.bio = data.bio || '';
        this.profilePictureUrl = data.profile_picture_url || data.profilePictureUrl || '';
        this.onboardingComplete = data.onboarding_complete || data.onboardingComplete || false;
        
        // Learning data
        this.skills = data.skills || [];
        this.goals = data.goals || [];
        this.learningStreak = data.learningStreak || 0;
        this.totalHoursLearned = data.totalHoursLearned || 0;
    }

    /**
     * Validate user data
     */
    validate() {
        super.validate();
        
        if (!this.username || this.username.length < 2) {
            this.addError('username', 'Username must be at least 2 characters');
        }
        
        if (!this.email || !ModelUtils.isValidEmail(this.email)) {
            this.addError('email', 'Valid email is required');
        }
        
        if (!['yes', 'no'].includes(this.isEmployed)) {
            this.addError('isEmployed', 'Employment status must be yes or no');
        }
        
        if (this.isEmployed === 'yes' && !this.company) {
            this.addError('company', 'Company is required when employed');
        }
        
        if (this.isEmployed === 'yes' && !this.role) {
            this.addError('role', 'Role is required when employed');
        }
        
        if (!ModelUtils.isInRange(this.weeklyLearningHours, 1, 100)) {
            this.addError('weeklyLearningHours', 'Weekly hours must be between 1 and 100');
        }
    }

    /**
     * Get user's experience level
     */
    getExperienceLevel() {
        const mapping = {
            'student': 'beginner',
            'early-career': 'beginner',
            'mid-career': 'intermediate',
            'senior': 'advanced',
            'career-break': 'intermediate'
        };
        return mapping[this.careerStage] || 'beginner';
    }

    /**
     * Get user's preferred difficulty
     */
    getPreferredDifficulty() {
        const mapping = {
            'student': 1,
            'early-career': 2,
            'mid-career': 3,
            'senior': 4,
            'career-break': 2
        };
        return mapping[this.careerStage] || 2;
    }

    /**
     * Check if user has completed onboarding
     */
    hasCompletedOnboarding() {
        return this.onboardingComplete && this.skills.length > 0 && this.goals.length > 0;
    }

    /**
     * Get formatted skills text
     */
    getSkillsText() {
        return this.skills.map(skill => skill.name || skill.skill_name || skill).join(', ');
    }

    /**
     * Get formatted goals text
     */
    getGoalsText() {
        return this.goals.map(goal => goal.title || goal.goal_title || goal).join(', ');
    }

    /**
     * Add a skill to user
     */
    addSkill(skill) {
        if (!this.hasSkill(skill)) {
            this.skills.push(skill);
            this.markDirty();
        }
        return this;
    }

    /**
     * Check if user has a specific skill
     */
    hasSkill(skill) {
        const skillName = skill.name || skill.skill_name || skill;
        return this.skills.some(s => 
            (s.name || s.skill_name || s) === skillName
        );
    }

    /**
     * Add a goal to user
     */
    addGoal(goal) {
        if (!this.hasGoal(goal)) {
            this.goals.push(goal);
            this.markDirty();
        }
        return this;
    }

    /**
     * Check if user has a specific goal
     */
    hasGoal(goal) {
        const goalTitle = goal.title || goal.goal_title || goal;
        return this.goals.some(g => 
            (g.title || g.goal_title || g) === goalTitle
        );
    }

    /**
     * Update learning stats
     */
    updateLearningStats(hoursSpent) {
        this.totalHoursLearned += hoursSpent;
        this.markDirty();
        return this;
    }

    /**
     * Update learning streak
     */
    updateStreak(newStreak) {
        this.learningStreak = newStreak;
        this.markDirty();
        return this;
    }

    /**
     * Get user context for AI/RAG
     */
    getContextForAI() {
        return {
            experienceLevel: this.getExperienceLevel(),
            skillsText: this.getSkillsText(),
            goalsText: this.getGoalsText(),
            timeAvailable: this.weeklyLearningHours,
            preferredDifficulty: this.getPreferredDifficulty(),
            careerStage: this.careerStage,
            isEmployed: this.isEmployed === 'yes',
            learningStyle: this.preferredLearningTime
        };
    }

    /**
     * Create a user profile summary
     */
    getProfileSummary() {
        return {
            username: this.username,
            experienceLevel: this.getExperienceLevel(),
            skillCount: this.skills.length,
            goalCount: this.goals.length,
            weeklyHours: this.weeklyLearningHours,
            onboardingComplete: this.hasCompletedOnboarding(),
            learningStreak: this.learningStreak,
            totalHours: this.totalHoursLearned
        };
    }
}

export default User;