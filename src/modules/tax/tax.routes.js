const express = require('express');
const router = express.Router();
const { protect } = require('../../shared/middleware/auth.middleware');
const taxUtils = require('../../shared/utils/tax-utils');

// @desc    Get tax information for user's province
// @route   GET /api/tax/info
router.get('/info', protect, (req, res) => {
  try {
    const province = req.user.province;
    
    const taxInfo = {
      province,
      taxType: taxUtils.getTaxType(province),
      displayRate: taxUtils.getTaxDisplayString(province),
      provincialRate: taxUtils.getProvincialTaxRate(province),
      federalRate: 0.05,
      agency: taxUtils.getTaxAgency(province),
      requiresSeparateFiling: taxUtils.requiresSeparateFiling(province),
      businessNumberFormat: taxUtils.getBusinessNumberFormat(province),
      filingDeadlines: taxUtils.getFilingDeadline(province, req.user.filingFrequency)
    };
    
    res.json({
      success: true,
      data: taxInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tax information'
    });
  }
});

// @desc    Calculate tax for an amount
// @route   POST /api/tax/calculate
router.post('/calculate', protect, (req, res) => {
  try {
    const { amount } = req.body;
    const province = req.user.province;
    
    const calculation = taxUtils.calculateTaxes(amount, province);
    
    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error calculating tax'
    });
  }
});

// @desc    Validate business number
// @route   POST /api/tax/validate-bn
router.post('/validate-bn', protect, (req, res) => {
  try {
    const { businessNumber } = req.body;
    const province = req.user.province;
    
    const isValid = taxUtils.validateBusinessNumber(businessNumber, province);
    
    res.json({
      success: true,
      isValid,
      format: taxUtils.getBusinessNumberFormat(province)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating business number'
    });
  }
});

module.exports = router;














