const TaxCaseTimeline = require('../../modules/tax/tax-case-timeline.model');

const ALLOWED_ACTOR_ROLES = ['client', 'ca', 'admin', 'system'];

async function createTaxCaseTimelineEvent({
  taxCase,
  actor = null,
  actorRole = 'system',
  eventType,
  title,
  description = '',
  meta = {}
}) {
  try {
    if (!taxCase || !eventType || !title) {
      throw new Error('taxCase, eventType, and title are required');
    }

    const safeActorRole = ALLOWED_ACTOR_ROLES.includes(actorRole)
      ? actorRole
      : 'system';

    const timelineEvent = await TaxCaseTimeline.create({
      taxCase,
      actor,
      actorRole: safeActorRole,
      eventType,
      title,
      description,
      meta: {
        documentId: meta.documentId || null,
        documentRequestId: meta.documentRequestId || null,
        previousStatus: meta.previousStatus || null,
        newStatus: meta.newStatus || null
      }
    });

    return timelineEvent;
  } catch (error) {
    console.error('createTaxCaseTimelineEvent error:', error);
    return null;
  }
}

module.exports = createTaxCaseTimelineEvent;












