'use strict';

const fs = require('fs');
const path = require('path');
const { EXPECTED } = require('./config');
const { envValue, maskSecretsInText } = require('./utils');
const { getGoogleAccessToken, googleApiGet, readableGoogleError } = require('./google-auth');

const GTM_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';
const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-ga4-event-tags-create-result.json',
  'docs/marketing-ops-ga4-event-tags-preview-qa.json',
  'docs/marketing-ops-ga4-event-tags-payload-review.json'
]);
const EXPECTED_VARIABLES = Object.freeze([
  ['DLV - utm_source', 'utm_source'],
  ['DLV - utm_medium', 'utm_medium'],
  ['DLV - utm_campaign', 'utm_campaign'],
  ['DLV - utm_content', 'utm_content'],
  ['DLV - utm_term', 'utm_term'],
  ['DLV - gclid_present', 'gclid_present'],
  ['DLV - fbclid_present', 'fbclid_present'],
  ['DLV - attribution_touch', 'attribution_touch']
]);
const EXPECTED_TRIGGERS = Object.freeze([
  ['CE - quote_request_start', 'quote_request_start'],
  ['CE - quote_request_submit_success', 'quote_request_submit_success'],
  ['CE - contact_form_submit_success', 'contact_form_submit_success']
]);
const EXPECTED_TAGS = Object.freeze([
  ['GA4 - quote_request_start', 'quote_request_start', 'CE - quote_request_start'],
  ['GA4 - quote_request_submit_success', 'quote_request_submit_success', 'CE - quote_request_submit_success'],
  ['GA4 - contact_form_submit_success', 'contact_form_submit_success', 'CE - contact_form_submit_success']
]);
const APPROVED_PARAMETERS = Object.freeze(new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid_present',
  'fbclid_present',
  'attribution_touch',
  'page_path',
  'page_name',
  'page_type',
  'service_type',
  'shipping_mode',
  'destination_country',
  'weight_bucket',
  'value_bucket',
  'form_name'
]));
const RAW_CLICK_IDS = Object.freeze(new Set(['gclid', 'fbclid']));
const PII_PARAMETERS = Object.freeze(new Set([
  'name',
  'email',
  'phone',
  'address',
  'company',
  'message',
  'item_description',
  'product_description',
  'reference_number',
  'exact_value',
  'exact_weight'
]));
const VERSION_NAME = 'CRBOX GA4 conversion event tags - Phase 2P';
const VERSION_NOTES = Object.freeze([
  'Adds GA4 Event Tags for quote_request_start, quote_request_submit_success, and contact_form_submit_success.',
  'Uses existing approved Custom Event triggers and Data Layer Variables.',
  'Includes no new runtime changes.',
  'Includes no Google Ads or Meta changes.',
  'GTM Preview QA passed in Phase 2O.',
  'Monitor GA4 event delivery and duplicate firing after any separately approved publish.'
]);
const ROLLBACK_STEPS = Object.freeze([
  'If issues are detected after publish, revert to the previous GTM container version.',
  'Verify the core GA4 Configuration tag and existing events still fire.',
  'Re-run GTM Preview before republishing.',
  'Keep the Replit runtime unchanged unless a runtime-specific issue is detected.'
]);

function readJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required Phase 2P source artifact is missing: ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validatePrerequisites(root) {
  const phase2N = readJson(root, SOURCE_ARTIFACTS[0]);
  const phase2O = readJson(root, SOURCE_ARTIFACTS[1]);
  const payloadReview = readJson(root, SOURCE_ARTIFACTS[2]);
  const errors = [];

  if (phase2N.phase !== '2N' || phase2N.status !== 'executed') {
    errors.push('Phase 2N must be present with executed status.');
  }
  if (phase2N.mutationPerformed !== true) errors.push('Phase 2N must record mutationPerformed true.');
  if (phase2N.gtmVersionCreated !== false) errors.push('Phase 2N must confirm no GTM version was created.');
  if (phase2N.gtmPublished !== false) errors.push('Phase 2N must confirm GTM was not published.');
  if ((phase2N.createdTags || []).length !== 3) errors.push('Phase 2N must record exactly 3 created tags.');

  if (phase2O.phase !== '2O') errors.push('Phase 2O artifact must have phase 2O.');
  if (phase2O.overallStatus !== 'pass') errors.push('Phase 2O overallStatus must be pass.');
  if (phase2O.recommendation?.previewQaPassed !== true) errors.push('Phase 2O previewQaPassed must be true.');
  if (phase2O.recommendation?.publishApproved !== false) errors.push('Phase 2O publishApproved must remain false.');

  if (payloadReview.phase !== '2M') errors.push('GA4 Event Tags payload review must have phase 2M.');
  if (payloadReview.recommendation?.publishApproved !== false) {
    errors.push('Payload review publishApproved must remain false.');
  }

  if (errors.length) throw new Error(`Phase 2P review refused: ${errors.join(' ')}`);
  return { phase2N, phase2O, payloadReview };
}

