'use strict';

const fs = require('fs');
const path = require('path');
const { EXPECTED } = require('./config');
const { envValue, maskSecretsInText } = require('./utils');
const { getGoogleAccessToken, googleApiGet, readableGoogleError } = require('./google-auth');

const GTM_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';
const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-gtm-create-result.json',
  'docs/marketing-ops-gtm-preview-qa.json',
  'docs/marketing-ops-gtm-preflight.json'
]);
const CORE_PARAMETERS = Object.freeze([
  ['utm_source', 'DLV - utm_source'],
  ['utm_medium', 'DLV - utm_medium'],
  ['utm_campaign', 'DLV - utm_campaign'],
  ['utm_content', 'DLV - utm_content'],
  ['utm_term', 'DLV - utm_term'],
  ['gclid_present', 'DLV - gclid_present'],
  ['fbclid_present', 'DLV - fbclid_present'],
  ['attribution_touch', 'DLV - attribution_touch']
]);
const PAGE_PARAMETERS = Object.freeze([
  ['page_path', 'dlv - page_path'],
  ['page_name', 'dlv - page_name'],
  ['page_type', 'dlv - page_type']
]);
const QUOTE_PARAMETERS = Object.freeze([
  ['service_type', 'dlv - service_type'],
  ['shipping_mode', 'dlv - shipping_mode'],
  ['destination_country', 'dlv - destination_country'],
  ['weight_bucket', 'dlv - weight_bucket'],
  ['value_bucket', 'dlv - value_bucket']
]);
const FORM_PARAMETERS = Object.freeze([
  ['form_name', 'dlv - form_name']
]);
const PROPOSED_TAGS = Object.freeze([
  {
    tagName: 'GA4 - quote_request_start',
    eventName: 'quote_request_start',
    triggerName: 'CE - quote_request_start',
    purpose: 'Start of quote intent.',
    priority: 'high',
    publishBlocker: true,
    parameterGroups: [CORE_PARAMETERS, PAGE_PARAMETERS]
  },
  {
    tagName: 'GA4 - quote_request_submit_success',
    eventName: 'quote_request_submit_success',
    triggerName: 'CE - quote_request_submit_success',
    purpose: 'Successful quote request and primary conversion.',
    priority: 'critical',
    publishBlocker: true,
    keyEventCandidate: true,
    parameterGroups: [CORE_PARAMETERS, PAGE_PARAMETERS, QUOTE_PARAMETERS]
  },
  {
    tagName: 'GA4 - contact_form_submit_success',
    eventName: 'contact_form_submit_success',
    triggerName: 'CE - contact_form_submit_success',
    purpose: 'Successful contact form lead.',
    priority: 'high',
    publishBlocker: true,
    parameterGroups: [CORE_PARAMETERS, FORM_PARAMETERS]
  }
]);
const OPTIONAL_EVENTS = Object.freeze([
  'calculator_result',
  'signup_success',
  'whatsapp_click'
]);
const EXCLUDED_FIELDS = Object.freeze([
  'raw gclid',
  'raw fbclid',
  'name',
  'email',
  'phone',
  'address',
  'company',
  'message',
  'item description',
  'reference number',
  'exact value',
  'exact weight',
  'GTM publish',
  'GTM version',
  'Google Ads',
  'Meta',
  'runtime files'
]);

function readJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required Phase 2M source artifact is missing: ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateSourceArtifacts(root) {
  const phase2J = readJson(root, SOURCE_ARTIFACTS[0]);
  const phase2K = readJson(root, SOURCE_ARTIFACTS[1]);
  readJson(root, SOURCE_ARTIFACTS[2]);
  const errors = [];

  if (phase2J.phase !== '2J' || phase2J.status !== 'executed') {
    errors.push('Phase 2J must be present with executed status.');
  }
  if (phase2J.createdVariables !== 8 || phase2J.createdTriggers !== 3) {
    errors.push('Phase 2J must record 8 created variables and 3 created triggers.');
  }
  if (phase2J.gtmPublished !== false) {
    errors.push('Phase 2J must confirm GTM was not published.');
  }
  if (phase2K.phase !== '2K' || phase2K.recommendation?.publishApproved !== false) {
    errors.push('Phase 2K must be present with publishApproved false.');
  }
  if (errors.length) {
    throw new Error(`Phase 2M review refused: ${errors.join(' ')}`);
  }
}

