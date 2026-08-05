const prisma = require('../utils/db');
const logger = require('../utils/logger');

const getNotifications = async (req, res) => {
  try {
    const list = await prisma.notification.findMany({
      where: { receiverId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return res.json(list);
  } catch (error) {
    logger.error('Get notifications error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving notifications.' });
  }
};

const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.notification.update({
      where: { id, receiverId: req.user.id },
      data: { isRead: true }
    });
    return res.json(updated);
  } catch (error) {
    logger.error('Mark notification read error:', error.message);
    return res.status(500).json({ message: 'Server error marking notification as read.' });
  }
};

// Utility function to trigger a notification inside backend actions
const createNotification = async (senderId, receiverId, title, message, type = 'INFO') => {
  try {
    const notif = await prisma.notification.create({
      data: {
        senderId,
        receiverId,
        title,
        message,
        type
      }
    });
    return notif;
  } catch (error) {
    logger.error(`Helper createNotification failed: ${error.message}`);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  createNotification
};
