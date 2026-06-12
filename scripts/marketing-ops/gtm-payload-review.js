'use strict';

const fs = require('fs');
const path = require('path');
const { actionId, validateDryRunPlan } = require('./apply/apply-validator');
const {
  buildCustomEventTriggerPayload,
  buildDataLayerVariablePayload
} = require('./apply/gtm-apply');
const { readPreflight } = require('./gtm-preflight');

const ALLOWED_ACTIONS = Object.freeze(new Set([
  'create_data_layer_variable',
  'create_custom_event_trigger'
]));
const RAW_CLICK_IDS = Object.freeze(new Set(['gclid', 'fbclid']));
const APPROVED_VARIABLES = Object.freeze(new Map([
  ['DLV - utm_source', 'utm_source'],
  ['DLV - utm_medium', 'utm_medium'],
  ['DLV - utm_campaign', 'utm_campaign'],
  ['DLV - utm_content', 'utm_content'],
  ['DLV - utm_term', 'utm_term'],
  ['DLV - gclid_present', 'gclid_present'],
  ['DLV - fbclid_present', 'fbclid_present'],
  ['DLV - attribution_touch', 'attribution_touch']
]));
const APPROVED_TRIGGERS = Object.freeze(new Map([
  ['CE - quote_request_submit_success', 'quote_request_submit_success'],
  ['CE - contact_form_submit_success', 'contact_form_submit_success'],
  ['CE - quote_request_start', 'quote_request_start']
]));
const EXPECTED_VARIABLES = 8;
const EXPECTED_TRIGGERS = 3;
const EXPECTED_ACTIONS = EXPECTED_VARIABLES + EXPECTED_TRIGGERS;

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validateReviewSources(validation, preflight) {
  const errors = [];
  const items = preflight && preflight.futureActions && Array.isArray(preflight.futureActions.items)
    ? preflight.futureActions.items
    : [];

  requireCondition(validation.ok, `Dry-run plan validation failed: ${(validation.errors || []).join(' ')}`, errors);
  requireCondition(Boolean(preflight), 'GTM preflight artifact is missing or invalid.', errors);
  if (!preflight) return errors;

  requireCondition(preflight.oauth && preflight.oauth.requiredScopeStatus === 'available', 'Required GTM edit scope is not available.', errors);
  requireCondition(preflight.workspace && preflight.workspace.workspaceReadable === true, 'GTM workspace is not readable.', errors);
  requireCondition(preflight.workspace && preflight.workspace.variablesReadable === true, 'GTM variables are not readable.', errors);
  requireCondition(preflight.workspace && preflight.workspace.triggersReadable === true, 'GTM triggers are not readable.', errors);
  requireCondition(preflight.futureActions && preflight.futureActions.total === EXPECTED_ACTIONS, `Expected ${EXPECTED_ACTIONS} future GTM actions.`, errors);
  requireCondition(preflight.futureActions && preflight.futureActions.duplicateRisk === 0, 'GTM preflight contains duplicate risks.', errors);
  requireCondition(preflight.futureActions && preflight.futureActions.blocked === 0, 'GTM preflight contains blocked unsafe proposals.', errors);
  requireCondition(items.length === EXPECTED_ACTIONS, `Expected ${EXPECTED_ACTIONS} classified GTM actions.`, errors);
  requireCondition(items.every((item) => item.status === 'would_create'), 'Every reviewed GTM action must have status would_create.', errors);
  const preflightByActionId = new Map(items.map((item) => [item.actionId, item]));
  requireCondition(
    (validation.gtmActions || []).every((action, index) => {
      const item = preflightByActionId.get(actionId(action, index));
      return item && item.status === 'would_create';
    }),
    'Every planned GTM action must match a would_create item in the preflight artifact.',
    errors
  );
  requireCondition(preflight.mutationPerformed === false, 'Preflight mutationPerformed must remain false.', errors);
  requireCondition(preflight.gtmWriteCallsMade === false, 'Preflight gtmWriteCallsMade must remain false.', errors);
  requireCondition(preflight.gtmPublished === false, 'Preflight gtmPublished must remain false.', errors);
  requireCondition(
    preflight.recommendation && preflight.recommendation.readyForFutureControlledCreate === true,
    'Preflight is not ready for human review before future controlled create.',
    errors
  );

  return errors;
}

