const TaxCase = require('../../modules/tax/tax-case.model');
const TaxCaseNote = require('./tax-case-note.model');
const createTaxCaseTimelineEvent = require('../../shared/utils/create-tax-case-timeline-event');
const createNotification = require('../../shared/utils/create-notification');

exports.createNote = async (req, res) => {
  try {
    const { taxCaseId } = req.params;
    const { message, type = 'client-message', attachments = [] } = req.body;

    const taxCase = await TaxCase.findById(taxCaseId);

    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    const isClient = String(taxCase.client) === String(userId);
    const isCa = String(taxCase.ca) === String(userId);

    if (!isClient && !isCa && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    if (type === 'internal-note' && role === 'client') {
      return res.status(403).json({
        success: false,
        message: 'Clients cannot create internal notes'
      });
    }

    const note = await TaxCaseNote.create({
      taxCase: taxCaseId,
      author: userId,
      authorRole: role === 'admin' ? 'admin' : role,
      type,
      message: message.trim(),
      attachments
    });

    if (type === 'client-message') {
      await createTaxCaseTimelineEvent({
        taxCase: taxCaseId,
        actor: userId,
        actorRole: role === 'admin' ? 'admin' : role,
        eventType: 'note-added',
        title: 'New message added',
        description: message.trim().substring(0, 100)
      });

      let recipient = null;

      if (role === 'client') {
        recipient = taxCase.ca || null;
      } else if (role === 'ca' || role === 'admin') {
        recipient = taxCase.client || null;
      }

      if (recipient) {
        await createNotification({
          recipient,
          sender: userId,
          senderRole: role === 'admin' ? 'admin' : role,
          taxCase: taxCase._id,
          type: 'new-message',
          title: 'New case message',
          message: message.trim().substring(0, 150),
          data: {
            taxCaseId: taxCase._id,
            noteId: note._id,
            route: `/tax-cases/${taxCase._id}/messages`
          },
          channels: {
            inApp: true,
            email: true
          }
        });
      }
    }

    const populatedNote = await TaxCaseNote.findById(note._id).populate(
      'author',
      'name email role'
    );

    return res.status(201).json({
      success: true,
      note: populatedNote
    });
  } catch (error) {
    console.error('createNote error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create note'
    });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const { taxCaseId } = req.params;

    const taxCase = await TaxCase.findById(taxCaseId);

    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    const isClient = String(taxCase.client) === String(userId);
    const isCa = String(taxCase.ca) === String(userId);

    if (!isClient && !isCa && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const filter = { taxCase: taxCaseId };

    if (role === 'client') {
      filter.type = 'client-message';
    }

    const notes = await TaxCaseNote.find(filter)
      .populate('author', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      notes
    });
  } catch (error) {
    console.error('getNotes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notes'
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user._id || req.user.id;

    const note = await TaxCaseNote.findById(noteId).populate('taxCase');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    const taxCase = note.taxCase;
    const role = req.user.role;

    const isClient = String(taxCase.client) === String(userId);
    const isCa = String(taxCase.ca) === String(userId);

    if (!isClient && !isCa && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (role === 'client' && note.type === 'internal-note') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to read this note'
      });
    }

    const alreadyRead = note.isReadBy.some(
      (entry) => String(entry.user) === String(userId)
    );

    if (!alreadyRead) {
      note.isReadBy.push({
        user: userId,
        readAt: new Date()
      });
      await note.save();
    }

    return res.json({
      success: true,
      message: 'Note marked as read'
    });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark note as read'
    });
  }
};












