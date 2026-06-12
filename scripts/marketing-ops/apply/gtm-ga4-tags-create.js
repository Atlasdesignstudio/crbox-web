'use strict';

const fs = require('fs');
const path = require('path');
const { EXPECTED } = require('../config');
const { buildReview } = require('../gtm-ga4-tags-payload-review');
const { getGoogleAccessToken, googleApiGet, googleApiPost, readableGoogleError } = require('../google-auth');
const { maskSecretsInText } = require('../utils');
const { parseApplyArgs } = require('./apply-policy');
const { writeGa4EventTagsCreateResult } = require('./gtm-ga4-tags-create-result');

const GTM_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';
const REVIEW_ARTIFACT = 'docs/marketing-ops-ga4-event-tags-payload-review.json';
const EXECUTION_COMMAND = 'MARKETING_AGENT_MODE=controlled_create MARKETING_AGENT_ENABLE_WRITES=true MARKETING_AGENT_GTM_CREATE_ENABLED=true npm run marketing:apply:gtm:ga4-tags:create -- --platform gtm --all --confirm-human-approval';

const APPROVED_TAGS = Object.freeze([
  {
    actionId: 'gtm:create_ga4_event_tag:quote_request_start',
    tagName: 'GA4 - quote_request_start',
    eventName: 'quote_request_start',
    triggerName: 'CE - quote_request_start',
    allowedParameters: [
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
      'page_type'
    ]
  },
  {
    actionId: 'gtm:create_ga4_event_tag:quote_request_submit_success',
    tagName: 'GA4 - quote_request_submit_success',
    eventName: 'quote_request_submit_success',
    triggerName: 'CE - quote_request_submit_success',
    allowedParameters: [
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
      'value_bucket'
    ]
  },
  {
    actionId: 'gtm:create_ga4_event_tag:contact_form_submit_success',
    tagName: 'GA4 - contact_form_submit_success',
    eventName: 'contact_form_submit_success',
    triggerName: 'CE - contact_form_submit_success',
    allowedParameters: [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'gclid_present',
      'fbclid_present',
      'attribution_touch',
      'form_name'
    ]
  }
]);

const FORBIDDEN_PARAMETER_PATTERN = /^(gclid|fbclid|email|name|phone|address|company|message|item_description|product_description|reference_number|exact_value|exact_weight)$/i;