function parameterValue(entity, key) {
  return (entity.parameter || []).find((item) => item.key === key)?.value || '';
}

function eventParameterMap(tag) {
  const table = (tag.parameter || []).find((item) => item.key === 'eventSettingsTable');
  const output = {};
  for (const row of table?.list || []) {
    const parameter = (row.map || []).find((item) => item.key === 'parameter')?.value || '';
    const value = (row.map || []).find((item) => item.key === 'parameterValue')?.value || '';
    if (parameter) output[parameter] = value;
  }
  return output;
}

function triggerEventName(trigger) {
  for (const filter of trigger.customEventFilter || []) {
    const eventParameter = (filter.parameter || []).find((item) => item.key === 'arg1');
    if (eventParameter?.value) return eventParameter.value;
  }
  return '';
}

function chooseWorkspace(workspaces, plannedPath) {
  return workspaces.find((workspace) => workspace.path === plannedPath)
    || workspaces.find((workspace) => /default/i.test(workspace.name || ''))
    || workspaces[0]
    || null;
}

function entityIdentity(entity) {
  const types = ['tag', 'trigger', 'variable', 'folder', 'client', 'builtInVariable', 'zone', 'customTemplate', 'transformation'];
  const type = types.find((candidate) => entity[candidate]) || 'unknown';
  const item = entity[type] || {};
  return {
    type,
    name: item.name || '',
    id: item.tagId || item.triggerId || item.variableId || item.folderId || item.clientId || item.templateId || '',
    changeStatus: entity.changeStatus || ''
  };
}

function approvedWorkspaceIdentitySet() {
  return new Set([
    ...EXPECTED_TAGS.map(([name]) => `tag:${name}`),
    ...EXPECTED_TRIGGERS.map(([name]) => `trigger:${name}`),
    ...EXPECTED_VARIABLES.map(([name]) => `variable:${name}`)
  ]);
}

async function loadLiveWorkspace(root, payloadReview) {
  const accountId = envValue('GTM_ACCOUNT_ID');
  const configuredContainerId = envValue('GTM_CONTAINER_ID') || EXPECTED.gtmContainerId;
  const accessToken = await getGoogleAccessToken();
  const account = await googleApiGet(`${GTM_BASE}/accounts/${accountId}`, accessToken);
  const containersData = await googleApiGet(`${GTM_BASE}/${account.path}/containers`, accessToken);
  const container = (containersData.container || []).find((item) =>
    item.containerId === configuredContainerId || item.publicId === configuredContainerId
  );
  if (!container) throw new Error('Configured GTM container was not found by read-only list call.');

  const workspacesData = await googleApiGet(`${GTM_BASE}/${container.path}/workspaces`, accessToken);
  const workspace = chooseWorkspace(
    workspacesData.workspace || [],
    payloadReview.liveReadOnlyAudit?.workspacePath || ''
  );
  if (!workspace) throw new Error('No GTM workspace was available for publish-readiness review.');

  const [variablesData, triggersData, tagsData, statusData] = await Promise.all([
    googleApiGet(`${GTM_BASE}/${workspace.path}/variables`, accessToken),
    googleApiGet(`${GTM_BASE}/${workspace.path}/triggers`, accessToken),
    googleApiGet(`${GTM_BASE}/${workspace.path}/tags`, accessToken),
    googleApiGet(`${GTM_BASE}/${workspace.path}/status`, accessToken)
  ]);

  return {
    account,
    container,
    workspace,
    variables: variablesData.variable || [],
    triggers: triggersData.trigger || [],
    tags: tagsData.tag || [],
    workspaceChanges: statusData.workspaceChange || [],
    mergeConflicts: statusData.mergeConflict || []
  };
}

