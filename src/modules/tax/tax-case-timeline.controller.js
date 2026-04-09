const TaxCase = require('../../modules/tax/tax-case.model');
const TaxCaseTimeline = require('../../modules/tax/tax-case-timeline.model');

exports.getTaxCaseTimeline = async (req, res) => {
  try {
    const { taxCaseId } = req.params;

    const taxCase = await TaxCase.findById(taxCaseId);

    if (!taxCase) {
      return res.status(404).json({
        success: false,
        message: 'Tax case not found'
      });
    }

    const isClient = String(taxCase.client) === String(req.user._id || req.user.id);
    const isCa = String(taxCase.ca) === String(req.user._id || req.user.id);

    if (!isClient && !isCa && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this timeline'
      });
    }

    const timeline = await TaxCaseTimeline.find({ taxCase: taxCaseId })
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      timeline
    });
  } catch (error) {
    console.error('getTaxCaseTimeline error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tax case timeline'
    });
  }
};












