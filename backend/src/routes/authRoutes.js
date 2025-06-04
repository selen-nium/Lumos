import express from 'express';
import { signOutUserById } from '../supabaseAdminClient.js';

const router = express.Router();

router.post('/force-signout/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('➡️ Attempting to sign out user via REST Admin API:', userId);

    await signOutUserById(userId);
    console.log(`✅ User ${userId} signed out`);
    
    res.json({ 
      success: true, 
      message: `User ${userId} signed out server-side` 
    });
  } catch (error) {
    console.error('❌ Forced signout failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;