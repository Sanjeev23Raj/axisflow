const prisma = require('../utils/db');
const logger = require('../utils/logger');
const { createNotification } = require('./notificationController');

const getAllProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(projects);
  } catch (error) {
    logger.error('Get projects error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving projects.' });
  }
};

const getProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        userStories: {
          include: { tasks: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    return res.json(project);
  } catch (error) {
    logger.error('Get project by ID error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving project details.' });
  }
};

const createProject = async (req, res) => {
  const { title, description, status } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Project title is required.' });
  }

  try {
    const newProject = await prisma.project.create({
      data: {
        title,
        description,
        status: status || 'PLANNING'
      }
    });

    await prisma.activityLog.create({
      data: {
        action: 'PROJECT_CREATED',
        performedBy: req.user.email,
        entityType: 'PROJECT',
        entityId: newProject.id
      }
    });

    // Notify all Team Leaders that a new project has been created by the manager
    const leaders = await prisma.user.findMany({
      where: { role: 'TEAM_LEADER' }
    });

    for (const leader of leaders) {
      await createNotification(
        req.user.id,
        leader.id,
        'New Project Created',
        `Manager ${req.user.name || req.user.email} created project: "${title}"`,
        'INFO'
      );
    }

    logger.info(`Project created: "${title}" by ${req.user.email}`);
    return res.status(201).json(newProject);
  } catch (error) {
    logger.error('Create project error:', error.message);
    return res.status(500).json({ message: 'Server error creating project.' });
  }
};

const updateProject = async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: { title, description, status }
    });

    await prisma.activityLog.create({
      data: {
        action: 'STATUS_UPDATED',
        performedBy: req.user.email,
        entityType: 'PROJECT',
        entityId: id
      }
    });

    logger.info(`Project updated: "${updated.title}" by ${req.user.email}`);
    return res.json(updated);
  } catch (error) {
    logger.error('Update project error:', error.message);
    return res.status(500).json({ message: 'Server error updating project.' });
  }
};

const deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await prisma.project.delete({
      where: { id }
    });

    await prisma.activityLog.create({
      data: {
        action: 'PROJECT_DELETED',
        performedBy: req.user.email,
        entityType: 'PROJECT',
        entityId: id
      }
    });

    logger.info(`Project deleted: "${deleted.title}" by ${req.user.email}`);
    return res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    logger.error('Delete project error:', error.message);
    return res.status(500).json({ message: 'Server error deleting project.' });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
