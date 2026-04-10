const ClientTaxProfile = require('../onboarding/client-tax-profile.model');

exports.getMyTaxProfile = async (req, res) => {
  try {
    const taxYear = req.query.taxYear ? Number(req.query.taxYear) : new Date().getFullYear();

    let profile = await ClientTaxProfile.findOne({
      user: req.user._id,
      taxYear
    });

    if (!profile) {
      profile = await ClientTaxProfile.create({
        user: req.user._id,
        taxYear
      });
    }

    return res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('getMyTaxProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tax profile'
    });
  }
};

exports.upsertMyTaxProfile = async (req, res) => {
  try {
    const { taxYear, ...payload } = req.body;

    if (!taxYear) {
      return res.status(400).json({
        success: false,
        message: 'taxYear is required'
      });
    }

    const allowedFields = [
      'filingStatus',
      'residencyStatus',
      'incomeSources',
      'taxSituations',
      'spouse',
      'dependents',
      'businessDetails',
      'gigPlatforms',
      'notes',
      'completion'
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (payload[field] !== undefined) {
        updates[field] = payload[field];
      }
    });

    const profile = await ClientTaxProfile.findOneAndUpdate(
      { user: req.user._id, taxYear: Number(taxYear) },
      {
        $set: updates,
        $setOnInsert: {
          user: req.user._id,
          taxYear: Number(taxYear)
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    return res.json({
      success: true,
      message: 'Tax profile saved successfully',
      profile
    });
  } catch (error) {
    console.error('upsertMyTaxProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save tax profile'
    });
  }
};












