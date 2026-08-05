const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../utils/db');
const logger = require('../utils/logger');

const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields (name, email, password, role) are required.' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  // Validate role
  const validRoles = ['MANAGER', 'TEAM_LEADER', 'TEAM_MEMBER'];
  const normalizedRole = role.toUpperCase();
  if (!validRoles.includes(normalizedRole)) {
    return res.status(400).json({ message: 'Invalid role selection.' });
  }

  try {
    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: normalizedRole
      }
    });

    await prisma.activityLog.create({
      data: {
        action: 'USER_REGISTERED',
        performedBy: newUser.email,
        entityType: 'USER',
        entityId: newUser.id
      }
    });

    logger.info(`User registered successfully: ${newUser.email} (${newUser.role})`);

    return res.status(201).json({
      message: 'Registration successful! Please log in.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    logger.error('Registration error:', error.message);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate unique session ID
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes expiration

    // Create database session record
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId,
        role: user.role,
        expiresAt,
        isActive: true
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, sessionId, role: user.role },
      process.env.JWT_SECRET || 'sprintpulse-super-secret-key-123!@#',
      { expiresIn: '20m' }
    );

    // Save to activity log
    await prisma.activityLog.create({
      data: {
        action: 'USER_LOGIN',
        performedBy: user.email,
        entityType: 'USER',
        entityId: user.id
      }
    });

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 20 * 60 * 1000 // 20 minutes
    });

    logger.info(`User logged in: ${user.email} (Role: ${user.role}, Session: ${sessionId})`);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error:', error.message);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

const logout = async (req, res) => {
  try {
    if (req.user && req.user.sessionId) {
      // Invalidate session in DB
      await prisma.userSession.update({
        where: { sessionId: req.user.sessionId },
        data: { isActive: false }
      });

      await prisma.activityLog.create({
        data: {
          action: 'USER_LOGOUT',
          performedBy: req.user.email,
          entityType: 'USER',
          entityId: req.user.id
        }
      });

      logger.info(`User logged out: ${req.user.email}`);
    }

    res.clearCookie('token');
    return res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    logger.error('Logout error:', error.message);
    return res.status(500).json({ message: 'Server error during logout.' });
  }
};

const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  return res.json({ user: req.user });
};

// Manager only endpoint to see all audit login sessions
const getSessions = async (req, res) => {
  try {
    const sessions = await prisma.userSession.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { loginAt: 'desc' },
      take: 50
    });
    return res.json(sessions);
  } catch (error) {
    logger.error('Get sessions error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving session logs.' });
  }
};

// Retrieve all system users (filtered or all) for selection dropdowns
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });
    return res.json(users);
  } catch (error) {
    logger.error('Get all users error:', error.message);
    return res.status(500).json({ message: 'Server error retrieving users list.' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  getSessions,
  getAllUsers
};