function reviewExpectedVariables(variables) {
  return EXPECTED_VARIABLES.map(([name, dataLayerKey]) => {
    const matches = variables.filter((variable) =>
      variable.name === name || parameterValue(variable, 'name') === dataLayerKey
    );
    const exact = matches.find((variable) =>
      variable.name === name && parameterValue(variable, 'name') === dataLayerKey
    );
    return {
      name,
      dataLayerKey,
      present: Boolean(exact),
      duplicateRisk: Math.max(0, matches.length - 1),
      matches: matches.map((variable) => ({
        variableId: variable.variableId || '',
        name: variable.name || '',
        dataLayerKey: parameterValue(variable, 'name')
      }))
    };
  });
}

function reviewExpectedTriggers(triggers) {
  return EXPECTED_TRIGGERS.map(([name, eventName]) => {
    const matches = triggers.filter((trigger) =>
      trigger.name === name || triggerEventName(trigger) === eventName
    );
    const exact = matches.find((trigger) =>
      trigger.name === name && triggerEventName(trigger) === eventName
    );
    return {
      name,
      eventName,
      present: Boolean(exact),
      triggerId: exact?.triggerId || '',
      duplicateRisk: Math.max(0, matches.length - 1),
      matches: matches.map((trigger) => ({
        triggerId: trigger.triggerId || '',
        name: trigger.name || '',
        eventName: triggerEventName(trigger)
      }))
    };
  });
}

function reviewTags(tags, triggers, payloadReview) {
  return EXPECTED_TAGS.map(([tagName, eventName, triggerName]) => {
    const approved = (payloadReview.proposedTags || []).find((item) => item.tagName === tagName);
    const trigger = triggers.find((item) =>
      item.name === triggerName && triggerEventName(item) === eventName
    );
    const matches = tags.filter((tag) =>
      tag.name === tagName || (tag.type === 'gaawe' && parameterValue(tag, 'eventName') === eventName)
    );
    const tag = matches.find((item) => item.name === tagName);
    const actualParameters = tag ? eventParameterMap(tag) : {};
    const approvedParameters = Object.fromEntries(
      (approved?.parameters || []).map((item) => [item.parameter, item.variableReference])
    );
    const actualNames = Object.keys(actualParameters);
    const approvedNames = Object.keys(approvedParameters);
    const forbiddenParameters = actualNames.filter((name) => !APPROVED_PARAMETERS.has(name));
    const rawClickIdReferences = Object.entries(actualParameters)
      .filter(([, value]) => /^\{\{\s*(?:DLV\s*-\s*)?(?:gclid|fbclid)\s*\}\}$/i.test(value))
      .map(([name, value]) => `${name} -> ${value}`);
    const rawClickIds = [
      ...actualNames.filter((name) => RAW_CLICK_IDS.has(name.toLowerCase())),
      ...rawClickIdReferences
    ];
    const pii = actualNames.filter((name) => PII_PARAMETERS.has(name.toLowerCase()));
    const unexpectedParameterKeys = (tag?.parameter || [])
      .map((item) => item.key)
      .filter((key) => !['sendEcommerceData', 'eventSettingsTable', 'eventName', 'measurementIdOverride'].includes(key));
    const issues = [];

    if (!tag) issues.push('Expected GA4 Event tag was not found.');
    if (tag && tag.type !== 'gaawe') issues.push('Tag type is not gaawe.');
    if (tag && parameterValue(tag, 'eventName') !== eventName) issues.push('GA4 event name does not match.');
    if (tag && parameterValue(tag, 'measurementIdOverride') !== EXPECTED.ga4MeasurementId) {
      issues.push('Measurement ID override does not match.');
    }
    if (tag && parameterValue(tag, 'sendEcommerceData') !== 'false') {
      issues.push('sendEcommerceData is not false.');
    }
    if (!trigger) issues.push('Expected trigger was not found.');
    if (tag && (
      (tag.firingTriggerId || []).length !== 1
      || String(tag.firingTriggerId[0]) !== String(trigger?.triggerId || '')
    )) {
      issues.push('Firing trigger does not match the approved trigger.');
    }
    if (
      approvedNames.length !== actualNames.length
      || approvedNames.some((name) => actualParameters[name] !== approvedParameters[name])
    ) {
      issues.push('Event parameter mapping differs from the approved payload.');
    }
    if (forbiddenParameters.length) issues.push('Unapproved event parameters were found.');
    if (rawClickIds.length) issues.push('Raw click ID parameters were found.');
    if (pii.length) issues.push('PII parameters were found.');
    if (unexpectedParameterKeys.length) issues.push('Unexpected GTM tag configuration fields were found.');
    if (matches.length > 1) issues.push('Duplicate tag risk was found by tag name or GA4 event name.');

    return {
      tagName,
      eventName,
      tagId: tag?.tagId || '',
      triggerName,
      triggerId: trigger?.triggerId || '',
      parameters: actualNames.map((name) => ({
        parameter: name,
        variableReference: actualParameters[name]
      })),
      status: issues.length ? 'issue' : 'pass',
      issues,
      duplicateRisk: Math.max(0, matches.length - 1),
      forbiddenParameters,
      piiParameters: pii,
      rawClickIdParameters: rawClickIds,
      unexpectedParameterKeys
    };
  });
}