function reviewVariable(action, index) {
  const key = String(action.dataLayerVariableName || '');
  if (APPROVED_VARIABLES.get(action.variableName) !== key) {
    throw new Error(`Unapproved GTM variable name/key pair: ${action.variableName} -> ${key}`);
  }
  if (RAW_CLICK_IDS.has(key.toLowerCase())) {
    throw new Error(`Raw click ID variable is prohibited: ${key}`);
  }

  const hasDefault = action.defaultValue !== undefined
    && action.defaultValue !== null
    && action.defaultValue !== '';

  return {
    actionId: actionId(action, index),
    action: action.action,
    status: 'would_create',
    intendedName: action.variableName,
    dataLayerVariableName: key,
    defaultValue: hasDefault ? action.defaultValue : null,
    riskLevel: action.riskLevel,
    defaultValueBehavior: hasDefault
      ? 'GTM setDefaultValue is enabled and the configured defaultValue is sent as a template parameter.'
      : 'No GTM default value parameters are included.',
    endpoint: `POST https://tagmanager.googleapis.com/tagmanager/v2/${action.workspacePath}/variables`,
    payload: buildDataLayerVariablePayload(action),
    notes: 'Review-only payload generated by the same builder used by the controlled create executor. It reads an approved dataLayer key and does not expose a raw click ID.'
  };
}

function reviewTrigger(action, index) {
  if (APPROVED_TRIGGERS.get(action.triggerName) !== action.eventName) {
    throw new Error(`Unapproved GTM trigger name/event pair: ${action.triggerName} -> ${action.eventName}`);
  }

  return {
    actionId: actionId(action, index),
    action: action.action,
    status: 'would_create',
    intendedName: action.triggerName,
    eventName: action.eventName,
    riskLevel: action.riskLevel,
    endpoint: `POST https://tagmanager.googleapis.com/tagmanager/v2/${action.workspacePath}/triggers`,
    payload: buildCustomEventTriggerPayload(action),
    notes: 'Review-only Custom Event trigger payload generated by the same builder used by the controlled create executor.'
  };
}

function buildReview(root) {
  const validation = validateDryRunPlan(root);
  const preflight = readPreflight(root);
  const errors = validateReviewSources(validation, preflight);
  if (errors.length) {
    throw new Error(`GTM payload review refused: ${errors.join(' ')}`);
  }

  const actions = validation.gtmActions || [];
  const unsafeActions = actions.filter((action) =>
    action.platform !== 'gtm' || !ALLOWED_ACTIONS.has(action.action)
  );
  if (unsafeActions.length) {
    throw new Error('GTM payload review refused because the plan contains non-allowlisted GTM actions.');
  }

  const variables = [];
  const triggers = [];
  actions.forEach((action, index) => {
    if (action.action === 'create_data_layer_variable') {
      variables.push(reviewVariable(action, index));
    } else {
      triggers.push(reviewTrigger(action, index));
    }
  });

  if (variables.length !== EXPECTED_VARIABLES || triggers.length !== EXPECTED_TRIGGERS) {
    throw new Error(`GTM payload review expected ${EXPECTED_VARIABLES} variables and ${EXPECTED_TRIGGERS} triggers.`);
  }

  return {
    generatedAt: new Date().toISOString(),
    phase: '2I',
    mode: 'review_only',
    mutationPerformed: false,
    gtmWriteCallsMade: false,
    gtmPublished: false,
    sourceArtifacts: [
      'docs/marketing-ops-dry-run-plan.json',
      'docs/marketing-ops-gtm-preflight.json'
    ],
    readiness: {
      requiredScopeStatus: preflight.oauth.requiredScopeStatus,
      workspaceReadable: preflight.workspace.workspaceReadable,
      variablesReadable: preflight.workspace.variablesReadable,
      triggersReadable: preflight.workspace.triggersReadable,
      duplicateRisk: preflight.futureActions.duplicateRisk,
      blocked: preflight.futureActions.blocked,
      futureActionsTotal: preflight.futureActions.total,
      allActionsWouldCreate: preflight.futureActions.items.every((item) => item.status === 'would_create'),
      readyForHumanReview: preflight.recommendation.readyForFutureControlledCreate
    },
    payloads: {
      variables,
      triggers
    },
    excluded: [
      'raw gclid',
      'raw fbclid',
      'GTM tags',
      'GTM versions',
      'GTM publish',
      'Google Ads',
      'Meta'
    ],
    safety: {
      noWrites: true,
      noPublish: true,
      noSecrets: true,
      gtmVariablesCreated: false,
      gtmTriggersCreated: false,
      gtmTagsCreated: false,
      gtmVersionsCreated: false,
      googleAdsTouched: false,
      metaTouched: false,
      websiteRuntimeFilesTouched: false
    }
  };
}

