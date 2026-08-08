const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const { initWorker } = require('./workers/sprintWorker');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Setup CORS middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite Frontend default port
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Route registrations
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/stories', require('./routes/storyRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));

// Root path diagnostic endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start Express server and initialize worker
app.listen(PORT, () => {
  logger.info(`AxisFlow API server running on port ${PORT}`);
  initWorker();
});
