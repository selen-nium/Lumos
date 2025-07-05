import supabaseService from '../core/supabaseService.js';

class UserDataService {
    constructor() {
        this.db = supabaseService;
    }

    async getProfile(userId) {
        try {
        console.log('👤 Getting user profile:', userId);
        
        const client = this.db.serviceClient;
        const { data, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
        } catch (error) {
        console.error('Error getting user profile:', error);
        throw error;
        }
    }

    async updateProfile(userId, updates) {
        try {
        console.log('📝 Updating user profile:', userId);
        
        const client = this.db.serviceClient;
        const { data, error } = await client
            .from('profiles')
            .update({
            ...updates,
            updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
        } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
        }
    }

    async getUserSkills(userId) {
        try {
        console.log('🛠️ Getting user skills:', userId);
        
        const client = this.db.serviceClient;
        const { data, error } = await client
            .from('user_skills')
            .select(`
            skill_id,
            proficiency_level,
            skills (
                skill_id,
                skill_name,
                category
            )
            `)
            .eq('user_id', userId)
            .order('skill_id');

        if (error) throw error;

        // Transform to flat structure
        return (data || []).map(item => ({
            skill_id: item.skill_id,
            skill_name: item.skills?.skill_name,
            category: item.skills?.category,
            proficiency_level: item.proficiency_level
        }));
        } catch (error) {
        console.error('Error getting user skills:', error);
        throw error;
        }
    }

    async updateUserSkills(userId, skillIds) {
        try {
        console.log('💼 Updating user skills:', userId);
        
        const client = this.db.serviceClient;
        
        // Delete existing skills
        await client
            .from('user_skills')
            .delete()
            .eq('user_id', userId);

        // Insert new skills
        if (skillIds.length > 0) {
            const userSkills = skillIds.map(skillId => ({
            user_id: userId,
            skill_id: skillId,
            proficiency_level: 3
            }));

            const { data, error } = await client
            .from('user_skills')
            .insert(userSkills)
            .select();

            if (error) throw error;
            return data;
        }

        return [];
        } catch (error) {
        console.error('Error updating user skills:', error);
        throw error;
        }
    }

    async getUserGoals(userId) {
        try {
        console.log('🎯 Getting user goals:', userId);
        
        const client = this.db.serviceClient;
        const { data, error } = await client
            .from('user_goals')
            .select(`
            goal_id,
            is_completed,
            goals (
                goal_id,
                goal_title,
                goal_description
            )
            `)
            .eq('user_id', userId)
            .eq('is_completed', false)
            .order('goal_id');

        if (error) throw error;

        // Transform to flat structure
        return (data || []).map(item => ({
            goal_id: item.goal_id,
            goal_title: item.goals?.goal_title,
            goal_description: item.goals?.goal_description,
            is_completed: item.is_completed
        }));
        } catch (error) {
        console.error('Error getting user goals:', error);
        throw error;
        }
    }

    async updateUserGoals(userId, goalIds) {
        try {
        console.log('🎯 Updating user goals:', userId);
        
        const client = this.db.serviceClient;
        
        // Delete existing goals
        await client
            .from('user_goals')
            .delete()
            .eq('user_id', userId);

        // Insert new goals
        if (goalIds.length > 0) {
            const userGoals = goalIds.map(goalId => ({
            user_id: userId,
            goal_id: goalId,
            is_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
            }));

            const { data, error } = await client
            .from('user_goals')
            .insert(userGoals)
            .select();

            if (error) throw error;
            return data;
        }

        return [];
        } catch (error) {
        console.error('Error updating user goals:', error);
        throw error;
        }
    }

    async exists(criteria) {
    try {
      // Simple existence check
      if (criteria.id) {
        const profile = await this.getProfile(criteria.id);
        return profile !== null;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}

const userDataService = new UserDataService();
export default userDataService;