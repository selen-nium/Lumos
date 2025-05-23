import sql from '../database/db.js';

class ContentService {
    /**
     * Get module details with resources and tasks
     */
    async getModuleDetails(moduleId) {
        try {
            // Get module info
            const moduleResult = await sql`
                SELECT * FROM modules WHERE module_id = ${moduleId}
            `;
            
            if (moduleResult.length === 0) {
                throw new Error('Module not found');
            }
            
            const module = moduleResult[0];
            
            // Get associated resources
            const resources = await sql`
                SELECT lr.*, mr.sequence_order, mr.is_required
                FROM learning_resources lr
                JOIN module_resources mr ON lr.resource_id = mr.resource_id
                WHERE mr.module_id = ${moduleId}
                ORDER BY mr.sequence_order
            `;
            
            // Get associated tasks
            const tasks = await sql`
                SELECT ht.*, mt.sequence_order, mt.is_required
                FROM hands_on_tasks ht
                JOIN module_tasks mt ON ht.task_id = mt.task_id
                WHERE mt.module_id = ${moduleId}
                ORDER BY mt.sequence_order
            `;
            
            return {
                ...module,
                resources,
                tasks
            };
        } catch (error) {
            console.error('Error fetching module details:', error);
            throw error;
        }
    }

    /**
     * Get all skills and goals for reference
     */
    async getSkillsAndGoals() {
        try {
            const [skills, goals] = await Promise.all([
                sql`SELECT * FROM skills ORDER BY category, skill_name`,
                sql`SELECT * FROM goals ORDER BY goal_id`
            ]);
            
            return { skills, goals };
        } catch (error) {
            console.error('Error fetching skills and goals:', error);
            throw error;
        }
    }

    /**
     * Check prerequisites for a module
     */
    async checkPrerequisites(moduleId, userCompletedModules = []) {
        try {
            const moduleResult = await sql`
                SELECT prerequisite_modules FROM modules WHERE module_id = ${moduleId}
            `;
            
            if (moduleResult.length === 0) {
                return { canStart: false, missingPrerequisites: [] };
            }
            
            const prerequisites = moduleResult[0].prerequisite_modules || [];
            
            if (prerequisites.length === 0) {
                return { canStart: true, missingPrerequisites: [] };
            }
            
            const missingPrerequisites = prerequisites.filter(
                prereqId => !userCompletedModules.includes(prereqId)
            );
            
            return {
                canStart: missingPrerequisites.length === 0,
                missingPrerequisites
            };
        } catch (error) {
            console.error('Error checking prerequisites:', error);
            throw error;
        }
    }
}

export default new ContentService();