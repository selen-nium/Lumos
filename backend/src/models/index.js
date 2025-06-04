export class User {
  constructor(data = {}) {
    this.id = data.id;
    this.username = data.username || '';
    this.email = data.email || '';
    this.careerStage = data.career_stage || data.careerStage || 'student';
    this.weeklyLearningHours = data.weekly_learning_hours || data.weeklyLearningHours || 5;
    this.isEmployed = data.is_employed || data.isEmployed || 'no';
    this.company = data.company || '';
    this.role = data.role || '';
    this.preferredLearningTime = data.preferred_learning_time || data.preferredLearningTime || 'evening';
    this.userType = data.user_type || data.userType || 'mentee';
    this.onboardingComplete = data.onboarding_complete || data.onboardingComplete || false;
    
    // Learning data
    this.skills = data.skills || [];
    this.goals = data.goals || [];
    
    // Timestamps
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

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

  getSkillsText() {
    return this.skills.map(s => s.skill_name || s.name || s).join(', ');
  }

  getGoalsText() {
    return this.goals.map(g => g.goal_title || g.title || g).join(', ');
  }

  // For compatibility with existing services
  update(updates) {
    Object.assign(this, updates);
    return this;
  }

  isValid() {
    return this.email && this.username;
  }

  getErrors() {
    const errors = [];
    if (!this.email) errors.push({ field: 'email', message: 'Email is required' });
    if (!this.username) errors.push({ field: 'username', message: 'Username is required' });
    return errors;
  }

  toDatabase() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      career_stage: this.careerStage,
      weekly_learning_hours: this.weeklyLearningHours,
      is_employed: this.isEmployed,
      company: this.company,
      role: this.role,
      preferred_learning_time: this.preferredLearningTime,
      user_type: this.userType,
      onboarding_complete: this.onboardingComplete,
      updated_at: new Date().toISOString()
    };
  }
}

// Simple Roadmap model
export class Roadmap {
  constructor(data = {}) {
    this.pathId = data.user_path_id || data.pathId || data.id;
    this.userId = data.user_id || data.userId;
    this.pathName = data.path_name || data.pathName || data.title || data.roadmap_title || '';
    this.pathDescription = data.path_description || data.pathDescription || data.description || '';
    this.status = data.status || 'active';
    this.modules = (data.modules || []).map(m => new Module(m));
    
    // Timestamps
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  get totalModules() {
    return this.modules.length;
  }

  get completedModules() {
    return this.modules.filter(m => m.isCompleted).length;
  }

  get completionPercentage() {
    return this.totalModules === 0 ? 0 : 
      Math.round((this.completedModules / this.totalModules) * 100);
  }

  get totalHours() {
    return this.modules.reduce((total, m) => total + (m.estimatedHours || 0), 0);
  }

  getNextModule() {
    return this.modules.find(m => !m.isCompleted);
  }

  // For compatibility with existing services
  toDatabase() {
    return {
      user_id: this.userId,
      path_name: this.pathName,
      path_description: this.pathDescription,
      status: this.status,
      updated_at: new Date().toISOString()
    };
  }
}

// Simple Module model
export class Module {
  constructor(data = {}) {
    this.moduleId = data.module_id || data.moduleId || data.id;
    this.moduleName = data.module_name || data.moduleName || data.name || '';
    this.moduleDescription = data.module_description || data.moduleDescription || data.description || '';
    this.difficulty = data.difficulty || 'beginner';
    this.estimatedHours = data.estimated_hours || data.estimatedHours || 3;
    this.sequenceOrder = data.sequence_order || data.sequenceOrder || 1;
    this.isCompleted = data.is_completed || data.isCompleted || false;
    this.completionDate = data.completion_date || data.completionDate || null;
    this.progressPercentage = data.progress_percentage || data.progressPercentage || 0;
    this.skillsCovered = data.skills_covered || data.skillsCovered || [];
    this.prerequisites = data.prerequisites || [];
    
    // Simplified resources and tasks
    this.resources = data.resources || [];
    this.tasks = data.tasks || [];
  }

  get status() {
    return this.isCompleted ? 'completed' : 'pending';
  }

  get icon() {
    return this.isCompleted ? '✅' : '⏳';
  }

  // For compatibility
  getSummary() {
    return {
      id: this.moduleId,
      name: this.moduleName,
      difficulty: this.difficulty,
      estimatedHours: this.estimatedHours,
      isCompleted: this.isCompleted,
      progressPercentage: this.progressPercentage,
      status: this.status
    };
  }
}

// Simple Resource model (minimal for now)
export class Resource {
  constructor(data = {}) {
    this.resourceId = data.resource_id || data.resourceId || data.id;
    this.resourceTitle = data.resource_title || data.resourceTitle || data.title || '';
    this.resourceType = data.resource_type || data.resourceType || data.type || 'article';
    this.url = data.url || '';
    this.estimatedTimeMinutes = data.estimated_time_minutes || data.estimatedTimeMinutes || 30;
  }

  getTitle() {
    return this.resourceTitle;
  }
}

// Simple Task model (minimal for now)
export class Task {
  constructor(data = {}) {
    this.taskId = data.task_id || data.taskId || data.id;
    this.taskTitle = data.task_title || data.taskTitle || data.title || '';
    this.taskDescription = data.task_description || data.taskDescription || data.description || '';
    this.taskType = data.task_type || data.taskType || data.type || 'practice';
    this.estimatedTimeMinutes = data.estimated_time_minutes || data.estimatedTimeMinutes || 45;
    this.isCompleted = data.is_completed || data.isCompleted || false;
  }

  getTitle() {
    return this.taskTitle;
  }
}

// Simple Progress model (minimal for now)
export class Progress {
  constructor(data = {}) {
    this.progressId = data.progress_id || data.progressId || data.id;
    this.userId = data.user_id || data.userId;
    this.moduleId = data.module_id || data.moduleId;
    this.completionStatus = data.completion_status || data.completionStatus || 'not_started';
    this.timeSpentMinutes = data.time_spent_minutes || data.timeSpentMinutes || 0;
    this.completionDate = data.completion_date || data.completionDate;
  }
}

// Export default for compatibility
export default {
  User,
  Roadmap,
  Module,
  Resource,
  Task,
  Progress
};