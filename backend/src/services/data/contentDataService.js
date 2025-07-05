import supabaseService from "../core/supabaseService.js";

class ContentDataService {
    constructor() {
        this.db = supabaseService;
    }

    //core content operations
    async getAllSkills() {
        try {
        console.log('📋 Getting all skills');
        
        const client = this.db.serviceClient;
        const { data, error } = await client
            .from('skills')
            .select('*')
            .order('category, skill_name');

        if (error) throw error;
        return data || [];
        } catch (error) {
        console.error('Error fetching skills:', error);
        throw error;
        }
    }

    async getAllGoals() {
        try {
        console.log('🎯 Fetching all goals');
        
        const client = this.db.serviceClient;
        const { data, error } = await client
            .from('goals')
            .select('*')
            .order('goal_id');

        if (error) throw error;
        return data || [];
        } catch (error) {
        console.error('Error fetching goals:', error);
        throw error;
        }
    }

    async getRecommendations(userId, type = 'all', limit = 5) {
        try {
        console.log('💡 Getting content recommendations:', { userId, type, limit });
        
        // Get user's current skills and goals for personalized recommendations
        const [skills, goals] = await Promise.all([
            this.getUserSkills(userId),
            this.getUserGoals(userId)
        ]);

        const recommendations = {};

        if (type === 'all' || type === 'modules') {
            // Recommend modules based on user's goals
            const goalKeywords = goals.map(g => g.goal_title?.toLowerCase() || '').join(' ');
            
            // Simple recommendation: suggest modules that match user goals
            recommendations.modules = goals.slice(0, limit).map((goal, index) => ({
            module_id: `rec_module_${index}`,
            module_name: `${goal.goal_title} Advanced Concepts`,
            module_description: `Deep dive into ${goal.goal_title}`,
            difficulty: 'intermediate',
            estimated_hours: 4,
            reason: `Based on your goal: ${goal.goal_title}`
            }));
        }
        
        if (type === 'all' || type === 'resources') {
            // Recommend resources based on user's current skills
            recommendations.resources = skills.slice(0, limit).map((skill, index) => ({
            resource_id: `rec_resource_${index}`,
            resource_title: `Advanced ${skill.skill_name} Guide`,
            resource_type: 'documentation',
            estimated_time_minutes: 45,
            reason: `To enhance your ${skill.skill_name} skills`
            }));
        }
        
        if (type === 'all' || type === 'templates') {
            // Simple template recommendations
            recommendations.templates = [
            {
                template_id: 'template_fullstack',
                template_name: 'Full Stack Developer Path',
                difficulty_level: 'intermediate',
                estimated_duration_weeks: 16,
                usage_count: 150
            },
            {
                template_id: 'template_frontend',
                template_name: 'Frontend Specialist Path',
                difficulty_level: 'beginner',
                estimated_duration_weeks: 12,
                usage_count: 200
            }
            ].slice(0, limit);
        }

        return recommendations;
        } catch (error) {
        console.error('Error getting recommendations:', error);
        return { modules: [], resources: [], templates: [] };
        }
    }
}

const contentDataService = new ContentDataService();
export default contentDataService;