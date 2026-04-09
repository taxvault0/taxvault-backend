const TaxCase = require('../../modules/tax/tax-case.model');
const DocumentRequest = require('../../modules/documents/document-request.model');
const Document = require('../documents/document.model');

exports.getAssignedClientsOverview = async (req, res) => {
  try {
    const taxYear = req.query.taxYear ? Number(req.query.taxYear) : new Date().getFullYear();

    const cases = await TaxCase.find({
      ca: req.user._id,
      taxYear
    })
      .populate('client', 'name email clientId userType province')
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      count: cases.length,
      cases
    });
  } catch (error) {
    console.error('getAssignedClientsOverview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned client overview'
    });
  }
};

exports.getCaseDashboard = async (req, res) => {
  try {
    const taxCase = await TaxCase.findById(req.params.taxCaseId).populate(
      'client',
      'name email clientId userType province'
    );

    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    const allowed =
      String(taxCase.ca) === String(req.user._id) || req.user.role === 'admin';

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this case dashboard'
      });
    }

    const [requests, documents] = await Promise.all([
      DocumentRequest.find({ taxCase: taxCase._id }).sort({ createdAt: -1 }),
      Document.find({ taxCase: taxCase._id }).sort({ uploadedAt: -1 })
    ]);

    const summary = {
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
      taxCase,
      summary,
      requests,
      documents
    });
  } catch (error) {
    console.error('getCaseDashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch case dashboard'
    });
  }
};

exports.getPendingReviewQueue = async (req, res) => {
  try {
    const requests = await DocumentRequest.find({
      ca: req.user._id,
      status: 'uploaded',
      reviewStatus: 'pending'
    })
      .populate('client', 'name email clientId userType')
      .populate('submittedDocument')
      .populate('taxCase', 'taxYear status')
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('getPendingReviewQueue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pending review queue'
    });
  }
};














