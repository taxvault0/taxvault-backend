const Notification = require('../../modules/notifications/notification.model');

exports.getMyNotifications = async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const page = req.query.page ? Number(req.query.page) : 1;
    const skip = (page - 1) * limit;

    const filter = {
      recipient: req.user._id
    };

    if (req.query.read === 'true') filter.read = true;
    if (req.query.read === 'false') filter.read = false;
    if (req.query.type) filter.type = req.query.type;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('sender', 'name email role')
        .populate('taxCase', 'status assessmentYear')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Notification.countDocuments(filter),

      Notification.countDocuments({
        recipient: req.user._id,
        read: false
      })
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      unreadCount,
      notifications
    });
  } catch (error) {
    console.error('getMyNotifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (String(notification.recipient) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user._id,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    return res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
};












