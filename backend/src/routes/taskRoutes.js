const express = require('express');
const { getTasksByStory, getMyTasks, createTask, updateTask, deleteTask, getComments, createComment } = require('../controllers/taskController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, getTasksByStory);
router.get('/my', authenticate, getMyTasks);
router.post('/', authenticate, authorize(['MANAGER', 'TEAM_LEADER']), createTask);
router.put('/:id', authenticate, updateTask);
router.delete('/:id', authenticate, authorize(['MANAGER', 'TEAM_LEADER']), deleteTask);

// Comments routes
router.get('/:id/comments', authenticate, getComments);
router.post('/:id/comments', authenticate, createComment);

module.exports = router;
