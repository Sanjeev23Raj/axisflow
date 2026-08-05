const express = require('express');
const { getDashboardMetrics } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticate, getDashboardMetrics);

module.exports = router;
