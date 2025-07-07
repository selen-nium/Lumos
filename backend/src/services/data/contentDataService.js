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
}

const contentDataService = new ContentDataService();
export default contentDataService;