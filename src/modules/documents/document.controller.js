const fs = require('fs');
const path = require('path');
const Document = require('./document.model');
const TaxCase = require('../tax/tax-case.model');
const DocumentRequest = require('./document-request.model');

exports.getMyDocuments = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'user') {
      filter.user = req.user._id;
    } else if (req.user.role === 'ca') {
      if (!req.query.clientId) {
        return res.status(400).json({
          success: false,
          message: 'clientId is required for CA document lookup'
        });
      }
      filter.user = req.query.clientId;
    }

    if (req.query.taxYear) filter.taxYear = Number(req.query.taxYear);
    if (req.query.documentType) filter.documentType = req.query.documentType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.taxCaseId) filter.taxCase = req.query.taxCaseId;

    const documents = await Document.find(filter)
      .populate('user', 'name email clientId userType')
      .populate('uploadedBy', 'name email role')
      .populate('verifiedBy', 'name email role')
      .populate('taxCase', 'taxYear status caseType')
      .populate('documentRequest', 'title documentType status reviewStatus')
      .sort({ uploadedAt: -1 });

    return res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    console.error('getMyDocuments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const {
      documentType,
      taxYear,
      taxCaseId,
      documentRequestId,
      description,
      title,
      amount,
      taxWithheld
    } = req.body;

    if (!documentType || !taxYear) {
      return res.status(400).json({
        success: false,
        message: 'documentType and taxYear are required'
      });
    }

    let taxCase = null;
    if (taxCaseId) {
      taxCase = await TaxCase.findById(taxCaseId);
      if (!taxCase) {
        return res.status(404).json({
          success: false,
          message: 'Tax case not found'
        });
      }

      const allowed =
        String(taxCase.client) === String(req.user._id) ||
        String(taxCase.ca) === String(req.user._id) ||
        req.user.role === 'admin';

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to upload to this tax case'
        });
      }
    }

    let documentRequest = null;
    if (documentRequestId) {
      documentRequest = await DocumentRequest.findById(documentRequestId);
      if (!documentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Document request not found'
        });
      }
    }

    const relativeFilePath = req.file.path.replace(/\\/g, '/');
    const relativeThumbPath = req.file.thumbnail
      ? req.file.thumbnail.replace(/\\/g, '/')
      : null;

    const document = await Document.create({
      user: req.user.role === 'user' ? req.user._id : (taxCase ? taxCase.client : req.user._id),
      uploadedBy: req.user._id,
      taxCase: taxCase ? taxCase._id : undefined,
      documentRequest: documentRequest ? documentRequest._id : undefined,
      documentType,
      taxYear: Number(taxYear),
      title: title || req.file.originalname,
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      fileUrl: `/${relativeFilePath}`,
      fileKey: req.file.filename,
      thumbnailUrl: relativeThumbPath ? `/${relativeThumbPath}` : null,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      description,
      amount: amount ? Number(amount) : undefined,
      taxWithheld: taxWithheld ? Number(taxWithheld) : undefined,
      status: 'uploaded'
    });

    if (documentRequest && req.user.role === 'user') {
      documentRequest.submittedDocument = document._id;
      documentRequest.status = 'uploaded';
      documentRequest.reviewStatus = 'pending';
      documentRequest.fulfilledAt = new Date();
      await documentRequest.save();
    }

    if (taxCase) {
      if (req.user.role === 'user') {
        taxCase.lastClientActivityAt = new Date();
      } else if (req.user.role === 'ca') {
        taxCase.lastCAActivityAt = new Date();
      }
      await taxCase.save();
      await taxCase.recalculateChecklistSummary();
    }

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('uploadDocument error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('user', 'name email clientId userType')
      .populate('uploadedBy', 'name email role')
      .populate('verifiedBy', 'name email role')
      .populate('taxCase', 'taxYear status caseType client ca')
      .populate('documentRequest', 'title documentType status reviewStatus');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const allowed =
      String(document.user._id || document.user) === String(req.user._id) ||
      String(document.uploadedBy?._id || document.uploadedBy) === String(req.user._id) ||
      (document.taxCase &&
        (String(document.taxCase.client) === String(req.user._id) ||
          String(document.taxCase.ca) === String(req.user._id))) ||
      req.user.role === 'admin';

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this document'
      });
    }

    return res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('getDocumentById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch document'
    });
  }
};

exports.reviewDocument = async (req, res) => {
  try {
    const { action, note, rejectionReason } = req.body;

    const document = await Document.findById(req.params.id).populate('taxCase');
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const canReview =
      req.user.role === 'admin' ||
      (req.user.role === 'ca' &&
        document.taxCase &&
        String(document.taxCase.ca) === String(req.user._id));

    if (!canReview) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned CA can review this document'
      });
    }

    if (action === 'verify') {
      document.status = 'verified';
      document.verifiedBy = req.user._id;
      document.verifiedAt = new Date();
      document.rejectionReason = undefined;
    } else if (action === 'reject') {
      document.status = 'rejected';
      document.verifiedBy = req.user._id;
      document.verifiedAt = new Date();
      document.rejectionReason = rejectionReason || 'Document rejected';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Action must be verify or reject'
      });
    }

    if (note) {
      document.notes.push({
        text: note,
        createdBy: req.user._id,
        createdAt: new Date()
      });
    }

    await document.save();

    if (document.documentRequest) {
      const request = await DocumentRequest.findById(document.documentRequest);
      if (request) {
        if (action === 'verify') {
          request.status = 'fulfilled';
          request.reviewStatus = 'verified';
          request.verifiedAt = new Date();
        } else {
          request.status = 'needs-info';
          request.reviewStatus = 'rejected';
          request.rejectedAt = new Date();
        }

        if (note) {
          request.comments.push({
            text: note,
            createdBy: req.user._id,
            createdAt: new Date()
          });
        }

        await request.save();
      }
    }

    if (document.taxCase) {
      const taxCase = await TaxCase.findById(document.taxCase._id || document.taxCase);
      if (taxCase) {
        taxCase.lastCAActivityAt = new Date();
        await taxCase.save();
        await taxCase.recalculateChecklistSummary();
      }
    }

    return res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('reviewDocument error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to review document'
    });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const allowed =
      String(document.user) === String(req.user._id) ||
      String(document.uploadedBy) === String(req.user._id) ||
      req.user.role === 'admin';

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this document'
      });
    }

    const filePath = path.join(process.cwd(), document.fileUrl.replace(/^\//, ''));
    const thumbPath = document.thumbnailUrl
      ? path.join(process.cwd(), document.thumbnailUrl.replace(/^\//, ''))
      : null;

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (thumbPath && fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }

    if (document.documentRequest) {
      const request = await DocumentRequest.findById(document.documentRequest);
      if (request && String(request.submittedDocument) === String(document._id)) {
        request.submittedDocument = undefined;
        request.status = 'open';
        request.reviewStatus = 'pending';
        request.fulfilledAt = undefined;
        await request.save();
      }
    }

    const taxCaseId = document.taxCase;
    await document.deleteOne();

    if (taxCaseId) {
      const taxCase = await TaxCase.findById(taxCaseId);
      if (taxCase) {
        await taxCase.recalculateChecklistSummary();
      }
    }

    return res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('deleteDocument error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
};













