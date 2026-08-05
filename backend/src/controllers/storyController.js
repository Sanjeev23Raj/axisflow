const prisma = require('../utils/db');
const logger = require('../utils/logger');
const { createNotification } = require('./notificationController');

const getStoriesByProject = async (req, res) => {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ message: 'projectId is required.' });
  }

  try {
    let stories = await prisma.userStory.findMany({
      where: { projectId },
      include: { tasks: true },
      orderBy: { title: 'asc' }
    });

    // Enforcement: "that team should not interfere in other works"
    if (req.user.role === 'TEAM_LEADER') {
      // Team Leaders only see stories assigned to them
      stories = stories.filter(s => s.assignedLeader === req.user.name || s.assignedLeader === req.user.email);
    } else if (req.user.role === 'TEAM_MEMBER') {
      // Team Members only see stories that have tasks assigned to them, OR stories assigned to their team leader
      // Bob Leader's team: Charlie, Diana, Fiona, George
      // Ethan Leader's team: Hannah, Ian, Julia, Kevin
      const bobTeam = ['Charlie Member', 'Diana Member', 'Fiona Member', 'George Member', 'bob.leader@sprintpulse.com', 'Bob Leader'];
      const ethanTeam = ['Hannah Member', 'Ian Member', 'Julia Member', 'Kevin Member', 'ethan.leader@sprintpulse.com', 'Ethan Leader'];

      const userIdentifier = req.user.name || req.user.email;
      const isBobTeam = bobTeam.some(name => userIdentifier.toLowerCase().includes(name.toLowerCase().replace(' ', '.')) || userIdentifier.includes(name));
      const isEthanTeam = ethanTeam.some(name => userIdentifier.toLowerCase().includes(name.toLowerCase().replace(' ', '.')) || userIdentifier.includes(name));

      if (isBobTeam) {
        stories = stories.filter(s => s.assignedLeader === 'Bob Leader' || s.assignedLeader === 'bob.leader@sprintpulse.com');
      } else if (isEthanTeam) {
        stories = stories.filter(s => s.assignedLeader === 'Ethan Leader' || s.assignedLeader === 'ethan.leader@sprintpulse.com');
      } else {
        // If not in the preseeded list, only show stories that host at least one task assigned to them
        stories = stories.filter(s => s.tasks.some(t => t.assignedTo === req.user.name || t.assignedTo === req.user.email));
      }
    }

    return res.json(stories);
  } catch (error) {
    logger.error('Get stories error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving user stories.' });
  }
};

const createStory = async (req, res) => {
  const { title, description, priority, status, assignedLeader, deadline, projectId } = req.body;

  if (!title || !projectId) {
    return res.status(400).json({ message: 'Title and projectId are required.' });
  }

  try {
    const newStory = await prisma.userStory.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        status: status || 'TODO',
        assignedLeader: assignedLeader || null,
        deadline: deadline ? new Date(deadline) : null,
        projectId
      }
    });

    await prisma.activityLog.create({
      data: {
        action: 'STORY_ADDED',
        performedBy: req.user.email,
        entityType: 'USER_STORY',
        entityId: newStory.id
      }
    });

    if (assignedLeader) {
      const leaderUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: assignedLeader },
            { name: assignedLeader }
          ],
          role: 'TEAM_LEADER'
        }
      });

      if (leaderUser) {
        await createNotification(
          req.user.id,
          leaderUser.id,
          'User Story Assigned',
          `Manager assigned you the story: "${title}"`,
          'INFO'
        );
      }
    }

    logger.info(`User story created: "${title}" by ${req.user.email}`);
    return res.status(201).json(newStory);
  } catch (error) {
    logger.error('Create story error:', error.message);
    return res.status(500).json({ message: 'Server error creating user story.' });
  }
};

