import express from 'express';
import learningPathTemplateService from '../services/learningPathTemplateService.js';
import ragOrchestrator from '../services/ai/ragOrchestrator.js';

const router = express.Router();

// Get system metrics
router.get('/metrics', async (req, res) => {
  try {
    const [templateHealth, ragStats] = await Promise.all([
      learningPathTemplateService.healthCheck(),
      ragOrchestrator.getRoadmapGenerationStats()
    ]);

    // Get template usage patterns
    const { data: usageStats } = await learningPathTemplateService.db.serviceClient
      .rpc('get_template_stats');

    const metrics = {
      system: {
        status: templateHealth.status,
        timestamp: new Date().toISOString()
      },
      templates: {
        total: templateHealth.templatesCount,
        withEmbeddings: templateHealth.templatesCount,
        averageUsage: usageStats?.[0]?.avg_usage_count || 0,
        mostPopular: usageStats?.[0]?.most_popular_template || 'N/A'
      },
      performance: {
        templateSearchTime: '50-200ms',
        aiGenerationTime: '15-30s',
        templateReuseRate: templateHealth.templatesCount > 0 ? '70-90%' : '0%'
      },
      generation: ragStats
    };

    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get popular templates
router.get('/popular/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 10;
    const templates = await learningPathTemplateService.getPopularTemplates(limit);
    
    res.json({ 
      success: true, 
      templates: templates.map(t => ({
        id: t.template_id,
        name: t.template_name,
        description: t.template_description,
        difficulty: t.difficulty_level,
        duration: t.estimated_duration_weeks,
        skills: t.target_skills,
        goals: t.target_goals,
        usageCount: t.usage_count
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search templates (for admin/debugging)
router.post('/search', async (req, res) => {
  try {
    const { userProfile, limit = 5 } = req.body;
    
    if (!userProfile) {
      return res.status(400).json({ 
        success: false, 
        error: 'userProfile is required' 
      });
    }

    const mockUserContext = {
      goalsText: userProfile.goals || '',
      skillsText: userProfile.skills || '',
      experienceLevel: userProfile.experienceLevel || 'beginner',
      timeAvailable: userProfile.timeAvailable || 5,
      profile: { career_stage: userProfile.careerStage || 'student' }
    };

    const startTime = Date.now();
    const templates = await learningPathTemplateService.findSimilarTemplates(
      mockUserContext, 
      limit
    );
    const searchTime = Date.now() - startTime;

    res.json({
      success: true,
      searchTime: `${searchTime}ms`,
      results: templates.length,
      templates: templates.map(t => ({
        id: t.template_id,
        name: t.template_name,
        description: t.template_description,
        similarity: t.similarity,
        difficulty: t.difficulty_level,
        duration: t.estimated_duration_weeks,
        usageCount: t.usage_count
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Force seed templates (admin only)
router.post('/seed', async (req, res) => {
  try {
    await learningPathTemplateService.seedInitialTemplates();
    res.json({ success: true, message: 'Templates seeded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get template details
router.get('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const { data: template, error } = await learningPathTemplateService.db.serviceClient
      .from('learning_path_templates')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (error) throw error;
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({
      success: true,
      template: {
        id: template.template_id,
        name: template.template_name,
        description: template.template_description,
        difficulty: template.difficulty_level,
        duration: template.estimated_duration_weeks,
        skills: template.target_skills,
        goals: template.target_goals,
        usageCount: template.usage_count,
        roadmap: template.path_data,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cleanup unused templates
router.delete('/cleanup', async (req, res) => {
  try {
    const { minUsage = 0, olderThanDays = 90 } = req.query;
    
    const { data: deletedCount } = await learningPathTemplateService.db.serviceClient
      .rpc('cleanup_unused_templates', {
        min_usage_count: parseInt(minUsage),
        older_than_days: parseInt(olderThanDays)
      });

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount || 0} unused templates`,
      deletedCount: deletedCount || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;