function buildMarkdown(report) {
  return [
    '# CRBOX Marketing Ops GTM Publish Readiness Review',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Phase: **2P**',
    '',
    'Mode: **publish_readiness_review**',
    '',
    '## Summary',
    '',
    `- Publish readiness status: **${report.recommendation.publishReadinessStatus}**`,
    `- Publish approved: **${report.recommendation.publishApproved}**`,
    `- Expected tags present: ${report.workspaceReview.expectedTagsPresent}`,
    `- Expected triggers present: ${report.workspaceReview.expectedTriggersPresent}`,
    `- Expected variables present: ${report.workspaceReview.expectedVariablesPresent}`,
    `- Measurement ID confirmed: ${report.workspaceReview.measurementIdConfirmed}`,
    `- Duplicate risk: ${report.workspaceReview.duplicateRisk}`,
    `- Unexpected objects: ${report.workspaceReview.unexpectedObjects.length}`,
    `- Merge conflicts: ${report.workspaceReview.mergeConflicts}`,
    '',
    'This phase does not create a GTM version and does not publish GTM.',
    '',
    '## Context',
    '',
    '- Phase 2N created the three approved GA4 Event tags.',
    '- Phase 2O confirmed all three tags fired and completed in a fresh GTM Preview session.',
    '- This review compares the live workspace and its pending changes against the approved Phase 2J/2N object set.',
    '',
    '## Workspace Review',
    '',
    `- Workspace: \`${report.workspaceReview.workspaceName}\``,
    `- Pending workspace changes: ${report.workspaceReview.pendingChanges}`,
    `- Approved pending changes: ${report.workspaceReview.approvedPendingChanges}`,
    `- Unexpected pending changes: ${report.workspaceReview.unexpectedObjects.length}`,
    `- Merge conflicts: ${report.workspaceReview.mergeConflicts}`,
    '',
    report.workspaceReview.unexpectedObjects.length
      ? report.workspaceReview.unexpectedObjects.map((item) =>
        `- Unexpected: ${item.type} \`${item.name}\` (${item.changeStatus})`
      ).join('\n')
      : '- No unexpected workspace changes were found.',
    '',
    '## Tag Review',
    '',
    '| Tag | Event | Tag ID | Trigger | Trigger ID | Parameters | Status |',
    '|---|---|---:|---|---:|---:|---|',
    ...report.tagReview.map((tag) =>
      `| ${tag.tagName} | \`${tag.eventName}\` | \`${tag.tagId}\` | ${tag.triggerName} | \`${tag.triggerId}\` | ${tag.parameters.length} | **${tag.status}** |`
    ),
    '',
    ...report.tagReview.flatMap((tag) => [
      `### ${tag.tagName}`,
      '',
      `- Status: **${tag.status}**`,
      `- Issues: ${tag.issues.length ? tag.issues.join('; ') : 'None.'}`,
      '- Parameters:',
      ...tag.parameters.map((item) => `  - \`${item.parameter}\` -> \`${item.variableReference}\``),
      ''
    ]),
    '## Parameter Safety Review',
    '',
    `- Forbidden parameters found: ${report.workspaceReview.forbiddenParametersFound.length}`,
    `- PII found: ${report.workspaceReview.piiFound.length}`,
    `- Raw click IDs found: ${report.workspaceReview.rawClickIdsFound.length}`,
    '- Approved boolean click-ID presence flags remain allowed: `gclid_present`, `fbclid_present`.',
    '',
    '## PII And Click ID Safety Review',
    '',
    report.workspaceReview.forbiddenParametersFound.length
      ? report.workspaceReview.forbiddenParametersFound.map((item) => `- ${item}`).join('\n')
      : '- No unapproved, PII, free-text, raw `gclid`, or raw `fbclid` event parameters were found.',
    '',
    '## Unexpected Changes Review',
    '',
    `- Exact approved workspace changes expected: ${report.workspaceReview.expectedPendingChanges}`,
    `- Exact approved workspace changes found: ${report.workspaceReview.approvedPendingChanges}`,
    `- Unexpected workspace objects: ${report.workspaceReview.unexpectedObjects.length}`,
    `- Duplicate risk: ${report.workspaceReview.duplicateRisk}`,
    '',
    '## Proposed Version Name',
    '',
    `\`${report.proposedVersion.versionName}\``,
    '',
    '## Proposed Version Notes',
    '',
    ...report.proposedVersion.versionNotes.map((note) => `- ${note}`),
    '',
    `Create version approved: **${report.proposedVersion.createVersionApproved}**`,
    '',
    '## Rollback Plan',
    '',
    ...report.rollbackPlan.rollbackSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Publish Readiness Recommendation',
    '',
    `- Status: **${report.recommendation.publishReadinessStatus}**`,
    `- Publish approved: **${report.recommendation.publishApproved}**`,
    `- Next phase: ${report.recommendation.nextPhase}`,
    '',
    'Publish is still not performed. A separate business-owner approval is required before Phase 2Q.',
    '',
    '## Safety Statement',
    '',
    ...Object.entries(report.safety).map(([key, value]) => `- ${key}: ${value}`)
  ].join('\n') + '\n';
}