function parameterValues(entity) {
  const values = [];
  const walk = (value) => {
    if (value == null) return;
    if (typeof value === 'string') {
      values.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === 'object') {
      Object.values(value).forEach(walk);
    }
  };
  walk(entity.parameter || []);
  walk(entity.customEventFilter || []);
  return values;
}

function parameterValue(entity, key) {
  return (entity.parameter || []).find((item) => item.key === key)?.value || '';
}

function chooseWorkspace(workspaces, plannedPath) {
  return workspaces.find((workspace) => workspace.path === plannedPath)
    || workspaces.find((workspace) => /default/i.test(workspace.name || ''))
    || workspaces[0]
    || null;
}

function variableReference(name) {
  return `{{${name}}}`;
}

function eventParameterRow(parameter, variableName) {
  return {
    type: 'map',
    map: [
      {
        type: 'template',
        key: 'parameter',
        value: parameter
      },
      {
        type: 'template',
        key: 'parameterValue',
        value: variableReference(variableName)
      }
    ]
  };
}

function buildGa4EventTagPayload(tag, triggerId, parameters, measurementId) {
  return {
    name: tag.tagName,
    type: 'gaawe',
    parameter: [
      {
        type: 'boolean',
        key: 'sendEcommerceData',
        value: 'false'
      },
      {
        type: 'list',
        key: 'eventSettingsTable',
        list: parameters.map((item) => eventParameterRow(item.parameter, item.variableName))
      },
      {
        type: 'template',
        key: 'eventName',
        value: tag.eventName
      },
      {
        type: 'template',
        key: 'measurementIdOverride',
        value: measurementId
      }
    ],
    firingTriggerId: [String(triggerId)]
  };
}

function tagSummary(tag) {
  return {
    name: tag.name || '',
    tagId: tag.tagId || '',
    type: tag.type || '',
    eventName: parameterValue(tag, 'eventName'),
    firingTriggerId: tag.firingTriggerId || []
  };
}

function triggerEventName(trigger) {
  for (const filter of trigger.customEventFilter || []) {
    const eventParameter = (filter.parameter || []).find((item) => item.key === 'arg1');
    if (eventParameter?.value) return eventParameter.value;
  }
  return '';
}

function relevantExistingResources(variables, triggers, tags) {
  const variableNames = new Set([
    ...CORE_PARAMETERS.map(([, name]) => name),
    ...PAGE_PARAMETERS.map(([, name]) => name),
    ...QUOTE_PARAMETERS.map(([, name]) => name),
    ...FORM_PARAMETERS.map(([, name]) => name),
    'GA4 Measurement ID'
  ]);
  const triggerNames = new Set([
    ...PROPOSED_TAGS.map((item) => item.triggerName),
    ...OPTIONAL_EVENTS.map((eventName) => `CE - ${eventName}`)
  ]);

  return {
    measurementIdVariable: variables
      .filter((variable) => variable.name === 'GA4 Measurement ID')
      .map((variable) => ({
        name: variable.name,
        variableId: variable.variableId || '',
        type: variable.type || '',
        configuredValue: parameterValue(variable, 'value')
      }))[0] || null,
    ga4ConfigurationTag: tags
      .filter((tag) => tag.name === 'GA4 Configuration')
      .map((tag) => ({
        name: tag.name,
        tagId: tag.tagId || '',
        type: tag.type || '',
        configuredTagId: parameterValue(tag, 'tagId')
      }))[0] || null,
    existingTriggers: triggers
      .filter((trigger) => triggerNames.has(trigger.name))
      .map((trigger) => ({
        name: trigger.name,
        triggerId: trigger.triggerId || '',
        type: trigger.type || '',
        eventName: triggerEventName(trigger)
      })),
    existingVariables: variables
      .filter((variable) => variableNames.has(variable.name))
      .map((variable) => ({
        name: variable.name,
        variableId: variable.variableId || '',
        type: variable.type || '',
        dataLayerVariableName: parameterValue(variable, 'name')
      })),
    existingGa4EventTags: tags
      .filter((tag) => tag.type === 'gaawe')
      .map(tagSummary)
  };
}

