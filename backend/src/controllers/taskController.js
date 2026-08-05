const prisma = require('../utils/db');
const logger = require('../utils/logger');
const { createNotification } = require('./notificationController');
const { checkAndCompleteProject } = require('./storyController');

const getTasksByStory = async (req, res) => {
  const { storyId } = req.query;

  if (!storyId) {
    return res.status(400).json({ message: 'storyId is required.' });
  }

  try {
    const story = await prisma.userStory.findUnique({ where: { id: storyId } });
    if (!story) {
      return res.status(404).json({ message: 'Story not found.' });
    }

    // Dynamic Team Isolation: "that team should not interfere in other works"
    if (req.user.role === 'TEAM_LEADER' && story.assignedLeader !== req.user.name && story.assignedLeader !== req.user.email) {
      return res.status(403).json({ message: 'Access Denied. Story belongs to another team.' });
    }

    const tasks = await prisma.task.findMany({
      where: { storyId },
      include: { comments: true },
      orderBy: { deadline: 'asc' }
    });
    return res.json(tasks);
  } catch (error) {
    logger.error('Get tasks error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving tasks.' });
  }
};

const getMyTasks = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { assignedTo: req.user.name },
          { assignedTo: req.user.email }
        ]
      },
      include: {
        userStory: {
          include: { project: true }
        },
        comments: true
      },
      orderBy: { deadline: 'asc' }
    });
    return res.json(tasks);
  } catch (error) {
    logger.error('Get my tasks error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving your tasks.' });
  }
};

const createTask = async (req, res) => {
  const { title, description, assignedTo, priority, status, deadline, storyId } = req.body;

  if (!title || !storyId || !deadline) {
    return res.status(400).json({ message: 'Title, storyId, and deadline are required.' });
  }

  // TEAM_MEMBER cannot create tasks
  if (req.user.role === 'TEAM_MEMBER') {
    return res.status(403).json({ message: 'Team members are not allowed to create tasks.' });
  }

  // MANAGER cannot assign tasks directly to Team Members
  if (req.user.role === 'MANAGER' && assignedTo) {
    return res.status(403).json({ message: 'Managers are not allowed to assign tasks directly to Team Members. This must be done by a Team Leader.' });
  }

  try {
    const story = await prisma.userStory.findUnique({ where: { id: storyId } });
    if (!story) {
      return res.status(404).json({ message: 'User Story not found.' });
    }

    // Isolation: Team Leader can only create tasks under stories assigned to them
    if (req.user.role === 'TEAM_LEADER' && story.assignedLeader !== req.user.name && story.assignedLeader !== req.user.email) {
      return res.status(403).json({ message: 'Access Denied. You cannot create tasks for stories assigned to another team.' });
    }

    const newTask = await prisma.task.create({
      data: {
        title,
        description,
        assignedTo: assignedTo || null,
        priority: priority || 'MEDIUM',
        status: status || 'TODO',
        deadline: new Date(deadline),
        storyId
      }
    });

    await prisma.activityLog.create({
      data: {
        action: 'TASK_ASSIGNED',
        performedBy: req.user.email,
        entityType: 'TASK',
        entityId: newTask.id
      }
    });

    if (assignedTo) {
      const assignedUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: assignedTo },
            { name: assignedTo }
          ],
          role: 'TEAM_MEMBER'
        }
      });

      if (assignedUser) {
        await createNotification(
          req.user.id,
          assignedUser.id,
          'Task Assigned',
          `Team Leader assigned you the task: "${title}"`,
          'INFO'
        );
      }
    }

    logger.info(`Task created: "${title}" assigned to "${assignedTo}" by ${req.user.email}`);
    return res.status(201).json(newTask);
  } catch (error) {
    logger.error('Create task error:', error.message);
    return res.status(500).json({ message: 'Server error creating task.' });
  }
};

const updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, assignedTo, priority, status, deadline } = req.body;

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { userStory: true }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Isolation Check: Team Leader cannot edit tasks under stories assigned to another team
    if (req.user.role === 'TEAM_LEADER' && task.userStory.assignedLeader !== req.user.name && task.userStory.assignedLeader !== req.user.email) {
      return res.status(403).json({ message: 'Access Denied. Task belongs to another team.' });
    }

    if (req.user.role === 'MANAGER' && assignedTo && task.assignedTo !== assignedTo) {
      return res.status(403).json({ message: 'Managers are not allowed to assign tasks directly to Team Members. This must be done by a Team Leader.' });
    }

    if (req.user.role === 'TEAM_MEMBER') {
      const isAssigned = task.assignedTo === req.user.name || task.assignedTo === req.user.email;
      if (!isAssigned) {
        return res.status(403).json({ message: 'You can only update tasks assigned to you.' });
      }

      const updated = await prisma.task.update({
        where: { id },
        data: { status, priority }
      });

      await handleTaskStatusNotifications(task, status, req.user);
      return res.json(updated);
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (deadline !== undefined) updateData.deadline = new Date(deadline);

    const updated = await prisma.task.update({
      where: { id },
      data: updateData
    });

    if (assignedTo && task.assignedTo !== assignedTo) {
      const assignedUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: assignedTo },
            { name: assignedTo }
          ],
          role: 'TEAM_MEMBER'
        }
      });

      if (assignedUser) {
        await createNotification(
          req.user.id,
          assignedUser.id,
          'Task Assigned',
          `Reassigned task: "${updated.title}"`,
          'INFO'
        );
      }
    }

    if (status && task.status !== status) {
      await handleTaskStatusNotifications(task, status, req.user);
    }

    logger.info(`Task updated: "${updated.title}" by ${req.user.email}`);
    return res.json(updated);
  } catch (error) {
    logger.error('Update task error:', error.message);
    return res.status(500).json({ message: 'Server error updating task.' });
  }
};

