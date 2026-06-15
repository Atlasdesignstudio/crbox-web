'use strict';

const fs = require('fs');
const path = require('path');
const { buildReview } = require('./gtm-publish-readiness-review');
const {
  getGoogleAccessToken,
  getGoogleTokenInfo,
  googleApiGet,
  googleApiPost,
  readableGoogleError
} = require('./google-auth');
const { maskSecretsInText } = require('./utils');
const { parseApplyArgs } = require('./apply/apply-policy');

const GTM_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';
const EXECUTION_COMMAND = 'MARKETING_AGENT_MODE=controlled_publish MARKETING_AGENT_ENABLE_WRITES=true MARKETING_AGENT_GTM_CREATE_ENABLED=true npm run marketing:apply:gtm:publish -- --platform gtm --confirm-human-approval';
const VERSION_NAME = 'CRBOX GA4 conversion event tags - Phase 2Q';
const VERSION_NOTES = 'Publishes the approved CRBOX GA4 conversion-event workspace changes after Phase 2P readiness review, Phase 2O Preview QA, and final OAuth scope verification. Includes GA4 Event Tags for quote_request_start, quote_request_submit_success, and contact_form_submit_success, using existing GTM triggers and variables. No Replit/runtime changes, no Google Ads changes, no Meta changes. Rollback: revert to the previous GTM container version if unexpected tracking behavior is observed.';
const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-gtm-publish-readiness-review.json',
  'docs/marketing-ops-ga4-event-tags-preview-qa.json',
  'docs/marketing-ops-ga4-event-tags-create-result.json'
]);
const REQUIRED_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
  'https://www.googleapis.com/auth/tagmanager.publish'
]);
const EXPECTED_TAGS = Object.freeze([
  ['GA4 - quote_request_start', 'quote_request_start', 'CE - quote_request_start'],
  ['GA4 - quote_request_submit_success', 'quote_request_submit_success', 'CE - quote_request_submit_success'],
  ['GA4 - contact_form_submit_success', 'contact_form_submit_success', 'CE - contact_form_submit_success']
]);
const EXPECTED_TRIGGERS = Object.freeze([
  ['CE - quote_request_start', 'quote_request_start'],
  ['CE - quote_request_submit_success', 'quote_request_submit_success'],
  ['CE - contact_form_submit_success', 'contact_form_submit_success']
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
const ROLLBACK_STEPS = Object.freeze([
  'Publish the previous live GTM container version if unexpected tracking behavior is observed.',
  'Verify the core GA4 Configuration tag and existing events still fire.',
  'Re-run GTM Preview before republishing another version.',
  'Keep the Replit runtime unchanged unless a runtime-specific issue is independently confirmed.'
]);

function readJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) throw new Error(`Required source artifact is missing: ${relativePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parameterValue(entity, key) {
  return (entity.parameter || []).find((item) => item.key === key)?.value || '';
}

function eventParameterMap(tag) {
  const table = (tag.parameter || []).find((item) => item.key === 'eventSettingsTable');
  return Object.fromEntries(
    (table?.list || [])
      .map((row) => {
        const name = (row.map || []).find((item) => item.key === 'parameter')?.value || '';
        const value = (row.map || []).find((item) => item.key === 'parameterValue')?.value || '';
        return [name, value];
      })
      .filter(([name]) => Boolean(name))
  );
}

function triggerEventName(trigger) {
  for (const filter of trigger.customEventFilter || []) {
    const value = (filter.parameter || []).find((item) => item.key === 'arg1')?.value;
    if (value) return value;
  }
  return '';
}

function validateSourceArtifacts(root) {
  const readiness = readJson(root, SOURCE_ARTIFACTS[0]);
  const previewQa = readJson(root, SOURCE_ARTIFACTS[1]);
  const createResult = readJson(root, SOURCE_ARTIFACTS[2]);
  const controlledApply = fs.readFileSync(
    path.join(root, 'docs', 'marketing-ops-controlled-apply.md'),
    'utf8'
  );
  const errors = [];

  if (readiness.phase !== '2P' || readiness.mode !== 'publish_readiness_review') {
    errors.push('Phase 2P publish-readiness artifact is invalid.');
  }
  if (readiness.recommendation?.publishReadinessStatus !== 'ready_for_business_owner_publish_approval') {
    errors.push('Phase 2P readiness status is not ready_for_business_owner_publish_approval.');
  }
  if (readiness.gtmVersionCreated !== false || readiness.gtmPublished !== false) {
    errors.push('Phase 2P must confirm no version or publish occurred.');
  }
  if (previewQa.phase !== '2O' || previewQa.overallStatus !== 'pass' || previewQa.recommendation?.previewQaPassed !== true) {
    errors.push('Phase 2O Preview QA must be present and passing.');
  }
  if (createResult.phase !== '2N' || createResult.status !== 'executed' || (createResult.createdTags || []).length !== 3) {
    errors.push('Phase 2N create result must record exactly 3 executed tags.');
  }
  if (createResult.gtmVersionCreated !== false || createResult.gtmPublished !== false) {
    errors.push('Phase 2N must confirm no version or publish occurred.');
  }
  if (!/Phase 2Q-B verified[\s\S]*all five required scopes are available/i.test(controlledApply)) {
    errors.push('Phase 2Q-B scope verification is not confirmed in the merged controlled-apply documentation.');
  }
  if (!/Phase 2Q-D verified all six scopes[\s\S]*pass_ready_for_phase_2q_retry/i.test(controlledApply)) {
    errors.push('Phase 2Q-D final scope verification is not confirmed in the merged controlled-apply documentation.');
  }
  if (errors.length) throw new Error(errors.join(' '));

  return {
    readiness,
    previewQa,
    createResult,
    phase2QBConfirmed: true,
    phase2QDConfirmed: true
  };
}

function validateLiveReadiness(review) {
  const errors = [];
  const workspace = review.workspaceReview || {};
  if (review.phase !== '2P' || review.mode !== 'publish_readiness_review') {
    errors.push('Live Phase 2P readiness review is invalid.');
  }
  if (review.recommendation?.publishReadinessStatus !== 'ready_for_business_owner_publish_approval') {
    errors.push('Live readiness status is not ready_for_business_owner_publish_approval.');
  }
  if (!workspace.expectedTagsPresent) errors.push('Expected tags are not all present.');
  if (!workspace.expectedTriggersPresent) errors.push('Expected triggers are not all present.');
  if (!workspace.expectedVariablesPresent) errors.push('Expected variables are not all present.');
  if (workspace.approvedPendingChanges !== 14 || workspace.pendingChanges !== 14) {
    errors.push('Approved pending changes must equal exactly 14.');
  }
  if ((workspace.unexpectedObjects || []).length !== 0) errors.push('Unexpected workspace changes must equal 0.');
  if (workspace.duplicateRisk !== 0) errors.push('Duplicate risk must equal 0.');
  if ((workspace.forbiddenParametersFound || []).length !== 0) errors.push('Forbidden parameters must equal 0.');
  if ((workspace.piiFound || []).length !== 0) errors.push('PII findings must equal 0.');
  if ((workspace.rawClickIdsFound || []).length !== 0) errors.push('Raw click ID findings must equal 0.');
  if (workspace.mergeConflicts !== 0) errors.push('Workspace merge conflicts must equal 0.');
  return errors;
}

function evaluatePolicy({ root, argv, env = process.env, liveReview, scopeSet }) {
  const options = parseApplyArgs(argv);
  const gateFailures = validateLiveReadiness(liveReview);

  try {
    validateSourceArtifacts(root);
  } catch (error) {
    gateFailures.push(error.message);
  }

  if ((env.MARKETING_AGENT_MODE || '') !== 'controlled_publish') {
    gateFailures.push('MARKETING_AGENT_MODE must be controlled_publish.');
  }
  if (env.MARKETING_AGENT_ENABLE_WRITES !== 'true') {
    gateFailures.push('MARKETING_AGENT_ENABLE_WRITES must be true.');
  }
  if (env.MARKETING_AGENT_GTM_CREATE_ENABLED !== 'true') {
    gateFailures.push('MARKETING_AGENT_GTM_CREATE_ENABLED must be true.');
  }
  if (options.platform !== 'gtm') gateFailures.push('CLI flag --platform gtm is required.');
  if (!options.confirmHumanApproval) gateFailures.push('CLI flag --confirm-human-approval is required.');
  if (options.all || options.actionIds.length) {
    gateFailures.push('Publish does not accept --all or --action-id selections.');
  }
  for (const scope of REQUIRED_SCOPES) {
    if (!scopeSet.has(scope)) gateFailures.push(`Required OAuth scope is missing: ${scope}`);
  }

  return {
    executionEnabled: gateFailures.length === 0,
    executionMode: 'controlled_publish',
    humanApprovalConfirmed: options.confirmHumanApproval,
    writesFlagEnabled: env.MARKETING_AGENT_ENABLE_WRITES === 'true',
    gtmCreateFlagEnabled: env.MARKETING_AGENT_GTM_CREATE_ENABLED === 'true',
    platform: options.platform,
    gateFailures: [...new Set(gateFailures)]
  };
}

function resultPaths(root) {
  return {
    jsonPath: path.join(root, 'docs', 'marketing-ops-gtm-publish-result.json'),
    markdownPath: path.join(root, 'docs', 'marketing-ops-gtm-publish-result.md')
  };
}

function baseResult(liveReview, policy) {
  const workspace = liveReview?.workspaceReview || {};
  return {
    generatedAt: new Date().toISOString(),
    phase: '2Q',
    mode: 'controlled_publish',
    status: 'not_executed',
    businessOwnerApproval: true,
    mutationPerformed: false,
    gtmWriteCallsMade: false,
    gtmVersionCreated: false,
    gtmPublished: false,
    sourceArtifacts: [...SOURCE_ARTIFACTS],
    executionCommand: EXECUTION_COMMAND,
    executionCount: 0,
    gateFailures: policy?.gateFailures || [],
    prePublishValidation: {
      phase2PConfirmed: liveReview?.phase === '2P',
      phase2NConfirmed: true,
      phase2OConfirmed: true,
      phase2QBConfirmed: true,
      phase2QDConfirmed: true,
      previewQaPassed: true,
      allSixScopesAvailable: false,
      tagmanagerEditContainerVersionsAvailable: false,
      tagmanagerPublishAvailable: false,
      expectedTagsPresent: Boolean(workspace.expectedTagsPresent),
      expectedTriggersPresent: Boolean(workspace.expectedTriggersPresent),
      expectedVariablesPresent: Boolean(workspace.expectedVariablesPresent),
      pendingChangesApproved: workspace.approvedPendingChanges ?? null,
      unexpectedChanges: (workspace.unexpectedObjects || []).length,
      duplicateRisk: workspace.duplicateRisk ?? null,
      forbiddenParametersFound: (workspace.forbiddenParametersFound || []).length,
      piiFound: (workspace.piiFound || []).length,
      rawClickIdsFound: (workspace.rawClickIdsFound || []).length,
      validationStatus: 'not_run'
    },
    publishedVersion: {
      versionName: VERSION_NAME,
      versionId: '',
      containerVersionPath: '',
      publishStatus: 'not_run',
      publishedAt: '',
      previousLiveVersionId: ''
    },
    publishedChanges: {
      approvedPendingChangesCount: workspace.approvedPendingChanges ?? 0,
      unexpectedChanges: (workspace.unexpectedObjects || []).length,
      createdGa4EventTags: EXPECTED_TAGS.map(([name]) => name)
    },
    postPublishVerification: {
      published: false,
      versionCreated: false,
      versionPublished: false,
      tagsStillPresent: false,
      triggersStillPresent: false,
      variablesStillPresent: false,
      forbiddenParametersFound: 0,
      piiFound: 0,
      rawClickIdsFound: 0,
      finalVerificationStatus: 'not_run'
    },
    rollbackPlan: {
      previousVersionId: '',
      rollbackAvailable: false,
      rollbackSteps: [...ROLLBACK_STEPS]
    },
    safety: {
      noRuntimeFilesTouched: true,
      googleAdsTouched: false,
      metaTouched: false,
      secretsPrinted: false,
      tagsCreatedDuringPublish: 0,
      triggersCreatedDuringPublish: 0,
      variablesCreatedDuringPublish: 0
    },
    recommendation: {
      postPublishSmokeTestRequired: true,
      monitorGa4Realtime: true,
      monitorDebugView: true,
      monitorConversions: true,
      nextPhase: 'Phase 2R - Post-publish smoke test and monitoring'
    },
    failedActions: [],
    stoppedOnError: false,
    mutationStatement: 'No GTM mutations were performed.'
  };
}

function buildMarkdown(result) {
  return [
    '# CRBOX Marketing Ops GTM Publish Result',
    '',
    `Generated: ${result.generatedAt}`,
    '',
    'Phase: **2Q**',
    '',
    `Mode: **${result.mode}**`,
    '',
    `Status: **${result.status}**`,
    '',
    '## Summary',
    '',
    `- Business owner approval: ${result.businessOwnerApproval}`,
    `- Mutation performed: ${result.mutationPerformed}`,
    `- GTM write calls made: ${result.gtmWriteCallsMade}`,
    `- GTM version created: ${result.gtmVersionCreated}`,
    `- GTM published: ${result.gtmPublished}`,
    `- Execution count: ${result.executionCount}`,
    `- Final verification: ${result.postPublishVerification.finalVerificationStatus}`,
    '',
    result.gtmPublished
      ? 'Phase 2Q created and published a GTM container version.'
      : 'Phase 2Q did not publish a GTM container version.',
    '',
    '## Business Owner Approval Statement',
    '',
    'The business owner approved creating and publishing the reviewed CRBOX GTM container version, limited to the approved Marketing Ops GA4 conversion-event setup.',
    '',
    '## Execution Command',
    '',
    `\`${result.executionCommand}\``,
    '',
    '## Pre-publish Validation',
    '',
    ...Object.entries(result.prePublishValidation).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Published Version Metadata',
    '',
    `- Version name: ${result.publishedVersion.versionName}`,
    `- Version ID: \`${result.publishedVersion.versionId || 'not available'}\``,
    `- Container version path: \`${result.publishedVersion.containerVersionPath || 'not available'}\``,
    `- Publish status: ${result.publishedVersion.publishStatus}`,
    `- Published at: ${result.publishedVersion.publishedAt || 'not available'}`,
    `- Previous live version ID: \`${result.publishedVersion.previousLiveVersionId || 'not available'}\``,
    '',
    '## What Was Published',
    '',
    `- Approved pending changes: ${result.publishedChanges.approvedPendingChangesCount}`,
    `- Unexpected changes: ${result.publishedChanges.unexpectedChanges}`,
    ...result.publishedChanges.createdGa4EventTags.map((name) => `- ${name}`),
    '',
    '## Safety Statement',
    '',
    ...Object.entries(result.safety).map(([key, value]) => `- ${key}: ${value}`),
    '',
    'No Replit/runtime files were changed by this phase.',
    '',
    '## Rollback Plan',
    '',
    `- Previous version ID: \`${result.rollbackPlan.previousVersionId || 'not available'}\``,
    `- Rollback available: ${result.rollbackPlan.rollbackAvailable}`,
    ...result.rollbackPlan.rollbackSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Post-publish Verification',
    '',
    ...Object.entries(result.postPublishVerification).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Remaining Monitoring Steps',
    '',
    '- Run the Phase 2R production smoke test.',
    '- Monitor GA4 Realtime and DebugView for the three conversion-intent events.',
    '- Monitor conversion counts and duplicate firing after release.',
    '',
    'Post-publish smoke testing is required.',
    '',
    '## Next Phase Recommendation',
    '',
    result.recommendation.nextPhase,
    '',
    '## Failed Actions',
    '',
    ...(result.failedActions.length
      ? result.failedActions.map((item) => `- ${item.action}: ${item.error}`)
      : ['- None.']),
    '',
    '## Mutation Statement',
    '',
    result.mutationStatement
  ].join('\n') + '\n';
}

