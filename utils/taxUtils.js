// Provincial tax configurations for Canada
const PROVINCIAL_TAX_CONFIG = {
  'AB': { type: 'GST', provincialRate: 0, agency: 'CRA' },
  'BC': { type: 'PST', provincialRate: 0.07, agency: 'BC Ministry of Finance' },
  'MB': { type: 'RST', provincialRate: 0.07, agency: 'Manitoba Finance' },
  'NB': { type: 'HST', provincialRate: 0.15, agency: 'CRA' },
  'NL': { type: 'HST', provincialRate: 0.15, agency: 'CRA' },
  'NS': { type: 'HST', provincialRate: 0.15, agency: 'CRA' },
  'NT': { type: 'GST', provincialRate: 0, agency: 'CRA' },
  'NU': { type: 'GST', provincialRate: 0, agency: 'CRA' },
  'ON': { type: 'HST', provincialRate: 0.13, agency: 'CRA' },
  'PE': { type: 'HST', provincialRate: 0.15, agency: 'CRA' },
  'QC': { type: 'QST', provincialRate: 0.09975, agency: 'Revenu Québec' },
  'SK': { type: 'PST', provincialRate: 0.06, agency: 'Saskatchewan Finance' },
  'YT': { type: 'GST', provincialRate: 0, agency: 'CRA' }
};

const FEDERAL_GST_RATE = 0.05;

/**
 * Calculate total taxes based on province
 * @param {number} amount - The amount to calculate tax on
 * @param {string} province - Province code (ON, BC, QC, etc.)
 * @returns {object} Tax breakdown
 */
exports.calculateTaxes = (amount, province) => {
  const config = PROVINCIAL_TAX_CONFIG[province] || PROVINCIAL_TAX_CONFIG['ON'];
  const gst = amount * FEDERAL_GST_RATE;
  
  let provincialTax = 0;
  let totalTax = gst;
  
  switch (config.type) {
    case 'HST':
      // HST includes both federal and provincial portions
      totalTax = amount * (FEDERAL_GST_RATE + config.provincialRate);
      provincialTax = amount * config.provincialRate;
      break;
    case 'PST':
    case 'RST':
    case 'QST':
      provincialTax = amount * config.provincialRate;
      totalTax = gst + provincialTax;
      break;
    default:
      // GST only provinces
      break;
  }
  
  return {
    gst,
    provincialTax,
    totalTax,
    taxType: config.type,
    taxRate: config.provincialRate,
    agency: config.agency
  };
};

/**
 * Get business number format based on province
 * @param {string} province 
 * @returns {object} Business number format
 */
exports.getBusinessNumberFormat = (province) => {
  return {
    prefix: province === 'QC' ? 'RQ' : 'RT',
    pattern: province === 'QC' ? '123456789RQ1234' : '123456789RT1234',
    length: 15,
    agency: PROVINCIAL_TAX_CONFIG[province]?.agency || 'CRA'
  };
};

/**
 * Check if province requires separate provincial filing
 * @param {string} province 
 * @returns {boolean}
 */
exports.requiresSeparateFiling = (province) => {
  return ['QC', 'BC', 'SK', 'MB'].includes(province);
};

/**
 * Get filing deadlines by province
 * @param {string} province 
 * @param {string} frequency 
 * @returns {object}
 */
exports.getFilingDeadline = (province, frequency = 'quarterly') => {
  const deadlines = {
    monthly: '15th of following month',
    quarterly: '1 month after quarter end',
    annual: 'June 15'
  };
  
  return {
    deadline: deadlines[frequency],
    agency: PROVINCIAL_TAX_CONFIG[province]?.agency,
    note: province === 'QC' ? 'File separately with Revenu Québec' : null
  };
};

/**
 * Validate business number by province
 * @param {string} bn 
 * @param {string} province 
 * @returns {boolean}
 */
exports.validateBusinessNumber = (bn, province) => {
  if (!bn) return false;
  
  // Remove any spaces or dashes
  const cleanBn = bn.replace(/[\s-]/g, '');
  
  if (province === 'QC') {
    // Quebec: 9 digits + RQ + 4 digits
    return /^\d{9}RQ\d{4}$/.test(cleanBn);
  } else {
    // Other provinces: 9 digits + RT + 4 digits
    return /^\d{9}RT\d{4}$/.test(cleanBn);
  }
};

/**
 * Get mileage deduction rate by province
 * @param {string} province 
 * @returns {number}
 */
exports.getMileageRate = (province) => {
  // CRA standard rate applies to all provinces
  // Some provinces may have different rates for provincial tax
  return 0.61; // 2024 rate
};

/**
 * Get provincial tax rate by province
 * @param {string} province 
 * @returns {number}
 */
exports.getProvincialTaxRate = (province) => {
  return PROVINCIAL_TAX_CONFIG[province]?.provincialRate || 0;
};

/**
 * Get tax type by province
 * @param {string} province 
 * @returns {string}
 */
exports.getTaxType = (province) => {
  return PROVINCIAL_TAX_CONFIG[province]?.type || 'GST';
};

/**
 * Format tax display string
 * @param {string} province 
 * @returns {string}
 */
exports.getTaxDisplayString = (province) => {
  const config = PROVINCIAL_TAX_CONFIG[province];
  if (!config) return '5% GST';
  
  switch (config.type) {
    case 'HST':
      return `${(FEDERAL_GST_RATE + config.provincialRate) * 100}% HST`;
    case 'PST':
      return `5% GST + ${config.provincialRate * 100}% PST`;
    case 'RST':
      return `5% GST + ${config.provincialRate * 100}% RST`;
    case 'QST':
      return `5% GST + ${config.provincialRate * 100}% QST`;
    default:
      return '5% GST';
  }
};