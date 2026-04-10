const TaxCase = require('../tax/tax-case.model');
const DocumentRequest = require('./document-request.model');
const Document = require('./document.model');
const CAConnection = require('../ca/ca-connection.model');
const createNotification = require('../../shared/utils/create-notification');
const updateTaxCaseStatus = require('../../shared/utils/update-tax-case-status');
const createTaxCaseTimelineEvent = require('../../shared/utils/create-tax-case-timeline-event');

// ===============================
// CREATE DOCUMENT REQUEST
// ===============================
exports.createDocumentRequest = async (req, res) => {
  try {
    const {
      taxCaseId,
      title,
      description,
      documentType,
      requiredFor,
      priority,
      dueDate,
      noteToClient
    } = req.body;

    if (!taxCaseId || !title) {
      return res.status(400).json({
        success: false,
        message: 'taxCaseId and title are required'
      });
    }

    const taxCase = await TaxCase.findById(taxCaseId).populate('client ca');

    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    const isAuthorized =
      String(taxCase.ca._id || taxCase.ca) === String(req.user._id) ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const connection = await CAConnection.findOne({
      user: taxCase.client,
      ca: taxCase.ca,
      status: 'accepted'
    });

    if (!connection) {
      return res.status(403).json({
        success: false,
        message: 'CA connection not active'
      });
    }

    const request = await DocumentRequest.create({
      taxCase: taxCase._id,
      client: taxCase.client,
      ca: taxCase.ca,
      taxYear: taxCase.taxYear,
      documentType,
      title,
      description,
      requiredFor: requiredFor || 'client',
      priority: priority || 'medium',
      dueDate,
      noteToClient
    });

    await createNotification({
      recipient: taxCase.client,
      sender: req.user._id,
      senderRole: req.user.role === 'admin' ? 'admin' : 'ca',
      taxCase: taxCase._id,
      type: 'document-request-created',
      title: 'New document requested',
      message: `Your CA requested: ${title}`,
      data: {
        taxCaseId: taxCase._id,
        documentRequestId: request._id,
        route: `/tax-cases/${taxCase._id}`
      },
      channels: {
        inApp: true,
        email: true
      }
    });

    await createTaxCaseTimelineEvent({
      taxCase: taxCase._id,
      actor: req.user._id || req.user.id,
      actorRole: req.user.role === 'admin' ? 'admin' : 'ca',
      eventType: 'document-request-created',
      title: 'Document requested',
      description: `Requested document: ${request.title}`,
      meta: {
        documentRequestId: request._id
      }
    });

    await updateTaxCaseStatus(taxCase._id);

    return res.status(201).json({
      success: true,
      request
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create request'
    });
  }
};

// ===============================
// GET REQUESTS FOR CASE
// ===============================
exports.getRequestsForCase = async (req, res) => {
  try {
    const { taxCaseId } = req.params;

    const taxCase = await TaxCase.findById(taxCaseId);
    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    const allowed =
      String(taxCase.ca) === String(req.user._id) ||
      String(taxCase.client) === String(req.user._id) ||
      req.user.role === 'admin';

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const requests = await DocumentRequest.find({ taxCase: taxCaseId })
      .populate('submittedDocument')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch requests'
    });
  }
};

// ===============================
// CLIENT SUBMITS DOCUMENT
// ===============================
exports.submitRequestedDocument = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { documentId } = req.body;

    const request = await DocumentRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (String(request.client) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (String(document.user) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Document does not belong to you'
      });
    }

    request.submittedDocument = document._id;
    request.status = 'uploaded';
    request.reviewStatus = 'pending';
    request.fulfilledAt = new Date();

    await request.save();

    document.documentRequest = request._id;
    document.verificationStatus = 'pending';
    await document.save();

    await createNotification({
      recipient: request.ca,
      sender: req.user._id,
      senderRole: req.user.role === 'admin' ? 'admin' : 'client',
      taxCase: request.taxCase,
      type: 'document-uploaded',
      title: 'Document uploaded',
      message: `Client uploaded: ${document.fileName}`,
      data: {
        taxCaseId: request.taxCase,
        documentId: document._id,
        documentRequestId: request._id,
        route: `/tax-cases/${request.taxCase}`
      },
      channels: {
        inApp: true,
        email: true
      }
    });

    await createTaxCaseTimelineEvent({
      taxCase: request.taxCase,
      actor: req.user._id || req.user.id,
      actorRole: req.user.role === 'admin' ? 'admin' : 'client',
      eventType: 'document-uploaded',
      title: 'Document uploaded',
      description: `Uploaded file: ${document.fileName}`,
      meta: {
        documentId: document._id,
        documentRequestId: request._id
      }
    });

    await updateTaxCaseStatus(request.taxCase);

    return res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Upload failed'
    });
  }
};

// ===============================
// CA REVIEWS DOCUMENT
// ===============================
exports.reviewRequestedDocument = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, comment } = req.body;

    const request = await DocumentRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (String(request.ca) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!request.submittedDocument) {
      return res.status(400).json({
        success: false,
        message: 'No document submitted'
      });
    }

    const document = await Document.findById(request.submittedDocument);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Submitted document not found'
      });
    }

    if (action === 'verify') {
      request.status = 'fulfilled';
      request.reviewStatus = 'verified';
      request.verifiedAt = new Date();

      document.verificationStatus = 'verified';
      document.verifiedBy = req.user._id;
      document.verifiedAt = new Date();
    } else if (action === 'reject') {
      request.status = 'needs-info';
      request.reviewStatus = 'rejected';
      request.rejectedAt = new Date();

      document.verificationStatus = 'rejected';
      document.rejectedAt = new Date();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }

    if (comment) {
      request.comments = request.comments || [];
      request.comments.push({
        text: comment,
        createdBy: req.user._id
      });
    }

    await Promise.all([request.save(), document.save()]);

    await createNotification({
      recipient: request.client,
      sender: req.user._id,
      senderRole: req.user.role === 'admin' ? 'admin' : 'ca',
      taxCase: request.taxCase,
      type: action === 'verify' ? 'document-verified' : 'document-rejected',
      title: action === 'verify' ? 'Document verified' : 'Document rejected',
      message:
        action === 'verify'
          ? `${document.fileName} has been verified`
          : comment || `${document.fileName} was rejected. Please review and re-upload.`,
      data: {
        taxCaseId: request.taxCase,
        documentId: document._id,
        documentRequestId: request._id,
        route: `/tax-cases/${request.taxCase}`
      },
      channels: {
        inApp: true,
        email: true
      }
    });

    await createTaxCaseTimelineEvent({
      taxCase: request.taxCase,
      actor: req.user._id || req.user.id,
      actorRole: req.user.role === 'admin' ? 'admin' : 'ca',
      eventType: action === 'verify' ? 'document-verified' : 'document-rejected',
      title: action === 'verify' ? 'Document verified' : 'Document rejected',
      description:
        action === 'verify'
          ? `${document.fileName} was verified`
          : `${document.fileName} was rejected`,
      meta: {
        documentId: document._id,
        documentRequestId: request._id
      }
    });

    await updateTaxCaseStatus(request.taxCase);

    return res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Review failed'
    });
  }
};













