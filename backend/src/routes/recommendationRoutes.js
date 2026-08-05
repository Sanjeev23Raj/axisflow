const express = require('express');
const { getRecommendations, approveRecommendation, rejectRecommendation } = require('../controllers/recommendationController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['MANAGER', 'TEAM_LEADER']), getRecommendations);
router.post('/:id/approve', authenticate, authorize(['MANAGER', 'TEAM_LEADER']), approveRecommendation);
router.post('/:id/reject', authenticate, authorize(['MANAGER', 'TEAM_LEADER']), rejectRecommendation);

module.exports = router;
