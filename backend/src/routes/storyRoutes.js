const express = require('express');
const { getStoriesByProject, createStory, updateStory, deleteStory } = require('../controllers/storyController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, getStoriesByProject);
router.post('/', authenticate, authorize(['MANAGER', 'TEAM_LEADER']), createStory);
router.put('/:id', authenticate, authorize(['MANAGER', 'TEAM_LEADER']), updateStory);
router.delete('/:id', authenticate, authorize(['MANAGER']), deleteStory);

module.exports = router;
