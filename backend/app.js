import express from 'express';

import { PORT } from './config/env.js'
const app = express();

app.get('/', (req, res) => {
  res.send('Lumos backend')
})

app.listen(PORT, () => {
  console.log(`Lumos API running on http://localhost:${PORT}`);
});

export default app;