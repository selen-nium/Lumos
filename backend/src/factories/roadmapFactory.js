import { Roadmap, Module, Resource, Task } from '../models/index.js';

class RoadmapFactory {
    /**
     * Create roadmap from raw API data
     */
    static fromApiData(data) {
        return new Roadmap(data);
    }

    /**
     * Create roadmap from database row
     */
    static fromDatabase(data) {
        return Roadmap.fromDatabase(data);
    }

    /**
     * Create empty roadmap template
     */
    static createTemplate(userId, title = 'New Learning Path') {
        return new Roadmap({
            userId,
            pathName: title,
            pathDescription: 'A personalized learning journey',
            estimatedDurationWeeks: 12,
            status: 'active',
            generationMethod: 'template',
            modules: []
        });
    }

    /**
     * Create roadmap from user profile
     */
    static fromUserProfile(user, goals, skills) {
        const roadmap = new Roadmap({
            userId: user.id,
            pathName: `${user.username}'s Learning Path`,
            pathDescription: `Personalized path focusing on: ${goals.join(', ')}`,
            estimatedDurationWeeks: Math.ceil(user.weeklyLearningHours / 2) * 4, // Rough estimate
            status: 'active',
            generationMethod: 'profile_based',
            userContext: {
                skills: skills,
                goals: goals,
                experienceLevel: user.getExperienceLevel(),
                weeklyHours: user.weeklyLearningHours
            }
        });

        // Add basic modules based on goals
        goals.forEach((goal, index) => {
            const module = new Module({
                moduleName: `${goal} Fundamentals`,
                moduleDescription: `Learn the core concepts of ${goal}`,
                difficulty: user.getExperienceLevel(),
                estimatedHours: 4,
                sequenceOrder: index + 1
            });
            
            roadmap.addModule(module);
        });

        return roadmap;
    }

    /**
     * Clone roadmap for different user
     */
    static cloneForUser(originalRoadmap, newUserId) {
        const cloned = originalRoadmap.clone();
        cloned.userId = newUserId;
        cloned.pathId = null; // Will get new ID when saved
        cloned.generationMethod = 'cloned';
        
        // Reset all progress
        cloned.modules.forEach(module => {
            module.isCompleted = false;
            module.completionDate = null;
            module.progressPercentage = 0;
            module.timeSpent = 0;
            
            // Reset resources and tasks
            module.resources.forEach(resource => {
                resource.isCompleted = false;
                resource.completionDate = null;
                resource.timeSpent = 0;
                resource.rating = null;
            });
            
            module.tasks.forEach(task => {
                task.isCompleted = false;
                task.completionDate = null;
                task.timeSpent = 0;
                task.score = null;
                task.attempts = 0;
            });
        });
        
        cloned.updateProgress();
        return cloned;
    }

    /**
     * Merge two roadmaps
     */
    static merge(roadmap1, roadmap2, mergeStrategy = 'append') {
        const merged = roadmap1.clone();
        
        switch (mergeStrategy) {
            case 'append':
                // Add modules from roadmap2 to end
                roadmap2.modules.forEach(module => {
                    const clonedModule = module.clone();
                    clonedModule.sequenceOrder = merged.modules.length + 1;
                    merged.addModule(clonedModule);
                });
                break;
                
            case 'interleave':
                // Alternate modules from both roadmaps
                const maxLength = Math.max(roadmap1.modules.length, roadmap2.modules.length);
                const newModules = [];
                
                for (let i = 0; i < maxLength; i++) {
                    if (roadmap1.modules[i]) {
                        newModules.push(roadmap1.modules[i]);
                    }
                    if (roadmap2.modules[i]) {
                        newModules.push(roadmap2.modules[i]);
                    }
                }
                
                merged.modules = newModules;
                merged.reorderModules();
                break;
        }
        
        merged.pathName = `${roadmap1.pathName} + ${roadmap2.pathName}`;
        merged.updateProgress();
        return merged;
    }
}

export default RoadmapFactory;