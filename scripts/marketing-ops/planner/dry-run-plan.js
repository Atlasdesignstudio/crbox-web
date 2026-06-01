'use strict';

const { buildGa4Plan } = require('./ga4-plan');
const { buildGtmPlan } = require('./gtm-plan');

function riskSummary(actions) {
  return actions.reduce((summary, action) => {
    const risk = action.riskLevel || 'unknown';
    summary[risk] = (summary[risk] || 0) + 1;
    return summary;
  }, {});
}

function summarizePlan(plan) {
  const ga4Actions = plan.ga4 && plan.ga4.proposedActions ? plan.ga4.proposedActions : [];
  const gtmActions = plan.gtm && plan.gtm.proposedActions ? plan.gtm.proposedActions : [];
  const proposedActions = [...ga4Actions, ...gtmActions];
  const blockedActions = plan.blockedActions || [];
  return {
    totalProposedActions: proposedActions.length,
    totalProposedGa4Actions: ga4Actions.length,
    totalProposedGtmActions: gtmActions.length,
    totalBlockedActions: blockedActions.length,
    riskSummary: riskSummary(proposedActions)
  };
}

function buildBlockedActions() {
  return [
    {
      platform: 'ga4',
      action: 'mark_key_event',
      mode: 'blocked',
      eventName: 'calculator_result',
      reason: 'calculator_result is a soft intent/audience event and must not be proposed as a primary conversion goal in this phase.',
      wouldMutate: true,
      executed: false
    },
    {
      platform: 'ga4',
      action: 'mark_key_event',
      mode: 'blocked',
      eventName: 'whatsapp_click',
      reason: 'whatsapp_click is a soft contact intent event and must not be proposed as a primary conversion goal in this phase.',
      wouldMutate: true,
      executed: false
    },
    {
      platform: 'google_ads',
      action: 'create_conversion',
      mode: 'blocked',
      reason: 'Google Ads conversion creation/import is out of scope for Phase 2B.',
      wouldMutate: true,
      executed: false
    },
    {
      platform: 'meta',
      action: 'create_pixel_or_event_tag',
      mode: 'blocked',
      reason: 'Meta Pixel and event tag setup remains a later phase.',
      wouldMutate: true,
      executed: false
    }
  ];
}

function buildDryRunPlan({ ga4Result, gtmResult, scope = 'all' }) {
  const includeGa4 = scope === 'all' || scope === 'ga4';
  const includeGtm = scope === 'all' || scope === 'gtm';
  const generatedAt = new Date().toISOString();
  const ga4 = includeGa4
    ? buildGa4Plan(ga4Result || { checks: [], missingCustomDimensions: [], missingKeyEvents: [] })
    : null;
  const gtm = includeGtm
    ? buildGtmPlan(gtmResult || { checks: [], missingDlvs: [], missingTriggers: [] })
    : null;
  const proposedActions = [
    ...(ga4 ? ga4.proposedActions : []),
    ...(gtm ? gtm.proposedActions : [])
  ];
  const blockedActions = [
    ...(gtm ? gtm.blockedActions : []),
    ...buildBlockedActions()
  ];
  const warnings = [
    ...(ga4 ? ga4.warnings : []),
    ...(gtm ? gtm.warnings : [])
  ];

  return {
    generatedAt,
    mode: 'dry_run',
    mutationPerformed: false,
    requiresHumanApproval: true,
    scope,
    ga4: ga4 ? {
      propertyId: ga4.propertyId,
      measurementId: ga4.measurementId,
      liveVerified: ga4.liveVerified,
      proposedActions: ga4.proposedActions,
      notes: ga4.notes
    } : {
      proposedActions: []
    },
    gtm: gtm ? {
      accountId: gtm.accountId,
      containerId: gtm.containerId,
      publicContainerId: gtm.publicContainerId,
      workspace: gtm.workspace,
      liveVerified: gtm.liveVerified,
      proposedActions: gtm.proposedActions,
      notes: gtm.notes
    } : {
      proposedActions: []
    },
    blockedActions,
    warnings,
    summary: summarizePlan({
      ga4: ga4 || { proposedActions: [] },
      gtm: gtm || { proposedActions: [] },
      blockedActions
    }),
    mutationStatement: 'No GA4 or GTM mutations were performed. This is a dry-run plan only.'
  };
}

function mergeDryRunPlan(existingPlan, partialPlan, scope) {
  if (!existingPlan || scope === 'all') return partialPlan;

  const merged = {
    ...existingPlan,
    generatedAt: partialPlan.generatedAt,
    mode: 'dry_run',
    mutationPerformed: false,
    requiresHumanApproval: true,
    scope: 'all',
    ga4: scope === 'ga4' ? partialPlan.ga4 : existingPlan.ga4,
    gtm: scope === 'gtm' ? partialPlan.gtm : existingPlan.gtm,
    blockedActions: partialPlan.blockedActions && partialPlan.blockedActions.length
      ? partialPlan.blockedActions
      : (existingPlan.blockedActions || []),
    warnings: [
      ...new Set([
        ...(existingPlan.warnings || []),
        ...(partialPlan.warnings || [])
      ])
    ],
    mutationStatement: 'No GA4 or GTM mutations were performed. This is a dry-run plan only.'
  };
  merged.summary = summarizePlan(merged);
  return merged;
}

module.exports = {
  buildDryRunPlan,
  mergeDryRunPlan,
  summarizePlan
};
