const express = require('express');
const { getReportsByProject, triggerReportGeneration } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['MANAGER', 'TEAM_LEADER']), getReportsByProject);
router.post('/trigger', authenticate, authorize(['MANAGER', 'TEAM_LEADER']), triggerReportGeneration);

module.exports = router;