async function buildReview(root) {
  const prerequisites = validatePrerequisites(root);
  const live = await loadLiveWorkspace(root, prerequisites.payloadReview);
  const variableReview = reviewExpectedVariables(live.variables);
  const triggerReview = reviewExpectedTriggers(live.triggers);
  const tagReview = reviewTags(live.tags, live.triggers, prerequisites.payloadReview);
  const measurementVariable = live.variables.find((variable) => variable.name === 'GA4 Measurement ID');
  const configurationTag = live.tags.find((tag) => tag.name === 'GA4 Configuration');
  const measurementIdConfirmed = parameterValue(measurementVariable || {}, 'value') === EXPECTED.ga4MeasurementId
    && parameterValue(configurationTag || {}, 'tagId') === '{{GA4 Measurement ID}}';
  const approvedIdentities = approvedWorkspaceIdentitySet();
  const workspaceChanges = live.workspaceChanges.map(entityIdentity);
  const unexpectedObjects = workspaceChanges.filter((item) =>
    !approvedIdentities.has(`${item.type}:${item.name}`) || item.changeStatus !== 'added'
  );
  const approvedPendingChanges = workspaceChanges.length - unexpectedObjects.length;
  const duplicateRisk = [
    ...variableReview.map((item) => item.duplicateRisk),
    ...triggerReview.map((item) => item.duplicateRisk),
    ...tagReview.map((item) => item.duplicateRisk)
  ].reduce((total, value) => total + value, 0);
  const forbiddenParametersFound = tagReview.flatMap((tag) =>
    tag.forbiddenParameters.map((parameter) => `${tag.tagName}: ${parameter}`)
  );
  const piiFound = tagReview.flatMap((tag) =>
    tag.piiParameters.map((parameter) => `${tag.tagName}: ${parameter}`)
  );
  const rawClickIdsFound = tagReview.flatMap((tag) =>
    tag.rawClickIdParameters.map((parameter) => `${tag.tagName}: ${parameter}`)
  );
  const expectedTagsPresent = tagReview.every((tag) => tag.status === 'pass');
  const expectedTriggersPresent = triggerReview.every((trigger) => trigger.present);
  const expectedVariablesPresent = variableReview.every((variable) => variable.present);
  const ready = expectedTagsPresent
    && expectedTriggersPresent
    && expectedVariablesPresent
    && measurementIdConfirmed
    && duplicateRisk === 0
    && unexpectedObjects.length === 0
    && live.mergeConflicts.length === 0
    && forbiddenParametersFound.length === 0
    && piiFound.length === 0
    && rawClickIdsFound.length === 0
    && workspaceChanges.length === approvedIdentities.size;

  return {
    generatedAt: new Date().toISOString(),
    phase: '2P',
    mode: 'publish_readiness_review',
    mutationPerformed: false,
    gtmWriteCallsMade: false,
    gtmVersionCreated: false,
    gtmPublished: false,
    sourceArtifacts: [...SOURCE_ARTIFACTS],
    prerequisites: {
      phase2NConfirmed: true,
      phase2OConfirmed: true,
      previewQaPassed: true
    },
    workspaceReview: {
      workspacePath: live.workspace.path || '',
      workspaceName: live.workspace.name || '',
      expectedTagsPresent,
      expectedTriggersPresent,
      expectedVariablesPresent,
      measurementIdConfirmed,
      duplicateRisk,
      expectedPendingChanges: approvedIdentities.size,
      pendingChanges: workspaceChanges.length,
      approvedPendingChanges,
      unexpectedObjects,
      mergeConflicts: live.mergeConflicts.length,
      forbiddenParametersFound,
      piiFound,
      rawClickIdsFound,
      changes: workspaceChanges,
      variableReview,
      triggerReview
    },
    tagReview,
    proposedVersion: {
      versionName: VERSION_NAME,
      versionNotes: [...VERSION_NOTES],
      createVersionApproved: false
    },
    rollbackPlan: {
      previousVersionRollbackRequired: true,
      rollbackSteps: [...ROLLBACK_STEPS]
    },
    recommendation: {
      publishReadinessStatus: ready
        ? 'ready_for_business_owner_publish_approval'
        : 'not_ready_for_publish',
      publishApproved: false,
      nextPhase: ready
        ? 'Phase 2Q - separately approved controlled GTM version/publish execution.'
        : 'Resolve Phase 2P review findings, then repeat the publish-readiness review.'
    },
    safety: {
      noGtmWrites: true,
      noGtmVersionCreated: true,
      noGtmPublish: true,
      googleAdsTouched: false,
      metaTouched: false,
      runtimeFilesTouched: false,
      secretsPrinted: false
    }
  };
}