function buildProposedTag(definition, variables, triggers, tags, measurementId) {
  const variableByName = new Map(variables.map((variable) => [variable.name, variable]));
  const trigger = triggers.find((item) =>
    item.name === definition.triggerName
    && triggerEventName(item) === definition.eventName
  );
  const existingTag = tags.find((tag) =>
    tag.name === definition.tagName
    || (tag.type === 'gaawe' && parameterValue(tag, 'eventName') === definition.eventName)
  );
  const parameters = definition.parameterGroups.flat().map(([parameter, variableName]) => ({
    parameter,
    variableName,
    variableReference: variableReference(variableName),
    variableExists: variableByName.has(variableName),
    blocked: !variableByName.has(variableName)
  }));
  const missingVariables = parameters.filter((item) => !item.variableExists).map((item) => item.variableName);
  let status = 'would_create';
  const notes = [];

  if (existingTag) {
    status = 'already_exists';
    notes.push(`An existing GA4 Event tag already matches by name or event: ${existingTag.name}.`);
  } else if (!trigger || missingVariables.length) {
    status = 'blocked';
    if (!trigger) notes.push(`Required trigger is missing: ${definition.triggerName}.`);
    if (missingVariables.length) notes.push(`Required variables are missing: ${missingVariables.join(', ')}.`);
  } else {
    notes.push('Trigger and all approved parameter variables exist. Payload is ready for human review before a separate controlled-create phase.');
  }

  return {
    tagName: definition.tagName,
    eventName: definition.eventName,
    triggerName: definition.triggerName,
    triggerId: trigger?.triggerId || '',
    triggerExists: Boolean(trigger),
    parameters,
    payload: status === 'blocked'
      ? null
      : buildGa4EventTagPayload(definition, trigger.triggerId, parameters, measurementId),
    status,
    priority: definition.priority,
    publishBlocker: definition.publishBlocker,
    purpose: definition.purpose,
    keyEventCandidate: Boolean(definition.keyEventCandidate),
    notes
  };
}

function buildRecommendedNextBatch(optionalEvents, triggers, tags) {
  return optionalEvents.map((eventName) => {
    const trigger = triggers.find((item) =>
      item.name === `CE - ${eventName}` && triggerEventName(item) === eventName
    );
    const tag = tags.find((item) =>
      item.type === 'gaawe' && parameterValue(item, 'eventName') === eventName
    );
    return {
      eventName,
      triggerExists: Boolean(trigger),
      tagExists: Boolean(tag),
      status: trigger && tag ? 'already_exists_no_action' : 'recommended_next_batch',
      notes: trigger && tag
        ? `Existing trigger ${trigger.name} and GA4 Event tag ${tag.name} were confirmed by read-only GTM list calls.`
        : 'Not fully confirmed for the current batch; review in a later phase.'
    };
  });
}

async function loadLiveGtmState(root) {
  const preflight = readJson(root, SOURCE_ARTIFACTS[2]);
  const accountId = envValue('GTM_ACCOUNT_ID');
  const configuredContainerId = envValue('GTM_CONTAINER_ID') || EXPECTED.gtmContainerId;
  const accessToken = await getGoogleAccessToken();
  const account = await googleApiGet(`${GTM_BASE}/accounts/${accountId}`, accessToken);
  const containersData = await googleApiGet(`${GTM_BASE}/${account.path}/containers`, accessToken);
  const container = (containersData.container || []).find((item) =>
    item.containerId === configuredContainerId
    || item.publicId === configuredContainerId
  );
  if (!container) throw new Error('Configured GTM container was not found by read-only list call.');

  const workspacesData = await googleApiGet(`${GTM_BASE}/${container.path}/workspaces`, accessToken);
  const workspace = chooseWorkspace(workspacesData.workspace || [], preflight.workspace?.workspacePath || '');
  if (!workspace) throw new Error('No GTM workspace was available for read-only payload review.');

  const [variablesData, triggersData, tagsData] = await Promise.all([
    googleApiGet(`${GTM_BASE}/${workspace.path}/variables`, accessToken),
    googleApiGet(`${GTM_BASE}/${workspace.path}/triggers`, accessToken),
    googleApiGet(`${GTM_BASE}/${workspace.path}/tags`, accessToken)
  ]);

  return {
    account,
    container,
    workspace,
    variables: variablesData.variable || [],
    triggers: triggersData.trigger || [],
    tags: tagsData.tag || []
  };
}

