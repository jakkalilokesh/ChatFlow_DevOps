const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const notificationController = require('../controllers/notification.controller');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/status/:userId', authMiddleware, asyncHandler(notificationController.getStatus));
router.put('/status', authMiddleware, asyncHandler(notificationController.updateStatus));
router.get('/online-users', authMiddleware, asyncHandler(notificationController.getOnlineUsers));

module.exports = router;
