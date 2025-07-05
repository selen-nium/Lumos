import express from 'express';
import { signOutUserById } from '../supabaseAdminClient.js';
import demoUserService from '../services/demoUserService.js';

const router = express.Router();

// force signout route
// router.post('/force-signout/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;
//     console.log('➡️ Attempting to sign out user via REST Admin API:', userId);

//     await signOutUserById(userId);
//     console.log(`✅ User ${userId} signed out`);
    
//     res.json({ 
//       success: true, 
//       message: `User ${userId} signed out server-side` 
// //     });
// //   } catch (error) {
// //     console.error('❌ Forced signout failed:', error.message);
// //     res.status(500).json({ 
// //       success: false, 
// //       error: error.message 
// //     });
// //   }
// // });

// // Check if user is demo user and handle auto-reset
// router.post('/check-demo-user', 
//   validateEmail('email'),
//   async (req, res) => {
//     try {
//       const { email } = req.body;
      
//       const isDemoUser = demoUserService.isDemoUser(email);
      
//       if (isDemoUser) {
//         console.log('🎭 Demo user detected, resetting data...');
        
//         // Reset demo user data
//         await demoUserService.resetDemoUser();
//         await demoUserService.ensureDemoUserExists();
        
//         console.log('✅ Demo user reset completed');
        
//         return res.json({
//           success: true,
//           isDemoUser: true,
//           message: 'Demo user detected - data reset successfully'
//         });
//       }
      
//       res.json({
//         success: true,
//         isDemoUser: false,
//         message: 'Regular user'
//       });
      
//     } catch (error) {
//       console.error('❌ Demo user check failed:', error.message);
//       res.status(500).json({ 
//         success: false, 
//         error: 'Failed to process demo user check'
//       });
//     }
//   }
// );

// Manual demo user reset (for testing)
router.post('/reset-demo-user', async (req, res) => {
  try {
    console.log('🔄 Manual demo user reset requested...');
    
    await demoUserService.resetDemoUser();
    await demoUserService.ensureDemoUserExists();
    
    res.json({ 
      success: true, 
      message: 'Demo user reset successfully',
      demoCredentials: demoUserService.getDemoCredentials()
    });
  } catch (error) {
    console.error('❌ Demo user reset failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get demo user info
router.get('/demo-info', async (req, res) => {
  try {
    const credentials = demoUserService.getDemoCredentials();
    const stats = await demoUserService.getDemoUserStats();
    
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

// Quick user data reset (admin helper)
// router.post('/reset-user-data/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { adminKey } = req.body;
    
//     // Simple admin check (you can make this more secure)
//     if (adminKey !== 'lumos-admin-2024') {
//       return res.status(403).json({ 
//         success: false, 
//         error: 'Invalid admin key' 
//       });
//     }

//     console.log(`🗑️ Resetting user data for: ${userId}`);
    
//     // Import your data service
//     const { default: dataService } = await import('../services/data/dataService.js');
//     const client = dataService.db.serviceClient;
    
//     // Delete user data in correct order
//     await client.from('user_module_progress').delete().eq('user_id', userId);
//     await client.from('user_learning_paths').delete().eq('user_id', userId);
//     await client.from('user_skills').delete().eq('user_id', userId);
//     await client.from('user_goals').delete().eq('user_id', userId);
    
//     // Reset profile to incomplete onboarding
//     await client
//       .from('profiles')
//       .update({
//         username: null,
//         onboarding_complete: false,
//         is_employed: null,
//         career_stage: null,
//         company: null,
//         role: null,
//         weekly_learning_hours: null,
//         preferred_learning_time: null,
//         user_type: null,
//         bio: null,
//         updated_at: new Date().toISOString()
//       })
//       .eq('id', userId);

//     res.json({ 
//       success: true, 
//       message: `User ${userId} data reset successfully` 
//     });
//   } catch (error) {
//     console.error('❌ User data reset failed:', error.message);
//     res.status(500).json({ 
//       success: false, 
//       error: error.message 
//     });
//   }
// });

export default router;