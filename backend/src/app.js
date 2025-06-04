import dotenv from 'dotenv';

// Load environment variables FIRST, before importing any other modules
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

const PORT = process.env.PORT || 5001;

const app = express();
app.use(cors({
  origin: 'http://localhost:3000', // allow frontend
  credentials: true
}));

app.use(express.json());
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Lumos backend');
});

app.listen(PORT, () => {
  console.log(`Lumos API running on http://localhost:${PORT}`);
});

export default app;
