const TaxCase = require('../../modules/tax/tax-case.model');
const DocumentRequest = require('../../modules/documents/document-request.model');
const Document = require('../documents/document.model');
const ClientTaxProfile = require('../onboarding/client-tax-profile.model');

exports.getMyCaseDashboard = async (req, res) => {
  try {
    const taxYear = req.query.taxYear ? Number(req.query.taxYear) : new Date().getFullYear();

    const [taxCase, requests, documents, taxProfile] = await Promise.all([
      TaxCase.findOne({ client: req.user._id, taxYear })
        .populate('ca', 'name email clientId phoneNumber')
        .sort({ updatedAt: -1 }),

      DocumentRequest.find({ client: req.user._id, taxYear }).sort({ createdAt: -1 }),

      Document.find({ user: req.user._id, taxYear }).sort({ uploadedAt: -1 }),

      ClientTaxProfile.findOne({ user: req.user._id, taxYear })
    ]);

    const summary = {
      hasActiveCase: !!taxCase,
      totalRequests: requests.length,
      openRequests: requests.filter((r) => r.status === 'open').length,
      uploadedRequests: requests.filter((r) => r.status === 'uploaded').length,
      fulfilledRequests: requests.filter((r) => r.status === 'fulfilled').length,
      needsInfoRequests: requests.filter((r) => r.status === 'needs-info').length,
      totalDocuments: documents.length,
      verifiedDocuments: documents.filter((d) => d.status === 'verified').length,
      rejectedDocuments: documents.filter((d) => d.status === 'rejected').length,
      uploadedDocuments: documents.filter((d) => d.status === 'uploaded').length
    };

    return res.json({
      success: true,
      taxYear,
      summary,
      taxCase,
      taxProfile,
      recentRequests: requests.slice(0, 10),
      recentDocuments: documents.slice(0, 10)
    });
  } catch (error) {
    console.error('getMyCaseDashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch client dashboard'
    });
  }
};

exports.getMyCases = async (req, res) => {
  try {
    const filter = { client: req.user._id };

    if (req.query.taxYear) filter.taxYear = Number(req.query.taxYear);
    if (req.query.status) filter.status = req.query.status;

    const cases = await TaxCase.find(filter)
      .populate('ca', 'name email phoneNumber')
      .sort({ taxYear: -1, updatedAt: -1 });

    return res.json({
      success: true,
      count: cases.length,
      cases
    });
  } catch (error) {
    console.error('getMyCases error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch client cases'
    });
  }
};

exports.getMyChecklist = async (req, res) => {
  try {
    const taxYear = req.query.taxYear ? Number(req.query.taxYear) : new Date().getFullYear();

    const requests = await DocumentRequest.find({
      client: req.user._id,
      taxYear
    })
      .populate('submittedDocument')
      .sort({ priority: -1, createdAt: -1 });

    const grouped = {
      open: requests.filter((r) => r.status === 'open'),
      uploaded: requests.filter((r) => r.status === 'uploaded'),
      needsInfo: requests.filter((r) => r.status === 'needs-info'),
      fulfilled: requests.filter((r) => r.status === 'fulfilled'),
      cancelled: requests.filter((r) => r.status === 'cancelled')
    };

    return res.json({
      success: true,
      taxYear,
      count: requests.length,
      grouped,
      requests
    });
  } catch (error) {
    console.error('getMyChecklist error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch checklist'
    });
  }
};

exports.getMyCaseById = async (req, res) => {
  try {
    const taxCase = await TaxCase.findById(req.params.caseId)
      .populate('ca', 'name email phoneNumber')
      .populate('notes.createdBy', 'name email role');

    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    if (String(taxCase.client) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this case'
      });
    }

    const [requests, documents, taxProfile] = await Promise.all([
      DocumentRequest.find({ taxCase: taxCase._id }).populate('submittedDocument').sort({ createdAt: -1 }),
      Document.find({ taxCase: taxCase._id }).sort({ uploadedAt: -1 }),
      ClientTaxProfile.findOne({ user: req.user._id, taxYear: taxCase.taxYear })
    ]);

    return res.json({
      success: true,
      taxCase,
      taxProfile,
      requests,
      documents
    });
  } catch (error) {
    console.error('getMyCaseById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch case details'
    });
  }
};