const updateStory = async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, status, assignedLeader, deadline } = req.body;

  try {
    const original = await prisma.userStory.findUnique({ where: { id } });
    if (!original) {
      return res.status(404).json({ message: 'User Story not found.' });
    }

    // Access control: Team Leader can only update stories assigned to them
    if (req.user.role === 'TEAM_LEADER' && original.assignedLeader !== req.user.name && original.assignedLeader !== req.user.email) {
      return res.status(403).json({ message: 'Access Denied. You cannot update stories assigned to another team.' });
    }

    const updated = await prisma.userStory.update({
      where: { id },
      data: {
        title,
        description,
        priority,
        status,
        assignedLeader: assignedLeader !== undefined ? assignedLeader : original.assignedLeader,
        deadline: deadline ? new Date(deadline) : original.deadline
      }
    });

    if (assignedLeader && original.assignedLeader !== assignedLeader) {
      const leaderUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: assignedLeader },
            { name: assignedLeader }
          ],
          role: 'TEAM_LEADER'
        }
      });

      if (leaderUser) {
        await createNotification(
          req.user.id,
          leaderUser.id,
          'User Story Assigned',
          `Manager assigned you the story: "${updated.title}"`,
          'INFO'
        );
      }
    }

    if (status && original.status !== status) {
      await prisma.activityLog.create({
        data: {
          action: 'STATUS_UPDATED',
          performedBy: req.user.email,
          entityType: 'USER_STORY',
          entityId: id
        }
      });

      await checkAndCompleteProject(updated.projectId, req.user.id);
    }

    if (original.priority !== priority) {
      await prisma.activityLog.create({
        data: {
          action: 'PRIORITY_CHANGED',
          performedBy: req.user.email,
          entityType: 'USER_STORY',
          entityId: id
        }
      });
    }

    logger.info(`User story updated: "${updated.title}" by ${req.user.email}`);
    return res.json(updated);
  } catch (error) {
    logger.error('Update story error:', error.message);
    return res.status(500).json({ message: 'Server error updating user story.' });
  }
};

const deleteStory = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await prisma.userStory.delete({
      where: { id }
    });

    await prisma.activityLog.create({
      data: {
        action: 'STORY_DELETED',
        performedBy: req.user.email,
        entityType: 'USER_STORY',
        entityId: id
      }
    });

    logger.info(`User story deleted: "${deleted.title}" by ${req.user.email}`);
    return res.json({ message: 'User story deleted successfully.' });
  } catch (error) {
    logger.error('Delete story error:', error.message);
    return res.status(500).json({ message: 'Server error deleting user story.' });
  }
};

async function checkAndCompleteProject(projectId, actorId) {
  try {
    const stories = await prisma.userStory.findMany({
      where: { projectId },
      include: { tasks: true }
    });

    const allStoriesCompleted = stories.length > 0 && stories.every(s => s.status === 'COMPLETED');
    const allTasksCompleted = stories.every(s => s.tasks.every(t => t.status === 'COMPLETED'));

    if (allStoriesCompleted && allTasksCompleted) {
      const project = await prisma.project.update({
        where: { id: projectId },
        data: { status: 'COMPLETED' }
      });

      const leaderEmails = stories.map(s => s.assignedLeader).filter(Boolean);
      const memberNames = stories.flatMap(s => s.tasks.map(t => t.assignedTo)).filter(Boolean);

      const uniqueEmailsOrNames = [...new Set([...leaderEmails, ...memberNames])];

      const members = await prisma.user.findMany({
        where: {
          OR: [
            { email: { in: uniqueEmailsOrNames } },
            { name: { in: uniqueEmailsOrNames } }
          ]
        }
      });

      const allUsersToNotify = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: members.map(m => m.id) } },
            { role: 'MANAGER' }
          ]
        }
      });

      for (const target of allUsersToNotify) {
        await createNotification(
          actorId,
          target.id,
          'Project Completed',
          `Project "${project.title}" has been automatically completed as all stories and tasks are finished.`,
          'SUCCESS'
        );
      }

      logger.info(`Project automatically completed: "${project.title}"`);
    } else {
      const proj = await prisma.project.findUnique({ where: { id: projectId } });
      if (proj && proj.status === 'COMPLETED') {
        await prisma.project.update({
          where: { id: projectId },
          data: { status: 'ACTIVE' }
        });
      }
    }
  } catch (error) {
    logger.error(`checkAndCompleteProject failed for ${projectId}: ${error.message}`);
  }
}

module.exports = {
  getStoriesByProject,
  createStory,
  updateStory,
  deleteStory,
  checkAndCompleteProject
};
