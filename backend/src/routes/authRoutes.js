const express = require('express');
const { register, login, logout, getMe, getSessions, getAllUsers } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.get('/sessions', authenticate, authorize(['MANAGER']), getSessions);
router.get('/users', authenticate, getAllUsers);

module.exports = router;
