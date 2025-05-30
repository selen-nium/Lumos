import express from 'express';
import { signOutUserById } from '../supabaseAdminClient.js';

const router = express.Router();

router.post('/force-signout/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log('➡️ Attempting to sign out user via REST Admin API:', userId);

  try {
    await signOutUserById(userId);
    console.log(`✅ User ${userId} signed out`);
    res.json({ success: true, message: `User ${userId} signed out server-side` });
  } catch (err) {
    console.error('❌ Forced signout failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