function writeReview(root, review) {
  const jsonPath = path.join(root, 'docs', 'marketing-ops-gtm-publish-readiness-review.json');
  const markdownPath = path.join(root, 'docs', 'marketing-ops-gtm-publish-readiness-review.md');
  fs.writeFileSync(jsonPath, JSON.stringify(review, null, 2) + '\n', 'utf8');
  fs.writeFileSync(markdownPath, buildMarkdown(review), 'utf8');
  return { jsonPath, markdownPath };
}

async function runGtmPublishReadinessReview(root) {
  try {
    const review = await buildReview(root);
    const paths = writeReview(root, review);
    return { review, paths };
  } catch (error) {
    throw new Error(maskSecretsInText(readableGoogleError(error)));
  }
}

function printSummary(review, paths) {
  return [
    'GTM publish readiness review: COMPLETE',
    `- Mode: ${review.mode}`,
    `- Expected tags present: ${review.workspaceReview.expectedTagsPresent}`,
    `- Expected triggers present: ${review.workspaceReview.expectedTriggersPresent}`,
    `- Expected variables present: ${review.workspaceReview.expectedVariablesPresent}`,
    `- Duplicate risk: ${review.workspaceReview.duplicateRisk}`,
    `- Unexpected objects: ${review.workspaceReview.unexpectedObjects.length}`,
    `- Forbidden parameters found: ${review.workspaceReview.forbiddenParametersFound.length}`,
    `- PII found: ${review.workspaceReview.piiFound.length}`,
    `- Raw click IDs found: ${review.workspaceReview.rawClickIdsFound.length}`,
    `- Publish readiness: ${review.recommendation.publishReadinessStatus}`,
    `- Publish approved: ${review.recommendation.publishApproved}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    'Read-only GTM GET/list calls only. No GTM version was created and GTM was not published.'
  ];
}

module.exports = {
  buildMarkdown,
  buildReview,
  printSummary,
  runGtmPublishReadinessReview,
  validatePrerequisites
};
