const express = require('express');
const router = express.Router();

const { protect } = require('../../shared/middleware/auth.middleware');
const notificationController = require('./notification.controller');

router.use(protect);

router.get('/', notificationController.getMyNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;













