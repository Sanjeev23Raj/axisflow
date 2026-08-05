const prisma = require('../utils/db');
const logger = require('../utils/logger');
const { createNotification } = require('./notificationController');

const getRecommendations = async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({ message: 'projectId query parameter is required.' });
  }

  try {
    const recommendations = await prisma.capacityRecommendation.findMany({
      where: { projectId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(recommendations);
  } catch (error) {
    logger.error('Get recommendations error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving recommendations.' });
  }
};

const approveRecommendation = async (req, res) => {
  const { id } = req.params;

  try {
    const rec = await prisma.capacityRecommendation.findUnique({ where: { id } });
    if (!rec) {
      return res.status(404).json({ message: 'Recommendation not found.' });
    }

    if (rec.status !== 'PENDING') {
      return res.status(400).json({ message: 'Recommendation is already processed.' });
    }

    // Begin transaction
    const [updatedRec, updatedTask] = await prisma.$transaction([
      prisma.capacityRecommendation.update({
        where: { id },
        data: { status: 'APPROVED' }
      }),
      prisma.task.update({
        where: { id: rec.taskId },
        data: { assignedTo: rec.toDev }
      })
    ]);

    // Send notifications to the new assignee
    const toUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: rec.toDev },
          { name: rec.toDev }
        ]
      }
    });

    if (toUser) {
      await createNotification(
        req.user.id,
        toUser.id,
        'Task Reassigned (Capacity Balance)',
        `Task "${rec.taskTitle}" was reassigned to you by ${req.user.name} to balance team capacity.`,
        'INFO'
      );
    }

    // Send notification to the old assignee
    const fromUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: rec.fromDev },
          { name: rec.fromDev }
        ]
      }
    });

    if (fromUser) {
      await createNotification(
        req.user.id,
        fromUser.id,
        'Task Reassigned',
        `Task "${rec.taskTitle}" was reassigned to ${rec.toDev} to balance team capacity.`,
        'INFO'
      );
    }

    logger.info(`Capacity Recommendation approved: Task ${rec.taskId} moved to ${rec.toDev}`);
    return res.json({ message: 'Recommendation approved and task reassigned.', task: updatedTask });
  } catch (error) {
    logger.error('Approve recommendation error:', error.message);
    return res.status(500).json({ message: 'Server error approving recommendation.' });
  }
};

const rejectRecommendation = async (req, res) => {
  const { id } = req.params;

  try {
    const rec = await prisma.capacityRecommendation.update({
      where: { id },
      data: { status: 'REJECTED' }
    });
    logger.info(`Capacity Recommendation rejected: ${id}`);
    return res.json({ message: 'Recommendation rejected successfully.', recommendation: rec });
  } catch (error) {
    logger.error('Reject recommendation error:', error.message);
    return res.status(500).json({ message: 'Server error rejecting recommendation.' });
  }
};

module.exports = {
  getRecommendations,
  approveRecommendation,
  rejectRecommendation
};