function formatJson(value) {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function buildMarkdown(review) {
  const variableRows = review.payloads.variables.map((item) =>
    `| \`${item.actionId}\` | ${item.intendedName} | \`${item.dataLayerVariableName}\` | \`${item.payload.type}\` | ${item.defaultValue === null ? 'None' : `\`${String(item.defaultValue)}\``} |`
  );
  const triggerRows = review.payloads.triggers.map((item) =>
    `| \`${item.actionId}\` | ${item.intendedName} | \`${item.eventName}\` | \`${item.payload.type}\` |`
  );

  return [
    '# CRBOX Marketing Ops GTM Payload Review',
    '',
    `Generated: ${review.generatedAt}`,
    '',
    'Phase: **2I**',
    '',
    'Mode: **review_only**',
    '',
    '## Summary',
    '',
    `- Variable payloads: ${review.payloads.variables.length}`,
    `- Trigger payloads: ${review.payloads.triggers.length}`,
    '- These payloads are generated by the same builders used by the gated GTM controlled create executor.',
    '- Human approval of this artifact does not publish GTM and does not authorize automatic execution.',
    '',
    '## Readiness Checklist',
    '',
    `- Required GTM edit scope available: ${review.readiness.requiredScopeStatus === 'available'}`,
    `- Workspace readable: ${review.readiness.workspaceReadable}`,
    `- Variables readable: ${review.readiness.variablesReadable}`,
    `- Triggers readable: ${review.readiness.triggersReadable}`,
    `- Duplicate risks: ${review.readiness.duplicateRisk}`,
    `- Blocked unsafe proposals: ${review.readiness.blocked}`,
    `- Future actions checked: ${review.readiness.futureActionsTotal}`,
    `- All actions classified would_create: ${review.readiness.allActionsWouldCreate}`,
    `- Ready for human review: ${review.readiness.readyForHumanReview}`,
    '',
    '## Variable Payload Table',
    '',
    '| Action ID | GTM name | Data Layer key | Type | Default |',
    '|---|---|---|---|---|',
    ...variableRows,
    '',
    '### Exact Variable Payloads',
    '',
    ...review.payloads.variables.flatMap((item) => [
      `#### ${item.intendedName}`,
      '',
      `Endpoint reviewed: \`${item.endpoint}\``,
      '',
      formatJson(item.payload),
      '',
      `Default behavior: ${item.defaultValueBehavior}`,
      '',
      `Notes: ${item.notes}`,
      ''
    ]),
    '## Trigger Payload Table',
    '',
    '| Action ID | GTM name | Custom event | Type |',
    '|---|---|---|---|',
    ...triggerRows,
    '',
    '### Exact Trigger Payloads',
    '',
    ...review.payloads.triggers.flatMap((item) => [
      `#### ${item.intendedName}`,
      '',
      `Endpoint reviewed: \`${item.endpoint}\``,
      '',
      formatJson(item.payload),
      '',
      `Notes: ${item.notes}`,
      ''
    ]),
    '## Excluded Actions',
    '',
    ...review.excluded.map((item) => `- ${item}`),
    '',
    '## Safety Statement',
    '',
    '- Mutation performed: false',
    '- GTM write calls made: false',
    '- GTM published: false',
    '- No GTM variables, triggers, tags, or versions were created.',
    '- No Google Ads or Meta payloads are included.',
    '- No secrets are included.',
    '',
    '## Human Approval Checklist',
    '',
    '- [ ] Confirm all 8 variable names and Data Layer keys.',
    '- [ ] Confirm all variable default values.',
    '- [ ] Confirm all 3 trigger names and Custom Event names.',
    '- [ ] Confirm no raw `gclid` or raw `fbclid` variable appears.',
    '- [ ] Confirm no GTM tag, version, or publish payload appears.',
    '- [ ] Confirm GTM Preview and publication remain separate future approvals.',
    '',
    'No GTM write calls were made. These payloads are for human review only.'
  ].join('\n') + '\n';
}

function writeReview(root, review) {
  const jsonPath = path.join(root, 'docs', 'marketing-ops-gtm-payload-review.json');
  const markdownPath = path.join(root, 'docs', 'marketing-ops-gtm-payload-review.md');
  fs.writeFileSync(jsonPath, JSON.stringify(review, null, 2) + '\n', 'utf8');
  fs.writeFileSync(markdownPath, buildMarkdown(review), 'utf8');
  return { jsonPath, markdownPath };
}

function runGtmPayloadReview(root) {
  const review = buildReview(root);
  const paths = writeReview(root, review);
  return { review, paths };
}

function printPayloadReviewSummary(review, paths) {
  return [
    'GTM payload review: COMPLETE',
    `- Mode: ${review.mode}`,
    `- Variable payloads: ${review.payloads.variables.length}`,
    `- Trigger payloads: ${review.payloads.triggers.length}`,
    `- Required scope status: ${review.readiness.requiredScopeStatus}`,
    `- All 11 actions would create: ${review.readiness.allActionsWouldCreate}`,
    `- Duplicate risks: ${review.readiness.duplicateRisk}`,
    `- Blocked proposals: ${review.readiness.blocked}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    'No GTM write calls were made. These payloads are for human review only.'
  ];
}

module.exports = {
  buildMarkdown,
  buildReview,
  printPayloadReviewSummary,
  runGtmPayloadReview
};
