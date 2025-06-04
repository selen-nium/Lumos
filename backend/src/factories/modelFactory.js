import { User, Roadmap, Module, Resource, Task, Progress } from '../models/index.js';

class ModelFactory {
    /**
     * Create model instance from type and data
     */
    static create(type, data) {
        switch (type.toLowerCase()) {
            case 'user':
                return new User(data);
            case 'roadmap':
                return new Roadmap(data);
            case 'module':
                return new Module(data);
            case 'resource':
                return new Resource(data);
            case 'task':
                return new Task(data);
            case 'progress':
                return new Progress(data);
            default:
                throw new Error(`Unknown model type: ${type}`);
        }
    }

    /**
     * Create models from array of data
     */
    static createMany(type, dataArray) {
        return dataArray.map(data => this.create(type, data));
    }

    /**
     * Convert database results to models
     */
    static fromDatabase(type, data) {
        const ModelClass = this.getModelClass(type);
        
        if (Array.isArray(data)) {
            return data.map(item => ModelClass.fromDatabase ? ModelClass.fromDatabase(item) : new ModelClass(item));
        }
        
        return ModelClass.fromDatabase ? ModelClass.fromDatabase(data) : new ModelClass(data);
    }

    /**
     * Get model class by type
     */
    static getModelClass(type) {
        const classes = {
            'user': User,
            'roadmap': Roadmap,
            'module': Module,
            'resource': Resource,
            'task': Task,
            'progress': Progress
        };
        
        const ModelClass = classes[type.toLowerCase()];
        if (!ModelClass) {
            throw new Error(`Unknown model type: ${type}`);
        }
        
        return ModelClass;
    }

    /**
     * Validate model data before creation
     */
    static validateAndCreate(type, data) {
        const model = this.create(type, data);
        
        if (!model.isValid()) {
            const errors = model.getErrors();
            throw new Error(`Model validation failed: ${errors.map(e => e.message).join(', ')}`);
        }
        
        return model;
    }

    /**
     * Create default instances
     */
    static createDefaults() {
        return {
            user: () => new User({
                username: 'new_user',
                email: 'user@example.com',
                careerStage: 'student',
                weeklyLearningHours: 5
            }),
            
            module: (name = 'New Module') => new Module({
                moduleName: name,
                moduleDescription: 'A learning module',
                difficulty: 'beginner',
                estimatedHours: 3
            }),
            
            resource: (title = 'New Resource') => new Resource({
                resourceTitle: title,
                resourceType: 'article',
                estimatedTimeMinutes: 30
            }),
            
            task: (title = 'New Task') => new Task({
                taskTitle: title,
                taskType: 'practice',
                taskDescription: 'A hands-on task',
                estimatedTimeMinutes: 45
            })
        };
    }
}

export default ModelFactory;