async function buildReview(root) {
  validateSourceArtifacts(root);
  const live = await loadLiveGtmState(root);
  const resources = relevantExistingResources(live.variables, live.triggers, live.tags);
  const measurementId = resources.measurementIdVariable?.configuredValue || EXPECTED.ga4MeasurementId;
  const proposedTags = PROPOSED_TAGS.map((definition) =>
    buildProposedTag(definition, live.variables, live.triggers, live.tags, measurementId)
  );
  const recommendedNextBatch = buildRecommendedNextBatch(OPTIONAL_EVENTS, live.triggers, live.tags);
  const blockers = [];

  for (const tag of proposedTags) {
    if (tag.status === 'blocked') blockers.push(...tag.notes);
    if (tag.status === 'would_create') {
      blockers.push(`${tag.tagName} is missing and must be created and validated before GTM publish can be considered.`);
    }
  }

  const wouldCreate = proposedTags.filter((tag) => tag.status === 'would_create').length;
  const alreadyExists = proposedTags.filter((tag) => tag.status === 'already_exists').length;
  const blocked = proposedTags.filter((tag) => tag.status === 'blocked').length;

  return {
    generatedAt: new Date().toISOString(),
    phase: '2M',
    mode: 'review_only',
    mutationPerformed: false,
    gtmWriteCallsMade: false,
    gtmPublished: false,
    sourceArtifacts: [...SOURCE_ARTIFACTS],
    prerequisites: {
      phase2JConfirmed: true,
      phase2KConfirmed: true,
      runtimeGapFixedManuallyInReplit: true,
      quoteRequestSubmitSuccessObservedAfterFix: true,
      gtmPublished: false
    },
    liveReadOnlyAudit: {
      workspacePath: live.workspace.path || '',
      workspaceName: live.workspace.name || '',
      variablesRead: true,
      triggersRead: true,
      tagsRead: true,
      apiCallsReadOnly: true
    },
    existingResources: resources,
    proposedTags,
    summary: {
      currentBatch: proposedTags.length,
      wouldCreate,
      alreadyExists,
      blocked,
      allRequiredTriggersExist: proposedTags.every((tag) => tag.triggerExists),
      allRequiredVariablesExist: proposedTags.every((tag) => tag.parameters.every((parameter) => parameter.variableExists))
    },
    excluded: [...EXCLUDED_FIELDS],
    recommendedNextBatch,
    blockers: [...new Set(blockers)],
    safety: {
      noGtmWrites: true,
      noGtmVersionCreated: true,
      noGtmPublish: true,
      rawGclidExcluded: true,
      rawFbclidExcluded: true,
      piiExcluded: true,
      googleAdsTouched: false,
      metaTouched: false,
      websiteRuntimeFilesTouched: false,
      secretsPrinted: false
    },
    recommendation: {
      readyForHumanReview: blocked === 0,
      readyForControlledCreateLater: blocked === 0 && wouldCreate > 0,
      publishApproved: false,
      nextPhase: 'Human review, then a separately approved controlled-create phase for the 3 GA4 Event tags, followed by GTM Preview validation. Publishing remains separate and blocked.'
    }
  };
}

