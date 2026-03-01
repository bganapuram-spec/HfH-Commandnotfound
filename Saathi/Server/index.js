require('dotenv').config();
const express = require('express');
const config = require('./config');
const cors = require('cors');

// Import routes
const routeRouter = require('./routes/route'); // your /api/route
const aiRouter = require('./routes/ai');       // your /api/ai

const app = express();
const PORT = config.port || 3000;

// Middleware
app.use(express.json());
app.use(cors());
// Mount routes
app.use('/api/route', routeRouter); // <- uncommented and mounted correctly
app.use('/api/ai', aiRouter);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Saathi server running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});