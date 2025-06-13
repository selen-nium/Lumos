import dotenv from 'dotenv';
dotenv.config();

// Verify critical environment variables are present
const requiredEnvVars = ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please create a .env file with the required variables.');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

import express from 'express';
import cors from 'cors';
import roadmapRoutes from './routes/roadmapRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import authRoutes from './routes/authRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import learningPathTemplateService from './services/learningPathTemplateService.js';
import ragOrchestrator from './services/ai/ragOrchestrator.js';

const PORT = process.env.PORT || 5001;
const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());


app.use('/api/roadmap', roadmapRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);

app.get('/api/templates/popular', async (req, res) => {
  try {
    const templates = await learningPathTemplateService.getPopularTemplates(10);
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/templates/stats', async (req, res) => {
  try {
    const stats = await ragOrchestrator.getRoadmapGenerationStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/templates/seed', async (req, res) => {
  try {
    await learningPathTemplateService.seedInitialTemplates();
    res.json({ success: true, message: 'Templates seeded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Lumos backend with intelligent roadmap templates');
});

async function initializeServer() {
  try {
    console.log('🚀 Starting Lumos API server...');
    
    // Initialize learning path templates
    console.log('🌱 Initializing learning path templates...');
    await ragOrchestrator.initializeTemplates();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`✅ Lumos API running on http://localhost:${PORT}`);
      console.log('🧠 Intelligent roadmap generation active');
      console.log('📚 Template-based learning paths enabled');
    });
    
    // Log system status
    const healthCheck = await ragOrchestrator.healthCheck();
    console.log('🔍 System health:', healthCheck.status);
    console.log('📊 Templates available:', healthCheck.performance?.templatesAvailable || 0);
    
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();

export default app;