function markdownPayload(payload) {
  return `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}

function buildMarkdown(review) {
  const rows = review.proposedTags.map((tag) =>
    `| ${tag.tagName} | \`${tag.eventName}\` | ${tag.triggerName} | **${tag.status}** | ${tag.priority} | ${tag.publishBlocker} |`
  );

  return [
    '# CRBOX Marketing Ops GA4 Event Tags Payload Review',
    '',
    `Generated: ${review.generatedAt}`,
    '',
    'Phase: **2M**',
    '',
    'Mode: **review_only**',
    '',
    '## Summary',
    '',
    `- Current-batch tags reviewed: ${review.summary.currentBatch}`,
    `- Would create: ${review.summary.wouldCreate}`,
    `- Already exists: ${review.summary.alreadyExists}`,
    `- Blocked: ${review.summary.blocked}`,
    `- All required triggers exist: ${review.summary.allRequiredTriggersExist}`,
    `- All required variables exist: ${review.summary.allRequiredVariablesExist}`,
    '- Payloads follow the existing GTM `gaawe` GA4 Event tag pattern.',
    '- Existing event tags use the current `G-B5BPHFRR18` measurement ID override.',
    '',
    '## Context',
    '',
    '- Phase 2J created the approved variables and triggers without tags, versions, or publication.',
    '- Phase 2K blocked publish because new GA4 Event tags were absent.',
    '- The Replit runtime gap was fixed manually after Phase 2K, and `quote_request_submit_success` was subsequently observed with safe parameters.',
    '',
    '## Prerequisites',
    '',
    ...Object.entries(review.prerequisites).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Existing GTM Resources Found',
    '',
    `- Measurement ID variable: ${review.existingResources.measurementIdVariable ? `\`${review.existingResources.measurementIdVariable.name}\`` : 'not found'}`,
    `- GA4 Configuration tag: ${review.existingResources.ga4ConfigurationTag ? `\`${review.existingResources.ga4ConfigurationTag.name}\`` : 'not found'}`,
    `- Relevant variables found: ${review.existingResources.existingVariables.length}`,
    `- Relevant triggers found: ${review.existingResources.existingTriggers.length}`,
    `- Existing GA4 Event tags audited: ${review.existingResources.existingGa4EventTags.length}`,
    '',
    '## Proposed GA4 Event Tags',
    '',
    '| Tag | GA4 event | Trigger | Status | Priority | Publish blocker |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    '## Exact Payloads',
    '',
    ...review.proposedTags.flatMap((tag) => [
      `### ${tag.tagName}`,
      '',
      `- Status: **${tag.status}**`,
      `- Trigger exists: ${tag.triggerExists}`,
      `- Purpose: ${tag.purpose}`,
      `- Key Event candidate: ${tag.keyEventCandidate}`,
      '',
      tag.payload ? markdownPayload(tag.payload) : '- Payload omitted because prerequisites are blocked.',
      ''
    ]),
    '## Parameter Mapping',
    '',
    ...review.proposedTags.flatMap((tag) => [
      `### ${tag.eventName}`,
      '',
      '| GA4 parameter | GTM variable | Exists |',
      '|---|---|---|',
      ...tag.parameters.map((parameter) =>
        `| \`${parameter.parameter}\` | \`${parameter.variableReference}\` | ${parameter.variableExists} |`
      ),
      ''
    ]),
    '## Excluded Fields And Actions',
    '',
    ...review.excluded.map((item) => `- ${item}`),
    '',
    '## PII Safety Statement',
    '',
    'The reviewed payloads exclude names, email addresses, phone numbers, addresses, companies, messages, item descriptions, reference numbers, exact values, exact weights, raw `gclid`, and raw `fbclid`. Only approved attribution flags, campaign values, page context, bucketed quote context, destination country, service type, shipping mode, and form name are included.',
    '',
    '## Recommended Next Batch',
    '',
    ...review.recommendedNextBatch.map((item) =>
      `- \`${item.eventName}\`: **${item.status}**. ${item.notes}`
    ),
    '',
    '## Blockers Or Risks',
    '',
    ...(review.blockers.length ? review.blockers.map((blocker) => `- ${blocker}`) : ['- No payload prerequisites are blocked.']),
    '',
    '## Recommendation',
    '',
    `- Ready for human review: **${review.recommendation.readyForHumanReview}**`,
    `- Ready for controlled create later: **${review.recommendation.readyForControlledCreateLater}**`,
    `- Publish approved: **${review.recommendation.publishApproved}**`,
    `- Next phase: ${review.recommendation.nextPhase}`,
    '',
    '## Safety Statement',
    '',
    ...Object.entries(review.safety).map(([key, value]) => `- ${key}: ${value}`),
    '',
    'This phase does not create GA4 tags and does not publish GTM.',
    '',
    'GTM publish remains blocked until GA4 event tags are created and validated in GTM Preview.'
  ].join('\n') + '\n';
}

function writeReview(root, review) {
  const jsonPath = path.join(root, 'docs', 'marketing-ops-ga4-event-tags-payload-review.json');
  const markdownPath = path.join(root, 'docs', 'marketing-ops-ga4-event-tags-payload-review.md');
  fs.writeFileSync(jsonPath, JSON.stringify(review, null, 2) + '\n', 'utf8');
  fs.writeFileSync(markdownPath, buildMarkdown(review), 'utf8');
  return { jsonPath, markdownPath };
}

async function runGtmGa4TagsPayloadReview(root) {
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
    'GTM GA4 Event Tags payload review: COMPLETE',
    `- Mode: ${review.mode}`,
    `- Current-batch tags: ${review.summary.currentBatch}`,
    `- Would create: ${review.summary.wouldCreate}`,
    `- Already exists: ${review.summary.alreadyExists}`,
    `- Blocked: ${review.summary.blocked}`,
    `- Required triggers exist: ${review.summary.allRequiredTriggersExist}`,
    `- Required variables exist: ${review.summary.allRequiredVariablesExist}`,
    `- Publish approved: ${review.recommendation.publishApproved}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    'Read-only GTM list calls only. No GTM writes, versions, or publications were performed.'
  ];
}

module.exports = {
  buildGa4EventTagPayload,
  buildMarkdown,
  buildReview,
  printSummary,
  runGtmGa4TagsPayloadReview
};
