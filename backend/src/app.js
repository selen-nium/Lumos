import dotenv from 'dotenv';
dotenv.config();

// check env variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}
console.log('✅ Environment variables loaded successfully');

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit'

// routes
import roadmapRoutes from './routes/roadmapRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import authRoutes from './routes/authRoutes.js';
import templateRoutes from './routes/templateRoutes.js';

// services
import ragOrchestrator from './services/ai/ragOrchestrator.js';

// error handling
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const PORT = process.env.PORT || 5001;
const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter)

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourapp.com'] // production domain to be replaced
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ 
  limit: '1mb',
  strict: true
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '1mb' 
}));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

app.use('/api/roadmap', roadmapRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);

app.use(notFoundHandler);  // Handle 404s
app.use(errorHandler);     // Handle all other errors

app.get('/', (req, res) => {
  res.send('Lumos backend');
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