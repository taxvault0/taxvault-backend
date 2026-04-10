const Notification = require('../../modules/notifications/notification.model');

const createNotification = async ({
  recipient,
  sender = null,
  senderRole = 'system',
  taxCase = null,
  type,
  title,
  message,
  data = {},
  channels = { inApp: true, email: false }
}) => {
  if (!recipient || !type || !title || !message) {
    throw new Error('Missing required notification fields');
  }

  const notification = await Notification.create({
    recipient,
    sender,
    senderRole,
    taxCase,
    type,
    title,
    message,
    data,
    channels
  });

  return notification;
};

module.exports = createNotification;