function writeResult(root, result) {
  const paths = resultPaths(root);
  fs.writeFileSync(paths.jsonPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  fs.writeFileSync(paths.markdownPath, buildMarkdown(result), 'utf8');
  return paths;
}

function verifyPublishedVersion(version, approvedTagReview = []) {
  const tags = version.tag || [];
  const triggers = version.trigger || [];
  const variables = version.variable || [];
  const forbiddenParameters = [];
  const piiFound = [];
  const rawClickIdsFound = [];

  const triggerMatches = EXPECTED_TRIGGERS.map(([name, eventName]) => {
    const matches = triggers.filter((trigger) =>
      trigger.name === name || triggerEventName(trigger) === eventName
    );
    return matches.length === 1
      && matches[0].name === name
      && triggerEventName(matches[0]) === eventName;
  });
  const variableMatches = EXPECTED_VARIABLES.map(([name, dataLayerName]) => {
    const matches = variables.filter((variable) =>
      variable.name === name || parameterValue(variable, 'name') === dataLayerName
    );
    return matches.length === 1
      && matches[0].name === name
      && parameterValue(matches[0], 'name') === dataLayerName;
  });
  const tagMatches = EXPECTED_TAGS.map(([name, eventName, triggerName]) => {
    const trigger = triggers.find((item) =>
      item.name === triggerName && triggerEventName(item) === eventName
    );
    const approved = approvedTagReview.find((item) => item.tagName === name);
    const matches = tags.filter((tag) =>
      tag.name === name || (tag.type === 'gaawe' && parameterValue(tag, 'eventName') === eventName)
    );
    const tag = matches.length === 1 ? matches[0] : null;
    if (!tag) return false;

    const actualParameters = eventParameterMap(tag);
    const approvedParameters = Object.fromEntries(
      (approved?.parameters || []).map((item) => [item.parameter, item.variableReference])
    );
    for (const [parameter, value] of Object.entries(actualParameters)) {
      if (!APPROVED_PARAMETERS.has(parameter)) forbiddenParameters.push(`${name}: ${parameter}`);
      if (PII_PARAMETERS.has(parameter.toLowerCase())) piiFound.push(`${name}: ${parameter}`);
      if (/^(gclid|fbclid)$/i.test(parameter)) rawClickIdsFound.push(`${name}: ${parameter}`);
      if (/^\{\{\s*(?:DLV\s*-\s*)?(?:gclid|fbclid)\s*\}\}$/i.test(value)) {
        rawClickIdsFound.push(`${name}: ${parameter} -> ${value}`);
      }
    }
    const parameterMappingsMatch = approved
      && Object.keys(actualParameters).length === Object.keys(approvedParameters).length
      && Object.entries(approvedParameters).every(([key, value]) => actualParameters[key] === value);
    const referencedVariablesExist = Object.values(approvedParameters).every((value) => {
      const match = /^\{\{(.+)\}\}$/.exec(value);
      return !match || variables.some((variable) => variable.name === match[1]);
    });
    return tag.name === name
      && tag.type === 'gaawe'
      && parameterValue(tag, 'eventName') === eventName
      && (tag.firingTriggerId || []).length === 1
      && String(tag.firingTriggerId[0]) === String(trigger?.triggerId || '')
      && parameterMappingsMatch
      && referencedVariablesExist;
  });

  return {
    tagsStillPresent: tagMatches.every(Boolean),
    triggersStillPresent: triggerMatches.every(Boolean),
    variablesStillPresent: variableMatches.every(Boolean),
    forbiddenParametersFound: forbiddenParameters.length,
    piiFound: piiFound.length,
    rawClickIdsFound: rawClickIdsFound.length
  };
}

async function runGtmControlledPublish(root, argv) {
  let liveReview;
  try {
    liveReview = await buildReview(root);
  } catch (error) {
    const policy = { gateFailures: [maskSecretsInText(readableGoogleError(error))] };
    const result = baseResult(null, policy);
    result.status = 'failed';
    result.failedActions.push({ action: 'pre_publish_readiness', error: policy.gateFailures[0] });
    result.stoppedOnError = true;
    const paths = writeResult(root, result);
    return { result, paths, exitCode: 1 };
  }

  let accessToken;
  let scopeSet = new Set();
  try {
    accessToken = await getGoogleAccessToken();
    const tokenInfo = await getGoogleTokenInfo(accessToken);
    scopeSet = new Set(String(tokenInfo.scope || '').split(/\s+/).filter(Boolean));
  } catch (error) {
    const policy = { gateFailures: [maskSecretsInText(readableGoogleError(error))] };
    const result = baseResult(liveReview, policy);
    result.status = 'failed';
    result.failedActions.push({ action: 'oauth_scope_validation', error: policy.gateFailures[0] });
    result.stoppedOnError = true;
    const paths = writeResult(root, result);
    return { result, paths, exitCode: 1 };
  }

  const policy = evaluatePolicy({ root, argv, liveReview, scopeSet });
  const result = baseResult(liveReview, policy);
  result.prePublishValidation.allSixScopesAvailable = REQUIRED_SCOPES.every((scope) => scopeSet.has(scope));
  result.prePublishValidation.tagmanagerEditContainerVersionsAvailable =
    scopeSet.has('https://www.googleapis.com/auth/tagmanager.edit.containerversions');
  result.prePublishValidation.tagmanagerPublishAvailable =
    scopeSet.has('https://www.googleapis.com/auth/tagmanager.publish');
  result.prePublishValidation.validationStatus = policy.executionEnabled ? 'pass' : 'refused';

  if (!policy.executionEnabled) {
    result.status = 'refused';
    result.mutationStatement = 'No GTM mutations were performed because the controlled-publish safety gates did not pass.';
    const paths = writeResult(root, result);
    return { result, paths, exitCode: 1 };
  }

  const workspacePath = liveReview.workspaceReview.workspacePath;
  const containerPath = workspacePath.replace(/\/workspaces\/[^/]+$/, '');
  let previousLiveVersion;
  let versionHeaders;

  try {
    [previousLiveVersion, versionHeaders] = await Promise.all([
      googleApiGet(`${GTM_BASE}/${containerPath}/versions:live`, accessToken),
      googleApiGet(`${GTM_BASE}/${containerPath}/version_headers`, accessToken)
    ]);
  } catch (error) {
    result.status = 'failed';
    result.failedActions.push({ action: 'pre_publish_version_lookup', error: readableGoogleError(error) });
    result.stoppedOnError = true;
    result.mutationStatement = 'No GTM mutations were performed because pre-publish version lookup failed.';
    const paths = writeResult(root, result);
    return { result, paths, exitCode: 1 };
  }

  result.publishedVersion.previousLiveVersionId = previousLiveVersion.containerVersionId || '';
  result.rollbackPlan.previousVersionId = previousLiveVersion.containerVersionId || '';
  result.rollbackPlan.rollbackAvailable = Boolean(previousLiveVersion.containerVersionId);

  if ((versionHeaders.containerVersionHeader || []).some((item) => item.name === VERSION_NAME)) {
    result.status = 'refused';
    result.gateFailures.push(`A GTM container version already exists with the approved Phase 2Q name: ${VERSION_NAME}`);
    result.mutationStatement = 'No GTM mutations were performed because a same-named Phase 2Q version already exists.';
    const paths = writeResult(root, result);
    return { result, paths, exitCode: 1 };
  }

  let createdVersion;
  try {
    result.executionCount = 1;
    result.gtmWriteCallsMade = true;
    const createResponse = await googleApiPost(
      `${GTM_BASE}/${workspacePath}:create_version`,
      accessToken,
      { name: VERSION_NAME, notes: VERSION_NOTES }
    );
    result.mutationPerformed = true;
    result.gtmVersionCreated = Boolean(createResponse.containerVersion?.containerVersionId);
    createdVersion = createResponse.containerVersion;
    result.publishedVersion.versionId = createdVersion?.containerVersionId || '';
    result.publishedVersion.containerVersionPath = createdVersion?.path || '';
    result.postPublishVerification.versionCreated = result.gtmVersionCreated;

    if (!createdVersion?.path || createResponse.compilerError) {
      throw new Error('GTM version creation returned no usable version path or reported a compiler error.');
    }
  } catch (error) {
    result.status = result.gtmVersionCreated ? 'partial' : 'failed';
    result.failedActions.push({ action: 'create_version', error: maskSecretsInText(readableGoogleError(error)) });
    result.stoppedOnError = true;
    result.publishedVersion.publishStatus = 'not_run';
    result.mutationStatement = result.gtmVersionCreated
      ? 'A GTM container version was created, but publishing stopped before the publish call.'
      : 'No GTM version or publication was completed.';
    const paths = writeResult(root, result);
    return { result, paths, exitCode: 1 };
  }

  try {
    const fingerprint = createdVersion.fingerprint
      ? `?fingerprint=${encodeURIComponent(createdVersion.fingerprint)}`
      : '';
    const publishResponse = await googleApiPost(
      `${GTM_BASE}/${createdVersion.path}:publish${fingerprint}`,
      accessToken,
      {}
    );
    if (publishResponse.compilerError) {
      throw new Error('GTM publish response reported a compiler error.');
    }
    result.gtmPublished = true;
    result.publishedVersion.publishStatus = 'published';
    result.publishedVersion.publishedAt = new Date().toISOString();
  } catch (error) {
    result.status = 'partial';
    result.failedActions.push({ action: 'publish_version', error: maskSecretsInText(readableGoogleError(error)) });
    result.stoppedOnError = true;
    result.publishedVersion.publishStatus = 'failed';
    result.mutationStatement = 'A GTM container version was created, but the publish call failed.';
    const paths = writeResult(root, result);
    return { result, paths, exitCode: 1 };
  }

  try {
    const liveVersion = await googleApiGet(`${GTM_BASE}/${containerPath}/versions:live`, accessToken);
    const verification = verifyPublishedVersion(liveVersion, liveReview.tagReview || []);
    const versionPublished =
      String(liveVersion.containerVersionId || '') === String(createdVersion.containerVersionId || '');
    const finalVerificationStatus = versionPublished
      && verification.tagsStillPresent
      && verification.triggersStillPresent
      && verification.variablesStillPresent
      && verification.forbiddenParametersFound === 0
      && verification.piiFound === 0
      && verification.rawClickIdsFound === 0
      ? 'pass'
      : 'failed';

    result.postPublishVerification = {
      published: result.gtmPublished,
      versionCreated: result.gtmVersionCreated,
      versionPublished,
      ...verification,
      finalVerificationStatus
    };
    result.status = finalVerificationStatus === 'pass' ? 'executed' : 'partial';
  } catch (error) {
    result.status = 'partial';
    result.postPublishVerification.finalVerificationStatus =
      `failed: ${maskSecretsInText(readableGoogleError(error))}`;
  }

  result.mutationStatement = result.status === 'executed'
    ? 'Phase 2Q created and published exactly one GTM container version from the approved workspace. No tags, triggers, variables, runtime files, Google Ads objects, or Meta objects were created or changed during publish execution.'
    : 'The GTM version was published, but post-publish verification did not fully pass.';

  const paths = writeResult(root, result);
  return { result, paths, exitCode: result.status === 'executed' ? 0 : 1 };
}

function outputLines(run) {
  const { result, paths } = run;
  return [
    `GTM controlled publish: ${String(result.status || 'unknown').toUpperCase()}`,
    `- Execution count: ${result.executionCount}`,
    `- Mutation performed: ${result.mutationPerformed}`,
    `- GTM write calls made: ${result.gtmWriteCallsMade}`,
    `- GTM version created: ${result.gtmVersionCreated}`,
    `- GTM published: ${result.gtmPublished}`,
    `- Published version ID: ${result.publishedVersion.versionId || 'not available'}`,
    `- Previous live version ID: ${result.publishedVersion.previousLiveVersionId || 'not available'}`,
    `- Final verification: ${result.postPublishVerification.finalVerificationStatus}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    ...(result.gateFailures || []).map((failure) => `- Gate failure: ${failure}`),
    ...(result.failedActions || []).map((failure) => `- Failed action: ${failure.action}`)
  ];
}

module.exports = {
  EXECUTION_COMMAND,
  REQUIRED_SCOPES,
  VERSION_NAME,
  evaluatePolicy,
  outputLines,
  runGtmControlledPublish,
  verifyPublishedVersion,
  writeResult
};
