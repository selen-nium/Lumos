import express from 'express';
import demoUserService from '../services/demoUserService.js';
import supabaseService from '../services/core/supabaseService.js';

const router = express.Router();

// Reset demo user data
router.post('/reset-demo-user', async (req, res) => {
  try {
    const result = await demoUserService.resetDemoUser();
    res.json({ 
      success: true, 
      message: 'Demo user reset successfully',
      demoCredentials: demoUserService.getDemoCredentials()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get demo user info
router.get('/demo-user-info', async (req, res) => {
  try {
    const stats = await demoUserService.getDemoUserStats();
    const credentials = demoUserService.getDemoCredentials();
    
    res.json({
      success: true,
      demoUser: {
        ...credentials,
        stats
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Reset any user's data (admin only - be careful!)
router.post('/reset-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Add admin check here if needed
    if (!req.headers.authorization?.includes('admin-secret-key')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    console.log(`🗑️ Resetting user data for: ${userId}`);
    
    const client = supabaseService.serviceClient;
    
    // Delete user data in correct order
    await client.from('user_module_progress').delete().eq('user_id', userId);
    await client.from('user_learning_paths').delete().eq('user_id', userId);
    await client.from('user_skills').delete().eq('user_id', userId);
    await client.from('user_goals').delete().eq('user_id', userId);
    
    // Reset profile
    await client
      .from('profiles')
      .update({
        username: null,
        onboarding_complete: false,
        is_employed: null,
        career_stage: null,
        company: null,
        role: null,
        weekly_learning_hours: null,
        preferred_learning_time: null,
        user_type: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    res.json({ 
      success: true, 
      message: `User ${userId} data reset successfully` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Quick database cleanup
router.post('/cleanup-test-data', async (req, res) => {
  try {
    // Add admin check
    if (!req.headers.authorization?.includes('admin-secret-key')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    const client = supabaseService.serviceClient;
    
    // Delete test users (emails containing 'test' or 'demo')
    const { data: testUsers } = await client
      .from('profiles')
      .select('id, email')
      .or('email.ilike.%test%,email.ilike.%demo%,username.ilike.%test%');

    let deletedCount = 0;
    for (const user of testUsers || []) {
      if (user.id !== demoUserService.DEMO_USER_ID) { // Preserve main demo user
        await client.from('user_module_progress').delete().eq('user_id', user.id);
        await client.from('user_learning_paths').delete().eq('user_id', user.id);
        await client.from('user_skills').delete().eq('user_id', user.id);
        await client.from('user_goals').delete().eq('user_id', user.id);
        await client.from('profiles').delete().eq('id', user.id);
        deletedCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `Cleaned up ${deletedCount} test users` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get system stats for admin
router.get('/system-stats', async (req, res) => {
  try {
    const client = supabaseService.serviceClient;
    
    const [usersCount, pathsCount, templatesCount] = await Promise.all([
      client.from('profiles').select('id', { count: 'exact', head: true }),
      client.from('user_learning_paths').select('id', { count: 'exact', head: true }),
      client.from('learning_path_templates').select('id', { count: 'exact', head: true })
    ]);

    const stats = {
      totalUsers: usersCount.count,
      totalLearningPaths: pathsCount.count,
      totalTemplates: templatesCount.count,
      demoUser: await demoUserService.getDemoUserStats(),
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;