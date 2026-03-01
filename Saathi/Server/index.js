require('dotenv').config();
const express = require('express');
const config = require('./config');
const cors = require('cors');

// Import routes
const routeRouter = require('./routes/route');
const aiRouter = require('./routes/ai');
const detectRouter = require('./routes/detect');

const app = express();
const PORT = config.port || 3000;

// Middleware (larger limit for /api/detect base64 images)
app.use(express.json({ limit: '15mb' }));
app.use(cors());
app.use('/api/route', routeRouter);
app.use('/api/ai', aiRouter);
app.use('/api/detect', detectRouter);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Saathi server running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});