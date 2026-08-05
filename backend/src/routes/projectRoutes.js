const express = require('express');
const { getAllProjects, getProjectById, createProject, updateProject, deleteProject } = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, getAllProjects);
router.get('/:id', authenticate, getProjectById);
router.post('/', authenticate, authorize(['MANAGER']), createProject);
router.put('/:id', authenticate, authorize(['MANAGER', 'TEAM_LEADER']), updateProject);
router.delete('/:id', authenticate, authorize(['MANAGER']), deleteProject);

module.exports = router;
