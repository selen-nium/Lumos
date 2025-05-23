import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

import roadmapRoutes from './routes/roadmapRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const PORT = process.env.PORT || 5001;

const app = express();
app.use(cors({
  origin: 'http://localhost:3000', // allow frontend
  credentials: true
}));

app.use(express.json());
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.send('Lumos backend');
});

app.listen(PORT, () => {
  console.log(`Lumos API running on http://localhost:${PORT}`);
});

export default app;
