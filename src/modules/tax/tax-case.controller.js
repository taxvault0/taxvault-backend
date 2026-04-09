const TaxCase = require('../../modules/tax/tax-case.model');
const CAConnection = require('../ca/ca-connection.model');
const User = require('../auth/user.model');
const createTaxCaseTimelineEvent = require('../../shared/utils/create-tax-case-timeline-event');

// ===============================
// CREATE TAX CASE
// ===============================
exports.createTaxCase = async (req, res) => {
  try {
    const { clientId, taxYear, caseType, dueDate, clientSnapshot } = req.body;

    if (!clientId || !taxYear) {
      return res.status(400).json({
        success: false,
        message: 'clientId and taxYear are required'
      });
    }

    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (client.role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'Selected user is not a client'
      });
    }

    const connection = await CAConnection.findOne({
      user: clientId,
      ca: req.user._id,
      status: 'accepted'
    });

    if (!connection) {
      return res.status(403).json({
        success: false,
        message: 'You do not have an accepted CA connection with this client'
      });
    }

    const existingCase = await TaxCase.findOne({
      client: clientId,
      ca: req.user._id,
      taxYear
    });

    if (existingCase) {
      return res.status(400).json({
        success: false,
        message: 'A tax case already exists for this client and tax year'
      });
    }

    const taxCase = await TaxCase.create({
      client: clientId,
      ca: req.user._id,
      taxYear,
      caseType: caseType || 'individual',
      dueDate,
      clientSnapshot: clientSnapshot || {
        userType: client.userType,
        province: client.province
      }
    });

    await createTaxCaseTimelineEvent({
      taxCase: taxCase._id,
      actor: req.user._id || req.user.id,
      actorRole: req.user.role === 'admin' ? 'admin' : 'ca',
      eventType: 'tax-case-created',
      title: 'Tax case created',
      description: `New tax case created for tax year ${taxCase.taxYear}`
    });

    const populated = await TaxCase.findById(taxCase._id)
      .populate('client', 'name email userType province clientId')
      .populate('ca', 'name email');

    return res.status(201).json({
      success: true,
      taxCase: populated
    });
  } catch (error) {
    console.error('createTaxCase error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create tax case'
    });
  }
};

// ===============================
// GET MY CASES
// ===============================
exports.getMyCases = async (req, res) => {
  try {
    const filter =
      req.user.role === 'ca'
        ? { ca: req.user._id }
        : { client: req.user._id };

    if (req.query.taxYear) {
      filter.taxYear = Number(req.query.taxYear);
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const cases = await TaxCase.find(filter)
      .populate('client', 'name email userType province clientId')
      .populate('ca', 'name email')
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      count: cases.length,
      cases
    });
  } catch (error) {
    console.error('getMyCases error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tax cases'
    });
  }
};

// ===============================
// GET TAX CASE BY ID
// ===============================
exports.getTaxCaseById = async (req, res) => {
  try {
    const taxCase = await TaxCase.findById(req.params.id)
      .populate('client', 'name email userType province clientId')
      .populate('ca', 'name email');

    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    const currentUserId = req.user._id || req.user.id;

    const allowed =
      String(taxCase.client._id) === String(currentUserId) ||
      String(taxCase.ca._id) === String(currentUserId) ||
      req.user.role === 'admin';

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this tax case'
      });
    }

    return res.json({
      success: true,
      taxCase
    });
  } catch (error) {
    console.error('getTaxCaseById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tax case'
    });
  }
};

// ===============================
// UPDATE TAX CASE STATUS (legacy)
// ===============================
exports.updateTaxCaseStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const taxCase = await TaxCase.findById(req.params.id);
    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    if (
      String(taxCase.ca) !== String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned CA can update case status'
      });
    }

    taxCase.status = status || taxCase.status;
    taxCase.lastActivityAt = new Date();
    taxCase.lastCAActivityAt = new Date();

    if (status === 'completed') taxCase.completedAt = new Date();
    if (status === 'cancelled') taxCase.cancelledAt = new Date();

    if (note) {
      taxCase.notes.push({
        text: note,
        createdBy: req.user._id
      });
    }

    await taxCase.save();

    return res.json({
      success: true,
      taxCase
    });
  } catch (error) {
    console.error('updateTaxCaseStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tax case'
    });
  }
};

// ===============================
// ADD NOTE
// ===============================
exports.addCaseNote = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Note text is required'
      });
    }

    const taxCase = await TaxCase.findById(req.params.id);
    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    const currentUserId = req.user._id || req.user.id;

    const allowed =
      String(taxCase.ca) === String(currentUserId) ||
      String(taxCase.client) === String(currentUserId) ||
      req.user.role === 'admin';

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    taxCase.notes.push({
      text,
      createdBy: currentUserId
    });

    taxCase.lastActivityAt = new Date();

    if (req.user.role === 'ca' || req.user.role === 'admin') {
      taxCase.lastCAActivityAt = new Date();
    } else {
      taxCase.lastClientActivityAt = new Date();
    }

    await taxCase.save();

    await createTaxCaseTimelineEvent({
      taxCase: taxCase._id,
      actor: currentUserId,
      actorRole:
        req.user.role === 'admin'
          ? 'admin'
          : req.user.role === 'ca'
          ? 'ca'
          : 'client',
      eventType: 'note-added',
      title: 'Note added',
      description: text
    });

    return res.json({
      success: true,
      notes: taxCase.notes
    });
  } catch (error) {
    console.error('addCaseNote error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add note'
    });
  }
};

// ===============================
// MANUAL STATUS UPDATE (new system)
// ===============================
exports.updateTaxCaseStatusManually = async (req, res) => {
  try {
    const { taxCaseId } = req.params;
    const { status, note } = req.body;

    const allowedStatuses = ['under-review', 'completed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status update'
      });
    }

    const taxCase = await TaxCase.findById(taxCaseId);
    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    const currentUserId = req.user._id || req.user.id;
    const isCa = String(taxCase.ca) === String(currentUserId);

    if (!isCa && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this tax case'
      });
    }

    const previousStatus = taxCase.status;

    taxCase.status = status;
    taxCase.lastActivityAt = new Date();
    taxCase.lastCAActivityAt = new Date();

    if (status === 'completed') taxCase.completedAt = new Date();
    if (status === 'cancelled') taxCase.cancelledAt = new Date();

    await taxCase.save();

    await createTaxCaseTimelineEvent({
      taxCase: taxCase._id,
      actor: currentUserId,
      actorRole: req.user.role === 'admin' ? 'admin' : 'ca',
      eventType:
        status === 'completed'
          ? 'case-completed'
          : status === 'cancelled'
          ? 'case-cancelled'
          : 'status-updated',
      title: `Case status changed to ${status}`,
      description: note || '',
      meta: {
        previousStatus,
        newStatus: status
      }
    });

    return res.json({
      success: true,
      taxCase
    });
  } catch (error) {
    console.error('updateTaxCaseStatusManually error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tax case status'
    });
  }
};












