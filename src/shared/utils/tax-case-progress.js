const DocumentRequest = require('../../modules/documents/document-request.model');

const updateTaxCaseDocumentProgress = async (taxCaseId) => {
  const requests = await DocumentRequest.find({ taxCase: taxCaseId });

  const total = requests.length;

  const verified = requests.filter(
    (r) => r.reviewStatus === 'verified' || r.status === 'fulfilled'
  ).length;

  const uploaded = requests.filter(
    (r) => r.status === 'uploaded'
  ).length;

  const rejected = requests.filter(
    (r) => r.reviewStatus === 'rejected' || r.status === 'needs-info'
  ).length;

  const pending = requests.filter(
    (r) => ['open', 'pending', 'uploaded', 'needs-info'].includes(r.status)
  ).length;

  return {
    total,
    verified,
    uploaded,
    rejected,
    pending,
    completionPercentage:
      total === 0 ? 0 : Math.round((verified / total) * 100)
  };
};

module.exports = updateTaxCaseDocumentProgress;












