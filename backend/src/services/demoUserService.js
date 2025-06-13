import supabaseService from './core/supabaseService.js';

class DemoUserService {
  constructor() {
    this.DEMO_USER_EMAIL = 'demo@lumos.test';
    this.DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'; // Fixed UUID
  }

  /**
   * Check if user is the demo user
   */
  isDemoUser(userEmail) {
    return userEmail === this.DEMO_USER_EMAIL;
  }

  /**
   * Reset demo user data - clears everything for fresh onboarding
   */
  async resetDemoUser() {
    try {
      console.log('🔄 Resetting demo user data...');
      
      const client = supabaseService.serviceClient;
      
      // Delete in correct order (respecting foreign keys)
      
      // 1. Delete user module progress
      await client
        .from('user_module_progress')
        .delete()
        .eq('user_id', this.DEMO_USER_ID);
      
      // 2. Delete learning paths
      await client
        .from('user_learning_paths')
        .delete()
        .eq('user_id', this.DEMO_USER_ID);
      
      // 3. Delete user skills
      await client
        .from('user_skills')
        .delete()
        .eq('user_id', this.DEMO_USER_ID);
      
      // 4. Delete user goals
      await client
        .from('user_goals')
        .delete()
        .eq('user_id', this.DEMO_USER_ID);
      
      // 5. Reset profile to incomplete onboarding
      await client
        .from('profiles')
        .upsert({
          id: this.DEMO_USER_ID,
          username: null,
          email: this.DEMO_USER_EMAIL,
          is_employed: null,
          career_stage: null,
          company: null,
          role: null,
          weekly_learning_hours: null,
          preferred_learning_time: null,
          user_type: null,
          bio: null,
          onboarding_complete: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      console.log('✅ Demo user data reset successfully');
      return { success: true, message: 'Demo user reset complete' };
      
    } catch (error) {
      console.error('❌ Error resetting demo user:', error);
      throw error;
    }
  }

  /**
   * Create demo user if it doesn't exist
   */
  async ensureDemoUserExists() {
    try {
      const client = supabaseService.serviceClient;
      
      const { data: existing, error } = await client
        .from('profiles')
        .select('id')
        .eq('id', this.DEMO_USER_ID)
        .single();

      if (!existing) {
        console.log('👤 Creating demo user...');
        
        await client
          .from('profiles')
          .insert({
            id: this.DEMO_USER_ID,
            email: this.DEMO_USER_EMAIL,
            username: 'Demo User',
            onboarding_complete: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        console.log('✅ Demo user created');
      }
      
      return this.DEMO_USER_ID;
    } catch (error) {
      console.error('❌ Error ensuring demo user exists:', error);
      throw error;
    }
  }

  /**
   * Get demo user login info for testing
   */
  getDemoCredentials() {
    return {
      email: this.DEMO_USER_EMAIL,
      password: 'demo123456', // You'll need to create this user in Supabase Auth
      userId: this.DEMO_USER_ID
    };
  }

  /**
   * Auto-reset demo user on login
   */
  async handleDemoUserLogin(userEmail) {
    if (this.isDemoUser(userEmail)) {
      console.log('🎭 Demo user detected, auto-resetting...');
      await this.resetDemoUser();
      return true;
    }
    return false;
  }

  /**
   * Get demo user stats for admin dashboard
   */
  async getDemoUserStats() {
    try {
      const client = supabaseService.serviceClient;
      
      const [profile, skills, goals, learningPath] = await Promise.all([
        client.from('profiles').select('*').eq('id', this.DEMO_USER_ID).single(),
        client.from('user_skills').select('*').eq('user_id', this.DEMO_USER_ID),
        client.from('user_goals').select('*').eq('user_id', this.DEMO_USER_ID),
        client.from('user_learning_paths').select('*').eq('user_id', this.DEMO_USER_ID)
      ]);

      return {
        profile: profile.data,
        skillsCount: skills.data?.length || 0,
        goalsCount: goals.data?.length || 0,
        hasLearningPath: !!learningPath.data,
        onboardingComplete: profile.data?.onboarding_complete || false
      };
    } catch (error) {
      console.error('Error getting demo user stats:', error);
      return null;
    }
  }
}

export default new DemoUserService();