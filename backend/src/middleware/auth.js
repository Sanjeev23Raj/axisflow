const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(419).json({ message: 'Authentication token missing. Session expired.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'axisflow-super-secret-key-123!@#');
    
    // Check session in SQLite database
    const session = await prisma.userSession.findUnique({
      where: { sessionId: decoded.sessionId },
      include: { user: true }
    });

    if (!session || !session.isActive) {
      return res.status(419).json({ message: 'Session is inactive or terminated.' });
    }

    if (new Date() > new Date(session.expiresAt)) {
      // Mark as inactive in DB
      await prisma.userSession.update({
        where: { sessionId: decoded.sessionId },
        data: { isActive: false }
      });
      res.clearCookie('token');
      return res.status(419).json({ message: 'Session has expired.' });
    }

    // Extend session expiry (sliding window of 20 minutes)
    const newExpiry = new Date(Date.now() + 20 * 60 * 1000);
    await prisma.userSession.update({
      where: { sessionId: decoded.sessionId },
      data: { expiresAt: newExpiry }
    });

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      sessionId: session.sessionId
    };

    next();
  } catch (error) {
    logger.error('Authentication verification error:', error.message);
    res.clearCookie('token');
    return res.status(419).json({ message: 'Invalid or expired token.' });
  }
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden. Role '${req.user.role}' does not have access.` });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