async function handleTaskStatusNotifications(originalTask, newStatus, actor) {
  if (originalTask.status === newStatus) return;

  await prisma.activityLog.create({
    data: {
      action: 'STATUS_UPDATED',
      performedBy: actor.email,
      entityType: 'TASK',
      entityId: originalTask.id
    }
  });

  if (newStatus === 'COMPLETED') {
    const story = await prisma.userStory.findUnique({
      where: { id: originalTask.storyId }
    });

    if (story && story.assignedLeader) {
      const leaderUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: story.assignedLeader },
            { name: story.assignedLeader }
          ],
          role: 'TEAM_LEADER'
        }
      });

      if (leaderUser) {
        await createNotification(
          actor.id,
          leaderUser.id,
          'Task Completed',
          `Team Member marked task "${originalTask.title}" as completed.`,
          'SUCCESS'
        );
      }
    }

    const siblingTasks = await prisma.task.findMany({
      where: { storyId: originalTask.storyId }
    });

    const incompleteSiblings = siblingTasks.filter(t => t.id !== originalTask.id && t.status !== 'COMPLETED');
    if (incompleteSiblings.length === 0) {
      const managers = await prisma.user.findMany({
        where: { role: 'MANAGER' }
      });

      for (const mgr of managers) {
        await createNotification(
          actor.id,
          mgr.id,
          'User Story Completed',
          `All tasks under story "${story.title}" are now completed.`,
          'SUCCESS'
        );
      }
    }

    await checkAndCompleteProject(story.projectId, actor.id);
  }
}

const deleteTask = async (req, res) => {
  const { id } = req.params;

  if (req.user.role === 'TEAM_MEMBER') {
    return res.status(403).json({ message: 'Team members are not allowed to delete tasks.' });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { userStory: true }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Isolation: Team Leader cannot delete tasks belonging to other teams
    if (req.user.role === 'TEAM_LEADER' && task.userStory.assignedLeader !== req.user.name && task.userStory.assignedLeader !== req.user.email) {
      return res.status(403).json({ message: 'Access Denied. Task belongs to another team.' });
    }

    const deleted = await prisma.task.delete({
      where: { id }
    });

    await prisma.activityLog.create({
      data: {
        action: 'TASK_DELETED',
        performedBy: req.user.email,
        entityType: 'TASK',
        entityId: id
      }
    });

    logger.info(`Task deleted: "${deleted.title}" by ${req.user.email}`);
    return res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    logger.error('Delete task error:', error.message);
    return res.status(500).json({ message: 'Server error deleting task.' });
  }
};

const getComments = async (req, res) => {
  const { id } = req.params;
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'asc' }
    });
    return res.json(comments);
  } catch (error) {
    logger.error('Get comments error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving comments.' });
  }
};

const createComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Comment content is required.' });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { userStory: true }
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Isolation: Team Leaders/Members cannot comment on tasks outside of their team/project
    if (req.user.role === 'TEAM_LEADER' && task.userStory.assignedLeader !== req.user.name && task.userStory.assignedLeader !== req.user.email) {
      return res.status(403).json({ message: 'Access Denied.' });
    }
    if (req.user.role === 'TEAM_MEMBER') {
      const isAssigned = task.assignedTo === req.user.name || task.assignedTo === req.user.email;
      if (!isAssigned) {
        return res.status(403).json({ message: 'You can only comment on tasks assigned to you.' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        taskId: id,
        content,
        author: req.user.name || req.user.email
      }
    });

    logger.info(`Comment added to task ${id} by ${req.user.email}`);
    return res.status(201).json(comment);
  } catch (error) {
    logger.error('Create comment error:', error.message);
    return res.status(500).json({ message: 'Server error adding comment.' });
  }
};

module.exports = {
  getTasksByStory,
  getMyTasks,
  createTask,
  updateTask,
  deleteTask,
  getComments,
  createComment
};