function readReviewArtifact(root) {
  const artifactPath = path.join(root, REVIEW_ARTIFACT);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Required Phase 2M artifact is missing: ${REVIEW_ARTIFACT}`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
}

function parameterValue(entity, key) {
  return (entity.parameter || []).find((item) => item.key === key)?.value || '';
}

function eventParameterMap(entity) {
  const table = (entity.parameter || []).find((item) => item.key === 'eventSettingsTable');
  const output = {};
  for (const row of table?.list || []) {
    const name = (row.map || []).find((item) => item.key === 'parameter')?.value || '';
    const value = (row.map || []).find((item) => item.key === 'parameterValue')?.value || '';
    if (name) output[name] = value;
  }
  return output;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sameValues(left, right) {
  return [...left].sort().join('\n') === [...right].sort().join('\n');
}

function validateTagDefinition(tag, approved) {
  const errors = [];
  const payload = tag.payload || {};
  const parameters = tag.parameters || [];
  const parameterNames = parameters.map((item) => item.parameter);
  const payloadParameterMap = eventParameterMap(payload);

  if (tag.tagName !== approved.tagName) errors.push(`Unexpected tag name: ${tag.tagName}`);
  if (tag.eventName !== approved.eventName) errors.push(`Unexpected event name for ${approved.tagName}.`);
  if (tag.triggerName !== approved.triggerName) errors.push(`Unexpected trigger for ${approved.tagName}.`);
  if (tag.status !== 'would_create') errors.push(`${approved.tagName} must have status would_create.`);
  if (!tag.triggerExists || !tag.triggerId) errors.push(`${approved.tagName} is missing its approved trigger.`);
  if (parameters.some((item) => !item.variableExists || item.blocked)) {
    errors.push(`${approved.tagName} has a missing or blocked GTM variable.`);
  }
  if (!sameValues(parameterNames, approved.allowedParameters)) {
    errors.push(`${approved.tagName} parameter names do not match the approved allowlist.`);
  }
  if (parameterNames.some((name) => FORBIDDEN_PARAMETER_PATTERN.test(name))) {
    errors.push(`${approved.tagName} contains a forbidden raw click ID or PII parameter.`);
  }
  if (payload.name !== approved.tagName || payload.type !== 'gaawe') {
    errors.push(`${approved.tagName} payload must be a gaawe tag with the approved name.`);
  }
  if (parameterValue(payload, 'eventName') !== approved.eventName) {
    errors.push(`${approved.tagName} payload eventName does not match.`);
  }
  if (parameterValue(payload, 'measurementIdOverride') !== EXPECTED.ga4MeasurementId) {
    errors.push(`${approved.tagName} payload must use the existing GA4 measurement ID.`);
  }
  if (parameterValue(payload, 'sendEcommerceData') !== 'false') {
    errors.push(`${approved.tagName} payload must keep ecommerce data disabled.`);
  }
  if (!sameValues(Object.keys(payloadParameterMap), approved.allowedParameters)) {
    errors.push(`${approved.tagName} payload parameter table does not match the approved allowlist.`);
  }
  if (parameters.some((item) => payloadParameterMap[item.parameter] !== item.variableReference)) {
    errors.push(`${approved.tagName} payload variable references differ from the reviewed mapping.`);
  }
  if (!sameValues((payload.firingTriggerId || []).map(String), [String(tag.triggerId)])) {
    errors.push(`${approved.tagName} payload firing trigger does not match the reviewed trigger.`);
  }

  return errors;
}

function validateReview(review) {
  const errors = [];
  if (review.phase !== '2M') errors.push('Payload review phase must be 2M.');
  if (review.mode !== 'review_only') errors.push('Payload review mode must be review_only.');
  if (review.mutationPerformed !== false || review.gtmWriteCallsMade !== false) {
    errors.push('Phase 2M artifact must confirm no mutations or GTM write calls.');
  }
  if (review.gtmPublished !== false || review.recommendation?.publishApproved !== false) {
    errors.push('Phase 2M artifact must keep GTM publishing blocked.');
  }
  if (review.summary?.currentBatch !== 3 || review.summary?.wouldCreate !== 3) {
    errors.push('Phase 2M artifact must contain exactly 3 would_create tags.');
  }
  if (review.summary?.alreadyExists !== 0 || review.summary?.blocked !== 0) {
    errors.push('Phase 2M artifact must contain no existing or blocked current-batch tags.');
  }
  if (!review.summary?.allRequiredTriggersExist || !review.summary?.allRequiredVariablesExist) {
    errors.push('All required triggers and variables must exist.');
  }
  if (!review.safety?.rawGclidExcluded || !review.safety?.rawFbclidExcluded || !review.safety?.piiExcluded) {
    errors.push('Raw click IDs and PII must be excluded.');
  }

  const tags = review.proposedTags || [];
  if (tags.length !== APPROVED_TAGS.length) errors.push('Proposed tag count must be exactly 3.');
  for (const approved of APPROVED_TAGS) {
    const tag = tags.find((item) => item.tagName === approved.tagName);
    if (!tag) {
      errors.push(`Approved tag is missing: ${approved.tagName}.`);
      continue;
    }
    errors.push(...validateTagDefinition(tag, approved));
  }
  for (const tag of tags) {
    if (!APPROVED_TAGS.some((approved) => approved.tagName === tag.tagName)) {
      errors.push(`Unapproved tag is present: ${tag.tagName}.`);
    }
  }

  return errors;
}

function selectTags(review, options) {
  const tags = review.proposedTags || [];
  if (options.all) return tags;
  const selectedIds = new Set(options.actionIds || []);
  return APPROVED_TAGS
    .filter((approved) => selectedIds.has(approved.actionId))
    .map((approved) => tags.find((tag) => tag.tagName === approved.tagName))
    .filter(Boolean);
}

function evaluatePolicy(review, liveReview, argv, env = process.env) {
  const options = parseApplyArgs(argv);
  const gateFailures = [
    ...validateReview(review),
    ...validateReview(liveReview)
  ];
  const knownActionIds = new Set(APPROVED_TAGS.map((item) => item.actionId));
  const unknownActionIds = options.actionIds.filter((id) => !knownActionIds.has(id));
  const selectedTags = selectTags(liveReview, options);

  if ((env.MARKETING_AGENT_MODE || '') !== 'controlled_create') {
    gateFailures.push('MARKETING_AGENT_MODE must be controlled_create.');
  }
  if (env.MARKETING_AGENT_ENABLE_WRITES !== 'true') {
    gateFailures.push('MARKETING_AGENT_ENABLE_WRITES must be true.');
  }
  if (env.MARKETING_AGENT_GTM_CREATE_ENABLED !== 'true') {
    gateFailures.push('MARKETING_AGENT_GTM_CREATE_ENABLED must be true.');
  }
  if (options.platform !== 'gtm') gateFailures.push('CLI flag --platform gtm is required.');
  if (!options.confirmHumanApproval) gateFailures.push('CLI flag --confirm-human-approval is required.');
  if (!options.all && options.actionIds.length === 0) {
    gateFailures.push('CLI flag --all or at least one approved --action-id is required.');
  }
  if (unknownActionIds.length) {
    gateFailures.push(`Unknown or unapproved action IDs: ${unknownActionIds.join(', ')}.`);
  }
  if (selectedTags.length === 0) gateFailures.push('At least one approved GA4 Event tag must be selected.');
  if (selectedTags.some((tag) => tag.status !== 'would_create')) {
    gateFailures.push('Every selected tag must still have status would_create.');
  }

  for (const tag of selectedTags) {
    const reviewedTag = (review.proposedTags || []).find((item) => item.tagName === tag.tagName);
    if (!reviewedTag || stableJson(reviewedTag.payload) !== stableJson(tag.payload)) {
      gateFailures.push(`${tag.tagName} live payload differs from the approved Phase 2M artifact.`);
    }
  }

  return {
    executionEnabled: gateFailures.length === 0,
    executionMode: 'gtm_ga4_event_tags_controlled_create',
    gateFailures: [...new Set(gateFailures)],
    options,
    selectedTags,
    approvedActionIds: APPROVED_TAGS.map((item) => item.actionId)
  };
}

function tagMatches(tag, proposed) {
  return tag.name === proposed.tagName
    || (tag.type === 'gaawe' && parameterValue(tag, 'eventName') === proposed.eventName);
}

function tagMatchesPayload(tag, proposed) {
  const expectedMap = eventParameterMap(proposed.payload);
  const actualMap = eventParameterMap(tag);
  return tag.name === proposed.tagName
    && tag.type === 'gaawe'
    && parameterValue(tag, 'eventName') === proposed.eventName
    && parameterValue(tag, 'measurementIdOverride') === EXPECTED.ga4MeasurementId
    && sameValues((tag.firingTriggerId || []).map(String), [String(proposed.triggerId)])
    && stableJson(actualMap) === stableJson(expectedMap);
}

async function listTags(accessToken, workspacePath) {
  const data = await googleApiGet(`${GTM_BASE}/${workspacePath}/tags`, accessToken);
  return data.tag || [];
}

function baseResult(review, policy) {
  return {
    generatedAt: new Date().toISOString(),
    phase: '2N',
    mode: 'controlled_create',
    platform: 'gtm',
    status: 'not_executed',
    mutationPerformed: false,
    gtmWriteCallsMade: false,
    gtmPublished: false,
    gtmVersionCreated: false,
    sourceArtifacts: [REVIEW_ARTIFACT],
    executionCommand: EXECUTION_COMMAND,
    selectedActionCount: policy.selectedTags.length,
    preExecutionValidation: {
      phase2MConfirmed: review.phase === '2M',
      approvedTags: policy.selectedTags.length,
      blocked: review.summary?.blocked ?? null,
      allRequiredTriggersExist: Boolean(review.summary?.allRequiredTriggersExist),
      allRequiredVariablesExist: Boolean(review.summary?.allRequiredVariablesExist),
      rawGclidExcluded: Boolean(review.safety?.rawGclidExcluded),
      rawFbclidExcluded: Boolean(review.safety?.rawFbclidExcluded),
      piiExcluded: Boolean(review.safety?.piiExcluded)
    },
    attemptedActions: [],
    createdTags: [],
    skippedExisting: [],
    failedActions: [],
    stoppedOnError: false,
    postCreateVerification: {
      tagsExist: false,
      duplicateRisk: 0,
      unexpectedCreatedObjects: [],
      variablesCreated: 0,
      triggersCreated: 0,
      tagsCreated: 0,
      versionsCreated: 0,
      gtmPublished: false,
      finalVerificationStatus: 'not_run'
    },
    safety: {
      noGtmVersionCreated: true,
      noGtmPublish: true,
      googleAdsTouched: false,
      metaTouched: false,
      runtimeFilesTouched: false,
      secretsPrinted: false,
      rawClickIdsExcluded: true,
      piiExcluded: true
    },
    recommendation: {
      publishApproved: false,
      nextPhase: 'GTM Preview QA for newly created GA4 Event Tags'
    },
    mutationStatement: 'No GTM mutations were performed.'
  };
}

async function runGtmGa4TagsControlledCreate(root, argv) {
  let approvedReview;
  let liveReview;
  let policy;

  try {
    approvedReview = readReviewArtifact(root);
    liveReview = await buildReview(root);
    policy = evaluatePolicy(approvedReview, liveReview, argv);
  } catch (error) {
    const result = {
      ...baseResult({ summary: {}, safety: {} }, { selectedTags: [] }),
      status: 'failed',
      failedActions: [{
        actionId: 'pre_execution_validation',
        status: 'failed',
        error: maskSecretsInText(readableGoogleError(error))
      }],
      stoppedOnError: true,
      mutationStatement: 'No GTM mutations were performed because pre-execution validation failed.'
    };
    const paths = writeGa4EventTagsCreateResult(root, result);
    return { result, paths, exitCode: 1 };
  }

  const result = baseResult(approvedReview, policy);
  if (!policy.executionEnabled) {
    result.status = 'refused';
    result.gateFailures = policy.gateFailures;
    result.mutationStatement = 'No GTM mutations were performed because the Phase 2N controlled-create safety gates did not pass.';
    const paths = writeGa4EventTagsCreateResult(root, result);
    return { result, paths, exitCode: 1 };
  }

  let accessToken;
  try {
    accessToken = await getGoogleAccessToken();
  } catch (error) {
    result.status = 'failed';
    result.failedActions.push({
      actionId: 'oauth_refresh',
      status: 'failed',
      error: readableGoogleError(error)
    });
    result.stoppedOnError = true;
    result.mutationStatement = 'No GTM mutations were performed because OAuth refresh failed before any GTM create call.';
    const paths = writeGa4EventTagsCreateResult(root, result);
    return { result, paths, exitCode: 1 };
  }

  const workspacePath = liveReview.liveReadOnlyAudit.workspacePath;
  const beforeTags = await listTags(accessToken, workspacePath);
  const beforeIds = new Set(beforeTags.map((tag) => String(tag.tagId || tag.path || '')));

  for (const proposed of policy.selectedTags) {
    const approved = APPROVED_TAGS.find((item) => item.tagName === proposed.tagName);
    result.attemptedActions.push({
      actionId: approved.actionId,
      action: 'create_ga4_event_tag',
      tagName: proposed.tagName,
      eventName: proposed.eventName,
      triggerName: proposed.triggerName
    });

    try {
      const currentTags = await listTags(accessToken, workspacePath);
      const existing = currentTags.find((tag) => tagMatches(tag, proposed));
      if (existing) {
        result.skippedExisting.push({
          actionId: approved.actionId,
          action: 'create_ga4_event_tag',
          tagName: proposed.tagName,
          eventName: proposed.eventName,
          status: 'skipped_existing',
          existingTagId: existing.tagId || ''
        });
        continue;
      }

      result.gtmWriteCallsMade = true;
      const created = await googleApiPost(`${GTM_BASE}/${workspacePath}/tags`, accessToken, proposed.payload);
      result.createdTags.push({
        actionId: approved.actionId,
        action: 'create_ga4_event_tag',
        tagName: proposed.tagName,
        eventName: proposed.eventName,
        triggerName: proposed.triggerName,
        triggerId: proposed.triggerId,
        tagId: created.tagId || '',
        parameters: proposed.parameters.map((item) => ({
          parameter: item.parameter,
          variableReference: item.variableReference
        })),
        status: 'created'
      });
      result.mutationPerformed = true;
    } catch (error) {
      result.failedActions.push({
        actionId: approved.actionId,
        action: 'create_ga4_event_tag',
        tagName: proposed.tagName,
        eventName: proposed.eventName,
        status: 'failed',
        error: readableGoogleError(error)
      });
      result.stoppedOnError = true;
      break;
    }
  }

  try {
    const afterTags = await listTags(accessToken, workspacePath);
    const expectedMatches = policy.selectedTags.map((proposed) => ({
      proposed,
      matches: afterTags.filter((tag) => tagMatches(tag, proposed))
    }));
    const createdIds = new Set(result.createdTags.map((tag) => String(tag.tagId)));
    const unexpectedCreatedObjects = afterTags
      .filter((tag) => {
        const id = String(tag.tagId || tag.path || '');
        return id && !beforeIds.has(id) && !createdIds.has(id);
      })
      .map((tag) => ({
        tagId: tag.tagId || '',
        name: tag.name || '',
        type: tag.type || ''
      }));
    const duplicateRisk = expectedMatches.reduce((total, item) =>
      total + Math.max(0, item.matches.length - 1), 0);
    const tagsExist = expectedMatches.every((item) =>
      item.matches.length === 1 && tagMatchesPayload(item.matches[0], item.proposed)
    );
    const finalVerificationStatus = tagsExist
      && duplicateRisk === 0
      && unexpectedCreatedObjects.length === 0
      && result.failedActions.length === 0
      ? 'pass'
      : 'failed';

    result.postCreateVerification = {
      tagsExist,
      duplicateRisk,
      unexpectedCreatedObjects,
      variablesCreated: 0,
      triggersCreated: 0,
      tagsCreated: result.createdTags.length,
      versionsCreated: 0,
      gtmPublished: false,
      finalVerificationStatus
    };
  } catch (error) {
    result.postCreateVerification.finalVerificationStatus = `failed: ${readableGoogleError(error)}`;
  }

  if (result.failedActions.length) {
    result.status = result.mutationPerformed ? 'partial' : 'failed';
  } else if (result.postCreateVerification.finalVerificationStatus === 'pass') {
    result.status = 'executed';
  } else {
    result.status = result.mutationPerformed ? 'partial' : 'failed';
  }

  result.mutationStatement = result.mutationPerformed
    ? 'Only the selected approved GA4 Event tags were created in the GTM workspace. No variables, triggers, versions, publications, Google Ads objects, Meta objects, or runtime files were changed.'
    : 'No GTM mutations were performed.';

  const paths = writeGa4EventTagsCreateResult(root, result);
  return {
    result,
    paths,
    exitCode: result.status === 'executed' ? 0 : 1
  };
}

function outputLines(run) {
  const { result, paths } = run;
  return [
    `GTM GA4 Event Tags controlled create: ${String(result.status || 'unknown').toUpperCase()}`,
    `- Selected tags: ${result.selectedActionCount}`,
    `- Created tags: ${result.createdTags.length}`,
    `- Skipped existing: ${result.skippedExisting.length}`,
    `- Failed actions: ${result.failedActions.length}`,
    `- Mutation performed: ${result.mutationPerformed}`,
    `- GTM version created: ${result.gtmVersionCreated}`,
    `- GTM published: ${result.gtmPublished}`,
    `- Final verification: ${result.postCreateVerification.finalVerificationStatus}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    ...(result.gateFailures || []).map((failure) => `- Gate failure: ${failure}`)
  ];
}

module.exports = {
  APPROVED_TAGS,
  evaluatePolicy,
  outputLines,
  runGtmGa4TagsControlledCreate,
  validateReview
};
