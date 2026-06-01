'use strict';

const fs = require('fs');
const path = require('path');

function actionList(actions) {
  if (!actions || actions.length === 0) return '- None.';
  return actions.map((action) => {
    const name = action.parameterName || action.eventName || action.variableName || action.triggerName || action.dataLayerVariableName || action.action;
    return `- \`${action.action}\` — ${name} (${action.platform}, risk: ${action.riskLevel || 'n/a'}, executed: ${action.executed})`;
  }).join('\n');
}

function blockedList(actions) {
  if (!actions || actions.length === 0) return '- None.';
  return actions.map((action) => {
    const name = action.eventName || action.dataLayerVariableName || action.action;
    return `- \`${action.platform}:${action.action}\` — ${name}: ${action.reason}`;
  }).join('\n');
}

function buildMarkdown(plan) {
  const ga4Actions = plan.ga4.proposedActions || [];
  const gtmActions = plan.gtm.proposedActions || [];
  const ga4CustomDimensions = ga4Actions.filter((action) => action.action === 'create_custom_dimension');
  const ga4KeyEvents = ga4Actions.filter((action) => action.action === 'mark_key_event' || action.action === 'create_conversion_event');
  const gtmDlvs = gtmActions.filter((action) => action.action === 'create_data_layer_variable');
  const gtmTriggers = gtmActions.filter((action) => action.action === 'create_custom_event_trigger');

  return [
    '# CRBOX Marketing Ops Dry-Run Plan',
    '',
    `Generated: ${plan.generatedAt}`,
    '',
    'Mode: **dry_run**',
    '',
    '> No GA4 or GTM mutations were performed. This is a dry-run plan only.',
    '',
    '## Source Findings',
    '',
    `- GA4 live state verified: ${Boolean(plan.ga4.liveVerified)}`,
    `- GTM live state verified: ${Boolean(plan.gtm.liveVerified)}`,
    `- GA4 property: ${plan.ga4.propertyId || '(not available)'}`,
    `- GA4 measurement ID: ${plan.ga4.measurementId || '(not available)'}`,
    `- GTM account: ${plan.gtm.accountId || '(not available)'}`,
    `- GTM container: ${plan.gtm.containerId || '(not available)'}`,
    `- GTM public container ID: ${plan.gtm.publicContainerId || '(not available)'}`,
    `- GTM workspace: ${plan.gtm.workspace && plan.gtm.workspace.name ? plan.gtm.workspace.name : '(not available)'}`,
    '',
    '## Proposed GA4 Custom Dimensions',
    '',
    actionList(ga4CustomDimensions),
    '',
    '## Proposed GA4 Key Events / Conversions',
    '',
    actionList(ga4KeyEvents),
    '',
    '## Proposed GTM Data Layer Variables',
    '',
    actionList(gtmDlvs),
    '',
    '## Proposed GTM Custom Event Triggers',
    '',
    actionList(gtmTriggers),
    '',
    '## Items Explicitly Not Proposed',
    '',
    '- GA4 custom dimensions for `utm_source`, `utm_medium`, and `utm_campaign` because GA4 has built-in acquisition dimensions.',
    '- Primary conversion/key-event setup for `calculator_result` or `whatsapp_click`.',
    '- Google Ads conversions or imports.',
    '- Meta Pixel, Meta event tags, audiences, or CAPI setup.',
    '- GTM variables for raw `gclid` or raw `fbclid`.',
    '',
    '## Blocked Actions',
    '',
    blockedList(plan.blockedActions),
    '',
    '## Risk Assessment',
    '',
    Object.keys(plan.summary.riskSummary).length
      ? Object.entries(plan.summary.riskSummary).map(([risk, count]) => `- ${risk}: ${count}`).join('\n')
      : '- No proposed actions.',
    '',
    '## Human Approval Checklist',
    '',
    '- [ ] Confirm GA4 custom dimensions should be created exactly as proposed.',
    '- [ ] Confirm GA4 key events/conversions should be marked exactly as proposed.',
    '- [ ] Confirm GTM Data Layer Variables should be created exactly as proposed.',
    '- [ ] Confirm GTM Custom Event triggers should be created exactly as proposed.',
    '- [ ] Confirm no raw `gclid` or `fbclid` variables are introduced.',
    '- [ ] Confirm no GTM version is created or published without separate approval.',
    '',
    '## Warnings',
    '',
    plan.warnings.length ? plan.warnings.map((warning) => `- ${warning}`).join('\n') : '- None.',
    '',
    '## Mutation Statement',
    '',
    'No GA4 or GTM mutations were performed. This is a dry-run plan only.'
  ].join('\n') + '\n';
}

function writeDryRunPlan(root, plan) {
  const markdownPath = path.join(root, 'docs', 'marketing-ops-dry-run-plan.md');
  const jsonPath = path.join(root, 'docs', 'marketing-ops-dry-run-plan.json');
  fs.writeFileSync(markdownPath, buildMarkdown(plan), 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(plan, null, 2) + '\n', 'utf8');
  return {
    markdownPath,
    jsonPath
  };
}

function readDryRunPlan(root) {
  const jsonPath = path.join(root, 'docs', 'marketing-ops-dry-run-plan.json');
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (_error) {
    return null;
  }
}

module.exports = {
  buildMarkdown,
  writeDryRunPlan,
  readDryRunPlan
};
