const TaxCase = require('../../modules/tax/tax-case.model');
const DocumentRequest = require('../../modules/documents/document-request.model');
const updateTaxCaseDocumentProgress = require('./tax-case-progress');

const updateTaxCaseStatus = async (taxCaseId) => {
  const taxCase = await TaxCase.findById(taxCaseId);

  if (!taxCase) {
    throw new Error('Tax case not found');
  }

  const progress = await updateTaxCaseDocumentProgress(taxCaseId);
  const requests = await DocumentRequest.find({ taxCase: taxCaseId });

  let nextStatus = taxCase.status;

  if (requests.length === 0) {
    nextStatus = 'draft';
  } else if (progress.rejected > 0) {
    nextStatus = 'action-required';
  } else if (progress.verified === progress.total && progress.total > 0) {
    nextStatus = 'under-review';
  } else if (progress.uploaded > 0 || progress.verified > 0) {
    nextStatus = 'documents-uploaded';
  } else {
    nextStatus = 'documents-pending';
  }

  taxCase.documentProgress = progress;
  taxCase.status = nextStatus;
  taxCase.lastActivityAt = new Date();

  await taxCase.save();

  return taxCase;
};

module.exports = updateTaxCaseStatus;












