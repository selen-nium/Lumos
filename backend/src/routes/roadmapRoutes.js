import express from 'express';
import roadmapBusinessService from '../services/business/roadmapBusinessService.js';
import roadmapDataService from '../services/data/roadmapDataService.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate new roadmap (onboarding)
router.post('/generate', async (req, res) => {
  try {
    const { userId, userToken, profileData } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userId' 
      });
    }

    const result = await roadmapBusinessService.generateRoadmap(userId, userToken, profileData);
    
    res.json({
      success: true,
      message: 'Roadmap generated successfully',
      ...result
    });

  } catch (error) {
    console.error('Roadmap generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate roadmap'
    });
  }
});

// generate advanced roadmap after completion
router.post('/generate-advanced', async (req, res) => {
  try {

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing authorization token. Please log in again.'
      });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Token verification failed:', authError?.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please log in again.'
      });
    }

    const userId = user.id;
    console.log('🚀 Generating advanced roadmap for authenticated user:', userId);

    // Check if user has completed roadmap
    const stats = await roadmapDataService.getRoadmapStats(userId);
    
    if (!stats.hasRoadmap) {
      return res.status(400).json({
        success: false,
        error: 'No roadmap found to build upon'
      });
    }

    if (stats.completionPercentage < 100) {
      return res.status(400).json({
        success: false,
        error: `Please complete your current roadmap first (${stats.completionPercentage}% completed)`
      });
    }

    // Generate advanced roadmap
    const result = await roadmapBusinessService.generateAdvancedRoadmap(userId);
    
    console.log('✅ Advanced roadmap generated successfully');
    
    res.json({
      success: true,
      message: result.message,
      roadmapInfo: result.roadmapInfo
    });

  } catch (error) {
    console.error('❌ Error generating advanced roadmap:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate advanced roadmap'
    });
  }
});

// Get user's roadmap
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await roadmapBusinessService.getUserRoadmap(userId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);

  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch roadmap'
    });
  }
});

// Update module completion
router.post('/module/:moduleId/complete', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { userId, isCompleted } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userId' 
      });
    }

    const result = await roadmapBusinessService.updateModuleCompletion(
      moduleId, 
      userId, 
      isCompleted
    );
    
    res.json(result);

  } catch (error) {
    console.error('Error updating module completion:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update module'
    });
  }
});

// Enhance existing roadmap
router.post('/enhance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await roadmapBusinessService.enhanceRoadmap(userId);
    
    res.json(result);

  } catch (error) {
    console.error('Error enhancing roadmap:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to enhance roadmap'
    });
  }
});

// Get user progress and analytics
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await roadmapBusinessService.getUserProgress(userId);
    
    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error getting user progress:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get progress'
    });
  }
});

// Get personalized recommendations
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'next_steps' } = req.query;
    
    const result = await roadmapBusinessService.getRecommendations(userId, type);
    
    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get recommendations'
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = await roadmapBusinessService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;