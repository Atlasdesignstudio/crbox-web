'use strict';

const fs = require('fs');
const path = require('path');

const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v24';
const REQUEST_TIMEOUT_MS = 12000;

const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-google-ads-import-payload-review.json',
  'docs/marketing-ops-google-ads-import-payload-review.md',
  'docs/marketing-ops-google-ads-import-planning.json',
  'docs/marketing-ops-paid-media-conversion-map.json',
  'docs/marketing-ops-ga4-monitoring-readiness.json',
  'docs/marketing-ops-ga4-event-processing-validation.json',
  'docs/marketing-ops-ga4-monitoring-dashboard.json',
  'docs/marketing-ops-gtm-publish-result.json',
  'docs/marketing-ops-gtm-post-publish-smoke-test.json',
  'docs/measurement-map-v1.md',
  'docs/analytics-taxonomy.md',
  'docs/tracking-plan.md',
  'docs/paid-media-launch-gate-phase-1.md'
]);

const REQUIRED_JSON_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-google-ads-import-payload-review.json',
  'docs/marketing-ops-google-ads-import-planning.json',
  'docs/marketing-ops-paid-media-conversion-map.json',
  'docs/marketing-ops-ga4-monitoring-readiness.json',
  'docs/marketing-ops-ga4-event-processing-validation.json',
  'docs/marketing-ops-ga4-monitoring-dashboard.json',
  'docs/marketing-ops-gtm-publish-result.json',
  'docs/marketing-ops-gtm-post-publish-smoke-test.json'
]);

const REQUIRED_CREDENTIALS = Object.freeze([
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN'
]);

const OPTIONAL_ACCOUNT_ENV = Object.freeze([
  'GOOGLE_ADS_CUSTOMER_ID',
  'GOOGLE_ADS_LOGIN_CUSTOMER_ID'
]);

const PLANNED_ACTION_NAMES = Object.freeze([
  'CRBOX - Quote Request Submitted',
  'CRBOX - Signup Completed',
  'CRBOX - Contact Form Submitted',
  'CRBOX - Calculator Result Generated',
  'CRBOX - WhatsApp Click',
  'CRBOX - Email Click',
  'CRBOX - Phone Click'
]);

function readJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, `${content.replace(/\s+$/u, '')}\n`);
}

function sourceArtifactAvailability(root) {
  return SOURCE_ARTIFACTS.map((relativePath) => ({
    path: relativePath,
    available: fs.existsSync(path.join(root, relativePath)),
    requiredForStatus: REQUIRED_JSON_ARTIFACTS.includes(relativePath)
  }));
}

function envPresent(name, env = process.env) {
  return Boolean(env[name] && String(env[name]).trim());
}

function normalizeCustomerId(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function maskCustomerId(value) {
  const normalized = normalizeCustomerId(value);
  if (!normalized) return 'not_available';
  if (normalized.length <= 4) return '****';
  return `${normalized.slice(0, 3)}...${normalized.slice(-4)}`;
}

function sourceStatus(readiness, processing, dashboard, conversionMap, planning, payloadReview, publish, smoke) {
  return {
    phase3A1Readiness: readiness?.readinessStatus || 'not_available',
    phase3A2Validation: processing?.validationStatus || 'not_available',
    phase3A3Dashboard: dashboard?.overallStatus || 'not_available',
    phase3BConversionMap: conversionMap?.overallStatus || 'not_available',
    phase3CGoogleAdsImportPlanning: planning?.overallStatus || 'not_available',
    phase3DPayloadReview: payloadReview?.overallStatus || 'not_available',
    phase3DApplyAllowed: payloadReview?.payloadScope?.applyAllowed ?? 'not_available',
    phase3DExecuteNow: payloadReview?.futureApplyPayload?.executeNow ?? 'not_available',
    gtmPublishedVersion: publish?.publishedVersion?.versionId || 'not_available',
    postPublishSmokeTest: smoke?.finalStatus || smoke?.status || 'not_available'
  };
}

function sourceStatusReady(status) {
  return status.phase3A1Readiness === 'pass'
    && status.phase3A2Validation === 'pass_with_limitations'
    && status.phase3A3Dashboard === 'ready_with_limitations'
    && status.phase3BConversionMap === 'ready_for_import_planning_with_limitations'
    && status.phase3CGoogleAdsImportPlanning === 'ready_for_google_ads_import_planning_with_limitations'
    && status.phase3DPayloadReview === 'ready_for_payload_review_with_manual_prerequisites'
    && status.phase3DApplyAllowed === false
    && status.phase3DExecuteNow === false
    && status.gtmPublishedVersion === '4'
    && status.postPublishSmokeTest === 'pass';
}

function buildCredentialStatus(env = process.env) {
  const missingCredentials = REQUIRED_CREDENTIALS.filter((name) => !envPresent(name, env));
  const customerIdPresent = envPresent('GOOGLE_ADS_CUSTOMER_ID', env);
  const loginCustomerIdPresent = envPresent('GOOGLE_ADS_LOGIN_CUSTOMER_ID', env);
  let status = 'ready_for_read_only_attempt';
  if (!customerIdPresent) status = 'blocked_missing_google_ads_account_id';
  if (missingCredentials.length) status = 'blocked_missing_google_ads_credentials';

  return {
    status,
    requiredCredentialNames: REQUIRED_CREDENTIALS,
    optionalAccountEnvNames: OPTIONAL_ACCOUNT_ENV,
    missingCredentialNames: missingCredentials,
    customerIdPresent,
    loginCustomerIdPresent,
    customerIdMasked: customerIdPresent ? maskCustomerId(env.GOOGLE_ADS_CUSTOMER_ID) : 'not_available',
    loginCustomerIdMasked: loginCustomerIdPresent ? maskCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) : 'not_available',
    secretsPrinted: false,
    tokensPrinted: false
  };
}

function defaultAccountIdentity(credentialStatus) {
  return {
    status: credentialStatus.customerIdPresent ? 'not_checked' : 'blocked_missing_google_ads_account_id',
    customerId: credentialStatus.customerIdMasked,
    descriptiveName: 'not_checked',
    manager: 'not_checked',
    currencyCode: 'not_checked',
    timeZone: 'not_checked',
    accountStatus: 'not_checked',
    testAccount: 'not_checked',
    canManageClients: 'not_checked'
  };
}

function defaultPermissionAccessStatus(credentialStatus) {
  return {
    apiReadAccessAvailable: false,
    customerIdAccessible: false,
    loginCustomerIdNeeded: credentialStatus.loginCustomerIdPresent ? 'configured' : 'unknown',
    permissionError: false,
    developerTokenError: false,
    oauthError: false,
    accountNotFound: false,
    errorCategory: credentialStatus.status,
    sanitizedMessage: credentialStatus.status
  };
}

function flattenSearchStreamResponse(chunks) {
  if (!Array.isArray(chunks)) return [];
  return chunks.flatMap((chunk) => chunk.results || []);
}

function classifyGoogleAdsError(error) {
  const status = error?.status || 0;
  const text = `${error?.message || ''} ${JSON.stringify(error?.body || {})}`.toLowerCase();
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || text.includes('timeout')) return 'google_ads_api_timeout';
  if (status === 401 || text.includes('invalid_grant') || text.includes('unauthorized')) return 'oauth_error';
  if (text.includes('developer token') || text.includes('developer_token') || text.includes('developer-token')) return 'developer_token_error';
  if (status === 403 || text.includes('permission') || text.includes('authorization')) return 'permission_error';
  if (status === 404 || text.includes('not found') || text.includes('customer_not_found')) return 'account_not_found';
  return 'google_ads_api_error';
}

function requestSignal() {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  }
  return undefined;
}

function sanitizedError(error) {
  const category = classifyGoogleAdsError(error);
  return {
    category,
    httpStatus: error?.status || 'not_available',
    message: category
  };
}

async function fetchAccessToken(env) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    signal: requestSignal(),
    body: new URLSearchParams({
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('oauth_token_request_failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body.access_token;
}

async function googleAdsSearch(customerId, query, env, accessToken) {
  const normalizedCustomerId = normalizeCustomerId(customerId);
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'content-type': 'application/json'
  };
  const loginCustomerId = normalizeCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId;

  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${normalizedCustomerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers,
      signal: requestSignal(),
      body: JSON.stringify({ query })
    }
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('google_ads_search_failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return flattenSearchStreamResponse(body);
}

function accountIdentityFromResults(results, credentialStatus) {
  const customer = results?.[0]?.customer || {};
  return {
    status: results.length ? 'read_success' : 'not_found',
    customerId: customer.id ? maskCustomerId(customer.id) : credentialStatus.customerIdMasked,
    descriptiveName: customer.descriptiveName || 'not_available',
    manager: customer.manager ?? 'not_available',
    currencyCode: customer.currencyCode || 'not_available',
    timeZone: customer.timeZone || 'not_available',
    accountStatus: customer.status || 'not_available',
    testAccount: customer.testAccount ?? 'not_available',
    canManageClients: customer.manager ?? 'not_available'
  };
}

function conversionActionFromResult(result) {
  const action = result.conversionAction || {};
  const valueSettings = action.valueSettings || {};
  const attribution = action.attributionModelSettings || {};
  return {
    resourceName: action.resourceName || 'not_available',
    id: action.id || 'not_available',
    name: action.name || 'not_available',
    status: action.status || 'not_available',
    type: action.type || 'not_available',
    category: action.category || 'not_available',
    origin: action.origin || 'not_available',
    includeInConversionsMetric: action.includeInConversionsMetric ?? 'not_available',
    valueSettingsSummary: {
      defaultValueConfigured: valueSettings.defaultValue !== undefined,
      alwaysUseDefaultValue: valueSettings.alwaysUseDefaultValue ?? 'not_available'
    },
    countingType: action.countingType || 'not_available',
    attributionModel: attribution.attributionModel || 'not_available',
    primaryForGoal: action.primaryForGoal ?? 'not_available',
    ownerCustomer: result.customer?.id ? maskCustomerId(result.customer.id) : 'not_available'
  };
}

function similarityName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/crbox/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function duplicateRiskReview(existingActions) {
  return PLANNED_ACTION_NAMES.map((plannedName) => {
    const exact = existingActions.filter((action) => action.name === plannedName);
    const plannedSimilar = similarityName(plannedName);
    const similar = existingActions.filter((action) =>
      action.name !== plannedName
      && plannedSimilar
      && similarityName(action.name)
      && (
        similarityName(action.name).includes(plannedSimilar)
        || plannedSimilar.includes(similarityName(action.name))
      )
    );

    if (exact.length) {
      return {
        plannedConversionActionName: plannedName,
        classification: 'exact_name_match',
        existingMatches: exact.map((item) => ({ id: item.id, name: item.name, status: item.status, type: item.type })),
        recommendation: 'requires_mapping_to_existing_action'
      };
    }
    if (similar.length) {
      return {
        plannedConversionActionName: plannedName,
        classification: 'possible_duplicate_similar_name',
        existingMatches: similar.map((item) => ({ id: item.id, name: item.name, status: item.status, type: item.type })),
        recommendation: 'requires_human_review'
      };
    }
    return {
      plannedConversionActionName: plannedName,
      classification: existingActions.length ? 'no_existing_match' : 'not_checked',
      existingMatches: [],
      recommendation: existingActions.length ? 'no_duplicate_name_detected' : 'not_checked_no_inventory'
    };
  });
}

function duplicateRiskResult(review) {
  if (review.some((item) => item.classification === 'conflicting_existing_action')) return 'blocked_duplicate_conflict';
  if (review.some((item) => item.classification === 'exact_name_match' || item.classification === 'possible_duplicate_similar_name')) {
    return 'ready_with_duplicate_review_required';
  }
  if (review.every((item) => item.classification === 'not_checked')) return 'not_checked';
  return 'low_no_existing_name_matches';
}

function defaultConversionGoalsPreflight(status) {
  return {
    status,
    goalsListed: false,
    leadGoalsDetected: 'not_checked',
    signupGoalsDetected: 'not_checked',
    contactGoalsDetected: 'not_checked',
    limitation: status === 'not_checked_api_limitation'
      ? 'Current read-only preflight does not query conversion goals separately from conversion actions.'
      : 'not_available'
  };
}

function defaultGa4LinkStatus(status) {
  return {
    status,
    linkedToExpectedGa4Property: 'not_checked',
    importedGa4ConversionsVisible: 'not_checked',
    limitation: status === 'requires_manual_confirmation'
      ? 'Google Ads to GA4 link status requires manual confirmation or a future supported read-only account link query.'
      : 'not_available'
  };
}

function autoTaggingFromAccount(accountIdentity) {
  if (accountIdentity.status !== 'read_success') {
    return {
      status: 'not_checked',
      autoTaggingEnabled: 'not_checked'
    };
  }
  return {
    status: accountIdentity.autoTaggingEnabled === 'not_available' ? 'requires_manual_confirmation' : 'checked',
    autoTaggingEnabled: accountIdentity.autoTaggingEnabled ?? 'not_checked'
  };
}

async function runReadOnlyGoogleAdsPreflight(credentialStatus, env = process.env) {
  const accountIdentity = defaultAccountIdentity(credentialStatus);
  const permissionAccessStatus = defaultPermissionAccessStatus(credentialStatus);

  if (credentialStatus.status !== 'ready_for_read_only_attempt') {
    return {
      accountIdentity,
      permissionAccessStatus,
      existingConversionActions: [],
      conversionGoalsPreflight: defaultConversionGoalsPreflight('not_checked'),
      ga4LinkStatus: defaultGa4LinkStatus('requires_manual_confirmation'),
      autoTaggingStatus: { status: 'not_checked', autoTaggingEnabled: 'not_checked' },
      apiCallsMade: false
    };
  }

  try {
    const accessToken = await fetchAccessToken(env);
    const accountResults = await googleAdsSearch(
      env.GOOGLE_ADS_CUSTOMER_ID,
      `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.status, customer.manager, customer.test_account, customer.auto_tagging_enabled FROM customer LIMIT 1`,
      env,
      accessToken
    );
    const identity = accountIdentityFromResults(accountResults, credentialStatus);
    const conversionResults = await googleAdsSearch(
      env.GOOGLE_ADS_CUSTOMER_ID,
      `SELECT conversion_action.resource_name, conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category, conversion_action.origin, conversion_action.include_in_conversions_metric, conversion_action.value_settings.default_value, conversion_action.value_settings.always_use_default_value, conversion_action.counting_type, conversion_action.attribution_model_settings.attribution_model, conversion_action.primary_for_goal, customer.id FROM conversion_action ORDER BY conversion_action.name`,
      env,
      accessToken
    );
    const existingConversionActions = conversionResults.map(conversionActionFromResult);

    return {
      accountIdentity: identity,
      permissionAccessStatus: {
        apiReadAccessAvailable: true,
        customerIdAccessible: identity.status === 'read_success',
        loginCustomerIdNeeded: credentialStatus.loginCustomerIdPresent ? 'configured' : 'unknown',
        permissionError: false,
        developerTokenError: false,
        oauthError: false,
        accountNotFound: false,
        errorCategory: 'none',
        sanitizedMessage: 'read_only_access_succeeded'
      },
      existingConversionActions,
      conversionGoalsPreflight: defaultConversionGoalsPreflight('not_checked_api_limitation'),
      ga4LinkStatus: defaultGa4LinkStatus('requires_manual_confirmation'),
      autoTaggingStatus: autoTaggingFromAccount(identity),
      apiCallsMade: true
    };
  } catch (error) {
    const safeError = sanitizedError(error);
    return {
      accountIdentity,
      permissionAccessStatus: {
        apiReadAccessAvailable: false,
        customerIdAccessible: false,
        loginCustomerIdNeeded: credentialStatus.loginCustomerIdPresent ? 'configured' : 'unknown',
        permissionError: safeError.category === 'permission_error',
        developerTokenError: safeError.category === 'developer_token_error',
        oauthError: safeError.category === 'oauth_error',
        accountNotFound: safeError.category === 'account_not_found',
        errorCategory: safeError.category,
        sanitizedMessage: safeError.message
      },
      existingConversionActions: [],
      conversionGoalsPreflight: defaultConversionGoalsPreflight('not_checked'),
      ga4LinkStatus: defaultGa4LinkStatus('requires_manual_confirmation'),
      autoTaggingStatus: { status: 'not_checked', autoTaggingEnabled: 'not_checked' },
      apiCallsMade: safeError.category !== 'oauth_error'
    };
  }
}

function classifyOverallStatus({ missingRequired, sourceReady, credentialStatus, permissionAccessStatus }) {
  if (missingRequired || !sourceReady) return 'blocked_missing_source_artifact';
  if (credentialStatus.status === 'blocked_missing_google_ads_credentials') return 'blocked_missing_google_ads_credentials';
  if (credentialStatus.status === 'blocked_missing_google_ads_account_id') return 'blocked_missing_google_ads_account_id';
  if (!permissionAccessStatus.apiReadAccessAvailable) return 'blocked_google_ads_api_access_unavailable';
  return 'read_only_preflight_pass_with_findings';
}

function importReadinessClassification({ overallStatus, duplicateRisk, ga4LinkStatus }) {
  if (overallStatus === 'blocked_missing_google_ads_credentials') return 'blocked_missing_credentials';
  if (overallStatus === 'blocked_missing_google_ads_account_id') return 'blocked_missing_account_id';
  if (overallStatus === 'blocked_google_ads_api_access_unavailable') return 'blocked_api_access';
  if (duplicateRisk === 'blocked_duplicate_conflict') return 'blocked_duplicate_conflict';
  if (ga4LinkStatus.status === 'requires_manual_confirmation') return 'manual_confirmation_required';
  if (duplicateRisk === 'ready_with_duplicate_review_required') return 'ready_with_duplicate_review_required';
  return 'ready_for_apply_payload_review';
}

function buildHumanRecommendations({ importReadiness, duplicateRisk, existingConversionActions }) {
  return [
    {
      topic: 'payload_progression',
      recommendation: importReadiness.startsWith('blocked')
        ? 'Resolve the blocked account preflight condition before moving toward apply review.'
        : 'Phase 3D payload can move toward final apply review only after manual account/linking confirmations are complete.'
    },
    {
      topic: 'duplicate_conversion_names',
      recommendation: duplicateRisk === 'low_no_existing_name_matches'
        ? 'No existing conversion action name matches were detected in the read-only inventory.'
        : 'Review existing conversion actions before creating or importing any planned action.'
    },
    {
      topic: 'account_linking_prerequisites',
      recommendation: 'GA4-Google Ads link status remains a required manual confirmation unless a future supported read-only query confirms it.'
    },
    {
      topic: 'primary_candidate',
      recommendation: 'quote_request_submit_success should remain the only immediate primary bidding candidate unless explicitly changed.'
    },
    {
      topic: 'signup_quality',
      recommendation: 'signup_success should remain quality-dependent until activation or lead quality is confirmed.'
    },
    {
      topic: 'secondary_conversions',
      recommendation: 'Secondary conversions should remain observation-only initially.'
    },
    {
      topic: 'phone_click',
      recommendation: 'phone_click remains blocked until call tracking confirms completed and qualified calls.'
    },
    {
      topic: 'existing_action_mapping',
      recommendation: existingConversionActions.length
        ? 'Map any matching existing conversion actions instead of recreating duplicates.'
        : 'Existing conversion action mapping was not available or no conversion actions were returned.'
    }
  ];
}

function plannedConversionActionNames(payloadReview) {
  const planned = payloadReview?.futureApplyPayload?.plannedActions || [];
  if (planned.length) return planned.map((item) => item.conversionActionName);
  return PLANNED_ACTION_NAMES.slice();
}

async function buildReport(root) {
  const payloadReview = readJson(root, 'docs/marketing-ops-google-ads-import-payload-review.json');
  const planning = readJson(root, 'docs/marketing-ops-google-ads-import-planning.json');
  const conversionMap = readJson(root, 'docs/marketing-ops-paid-media-conversion-map.json');
  const readiness = readJson(root, 'docs/marketing-ops-ga4-monitoring-readiness.json');
  const processing = readJson(root, 'docs/marketing-ops-ga4-event-processing-validation.json');
  const dashboard = readJson(root, 'docs/marketing-ops-ga4-monitoring-dashboard.json');
  const publish = readJson(root, 'docs/marketing-ops-gtm-publish-result.json');
  const smoke = readJson(root, 'docs/marketing-ops-gtm-post-publish-smoke-test.json');
  const availability = sourceArtifactAvailability(root);
  const missingRequired = availability.some((artifact) => artifact.requiredForStatus && !artifact.available);
  const status = sourceStatus(readiness, processing, dashboard, conversionMap, planning, payloadReview, publish, smoke);
  const sourceReady = sourceStatusReady(status);
  const credentialStatus = buildCredentialStatus();
  const preflight = await runReadOnlyGoogleAdsPreflight(credentialStatus);
  const duplicateReview = duplicateRiskReview(preflight.existingConversionActions);
  const duplicateRisk = duplicateRiskResult(duplicateReview);
  const overallStatus = classifyOverallStatus({
    missingRequired,
    sourceReady,
    credentialStatus,
    permissionAccessStatus: preflight.permissionAccessStatus
  });
  const importReadiness = importReadinessClassification({
    overallStatus,
    duplicateRisk,
    ga4LinkStatus: preflight.ga4LinkStatus
  });

  return {
    generatedAt: new Date().toISOString(),
    phase: '3E',
    mode: 'google_ads_read_only_account_preflight',
    sourceArtifacts: SOURCE_ARTIFACTS,
    sourceArtifactAvailability: availability,
    overallStatus,
    sourceStatus: status,
    credentialStatus,
    accountIdentity: preflight.accountIdentity,
    permissionAccessStatus: preflight.permissionAccessStatus,
    existingConversionActions: {
      count: preflight.existingConversionActions.length,
      actions: preflight.existingConversionActions
    },
    plannedConversionActionNames: plannedConversionActionNames(payloadReview),
    duplicateRiskReview: {
      result: duplicateRisk,
      plannedActions: duplicateReview
    },
    conversionGoalsPreflight: preflight.conversionGoalsPreflight,
    ga4LinkStatus: preflight.ga4LinkStatus,
    autoTaggingStatus: preflight.autoTaggingStatus,
    importReadinessClassification: importReadiness,
    humanRecommendations: buildHumanRecommendations({
      importReadiness,
      duplicateRisk,
      existingConversionActions: preflight.existingConversionActions
    }),
    recommendedNextPhase: preflight.permissionAccessStatus.apiReadAccessAvailable
      ? 'Phase 3F - Google Ads Apply Payload Final Review'
      : 'Phase 3E-Fix - Google Ads Credentials / Account Access Setup',
    safety: {
      ga4WritesMade: false,
      gtmWritesMade: false,
      gtmPublished: false,
      googleAdsTouched: preflight.apiCallsMade ? 'read_only_only' : false,
      googleAdsWritesMade: false,
      googleAdsConversionActionsCreated: false,
      googleAdsConversionsImported: false,
      googleAdsCampaignsCreated: false,
      metaTouched: false,
      runtimeFilesTouched: false,
      websiteRuntimeFilesTouched: false,
      secretsPrinted: false,
      tokensPrinted: false,
      piiPrinted: false,
      rawClickIdsPrinted: false,
      applyAllowed: false,
      executeNow: false
    }
  };
}

function statusLabel(value) {
  return String(value || 'not_available').replace(/_/g, ' ').toUpperCase();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? 'not_available').replace(/\|/g, '/')).join(' | ')} |`)
  ].join('\n');
}

function buildMarkdown(report) {
  const conversionRows = report.existingConversionActions.actions.map((item) => [
    item.id,
    item.name,
    item.status,
    item.type,
    item.category,
    item.origin,
    item.includeInConversionsMetric,
    item.primaryForGoal
  ]);
  const duplicateRows = report.duplicateRiskReview.plannedActions.map((item) => [
    item.plannedConversionActionName,
    item.classification,
    item.existingMatches.length,
    item.recommendation
  ]);
  const prereqRows = [
    ['Credential status', report.credentialStatus.status],
    ['API read access available', report.permissionAccessStatus.apiReadAccessAvailable],
    ['Customer ID accessible', report.permissionAccessStatus.customerIdAccessible],
    ['Permission error', report.permissionAccessStatus.permissionError],
    ['Developer token error', report.permissionAccessStatus.developerTokenError],
    ['OAuth error', report.permissionAccessStatus.oauthError],
    ['Account not found', report.permissionAccessStatus.accountNotFound]
  ];

  return [
    '# CRBOX Google Ads Read-only Account Preflight',
    '',
    '## Executive summary',
    '',
    `- Phase: ${report.phase}`,
    `- Mode: ${report.mode}`,
    `- Generated: ${report.generatedAt}`,
    `- Overall status: ${report.overallStatus}`,
    `- Import readiness classification: ${report.importReadinessClassification}`,
    '- This phase is read-only account preflight only.',
    '- No conversion actions are created or imported.',
    '- No Google Ads campaigns, audiences, goals, GA4 links, GA4 objects, GTM objects, Meta objects, or runtime files are changed.',
    '',
    '## Scope',
    '',
    '- Inspect account identity, read access, existing conversion actions, duplicate risk, and account prerequisites where safe credentials permit.',
    '- Keep applyAllowed: false and executeNow: false.',
    '- Produce a useful blocked artifact if credentials or access are unavailable.',
    '',
    '## Source artifacts',
    '',
    ...report.sourceArtifactAvailability.map((artifact) => `- ${artifact.path}: ${artifact.available ? 'available' : 'source_artifact_missing'}`),
    '',
    '## Credential/account access status',
    '',
    markdownTable(['Check', 'Status'], prereqRows),
    '',
    '## Account identity',
    '',
    markdownTable(
      ['Field', 'Value'],
      Object.entries(report.accountIdentity).map(([key, value]) => [key, value])
    ),
    '',
    '## Existing conversion actions',
    '',
    `Existing conversion actions count: ${report.existingConversionActions.count}`,
    '',
    conversionRows.length
      ? markdownTable(['ID', 'Name', 'Status', 'Type', 'Category', 'Origin', 'Include in conversions', 'Primary for goal'], conversionRows)
      : '_No conversion action inventory was returned._',
    '',
    '## Duplicate-risk review',
    '',
    `Duplicate-risk result: ${report.duplicateRiskReview.result}`,
    '',
    markdownTable(['Planned action', 'Classification', 'Existing matches', 'Recommendation'], duplicateRows),
    '',
    '## Conversion goals preflight',
    '',
    ...Object.entries(report.conversionGoalsPreflight).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## GA4 link status',
    '',
    ...Object.entries(report.ga4LinkStatus).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Auto-tagging status',
    '',
    ...Object.entries(report.autoTaggingStatus).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Import readiness classification',
    '',
    `- ${report.importReadinessClassification}`,
    '',
    '## Human recommendations',
    '',
    ...report.humanRecommendations.map((item) => `- ${item.topic}: ${item.recommendation}`),
    '',
    '## Recommended next phase',
    '',
    `Recommended next phase: ${report.recommendedNextPhase}`,
    '',
    '## Safety confirmations',
    '',
    '- GA4 writes made: false',
    '- GTM writes made: false',
    '- GTM published: false',
    `- Google Ads touched: ${report.safety.googleAdsTouched}`,
    '- Google Ads writes made: false',
    '- Google Ads conversion actions created: false',
    '- Google Ads conversions imported: false',
    '- Google Ads campaigns created: false',
    '- Meta touched: false',
    '- Runtime files touched: false',
    '- Secrets printed: false',
    '- Tokens printed: false',
    '- PII printed: false',
    '- Raw click IDs printed: false',
    '- Apply allowed: false',
    '- Execute now: false'
  ].join('\n');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusClass(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('blocked') || text.includes('error') || text === 'false') return 'bad';
  if (text.includes('manual') || text.includes('requires') || text.includes('not_checked') || text.includes('limitation')) return 'warn';
  if (text.includes('pass') || text.includes('ready') || text.includes('success') || text === 'true' || text.includes('enabled')) return 'good';
  return 'neutral';
}

function chip(value) {
  return `<span class="chip ${statusClass(value)}">${escapeHtml(statusLabel(value))}</span>`;
}

function tableRows(rows) {
  return rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('\n');
}

function buildHtml(report) {
  const conversionRows = report.existingConversionActions.actions.map((item) => [
    escapeHtml(item.id),
    `<strong>${escapeHtml(item.name)}</strong>`,
    chip(item.status),
    escapeHtml(item.type),
    escapeHtml(item.category),
    escapeHtml(String(item.includeInConversionsMetric))
  ]);
  const duplicateRows = report.duplicateRiskReview.plannedActions.map((item) => [
    `<strong>${escapeHtml(item.plannedConversionActionName)}</strong>`,
    chip(item.classification),
    escapeHtml(item.existingMatches.length),
    escapeHtml(item.recommendation)
  ]);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRBOX Google Ads Account Preflight</title>
  <style>
    :root {
      --bg: #f6f7f9;
      --panel: #ffffff;
      --ink: #18212f;
      --muted: #5f6d7d;
      --line: #d9dee7;
      --good: #116b46;
      --good-bg: #e7f4ec;
      --warn: #8a5a00;
      --warn-bg: #fff1ce;
      --bad: #9a2d2d;
      --bad-bg: #fde7e7;
      --neutral: #485465;
      --neutral-bg: #eef1f5;
      --header: #12334c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    header {
      background: var(--header);
      color: #fff;
      padding: 32px max(24px, calc((100vw - 1180px) / 2));
    }
    main {
      width: min(1180px, calc(100% - 32px));
      margin: 24px auto 44px;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 { font-size: clamp(1.8rem, 3vw, 3rem); margin-bottom: 8px; letter-spacing: 0; }
    h2 { margin: 30px 0 14px; font-size: 1.35rem; }
    .summary, .grid {
      display: grid;
      gap: 14px;
    }
    .summary { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 20px; }
    .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .card, .table-wrap, .note {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }
    .card p, .note p { color: var(--muted); }
    .kicker {
      color: var(--muted);
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    header .kicker { color: #b8c9da; }
    .chip {
      display: inline-flex;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      margin: 2px 0 8px;
      white-space: nowrap;
    }
    .chip.good { color: var(--good); background: var(--good-bg); }
    .chip.warn { color: var(--warn); background: var(--warn-bg); }
    .chip.bad { color: var(--bad); background: var(--bad-bg); }
    .chip.neutral { color: var(--neutral); background: var(--neutral-bg); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th, td {
      padding: 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    ul { margin: 0; padding-left: 20px; }
    li + li { margin-top: 7px; }
    footer {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto 32px;
      color: var(--muted);
      font-size: 0.86rem;
    }
    @media (max-width: 900px) {
      .summary, .grid { grid-template-columns: 1fr; }
      .table-wrap { overflow-x: auto; }
      th, td { min-width: 150px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="kicker">CRBOX - Phase ${escapeHtml(report.phase)}</div>
    <h1>Google Ads Read-only Account Preflight</h1>
    <p>Read-only account/access and duplicate-risk preflight before any Google Ads conversion import or apply phase.</p>
    <div class="summary">
      <div>${chip(report.overallStatus)}<p>Overall status</p></div>
      <div>${chip(report.credentialStatus.status)}<p>Credentials</p></div>
      <div>${chip(report.permissionAccessStatus.apiReadAccessAvailable)}<p>API read access</p></div>
      <div>${chip(report.importReadinessClassification)}<p>Import readiness</p></div>
    </div>
  </header>
  <main>
    <section>
      <h2>Credential/account access status</h2>
      <div class="grid">
        <article class="card"><div class="kicker">Customer ID</div>${chip(report.credentialStatus.customerIdPresent)}<p>${escapeHtml(report.credentialStatus.customerIdMasked)}</p></article>
        <article class="card"><div class="kicker">Login customer ID</div>${chip(report.credentialStatus.loginCustomerIdPresent)}<p>${escapeHtml(report.credentialStatus.loginCustomerIdMasked)}</p></article>
        <article class="card"><div class="kicker">Permission</div>${chip(report.permissionAccessStatus.errorCategory)}<p>${escapeHtml(report.permissionAccessStatus.sanitizedMessage)}</p></article>
        <article class="card"><div class="kicker">Existing actions</div><h3>${report.existingConversionActions.count}</h3><p>Safe conversion action inventory count.</p></article>
      </div>
    </section>
    <section>
      <h2>Account identity</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Field</th><th>Value</th></tr></thead>
          <tbody>${tableRows(Object.entries(report.accountIdentity).map(([key, value]) => [escapeHtml(key), escapeHtml(value)]))}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Existing conversion actions</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Type</th><th>Category</th><th>Include</th></tr></thead>
          <tbody>${conversionRows.length ? tableRows(conversionRows) : '<tr><td colspan="6">No conversion action inventory was returned.</td></tr>'}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Duplicate-risk review</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Planned action</th><th>Classification</th><th>Matches</th><th>Recommendation</th></tr></thead>
          <tbody>${tableRows(duplicateRows)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Conversion goals preflight</h2>
      <div class="note"><ul>${Object.entries(report.conversionGoalsPreflight).map(([key, value]) => `<li>${escapeHtml(key)}: ${escapeHtml(value)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>GA4 link status</h2>
      <div class="note"><ul>${Object.entries(report.ga4LinkStatus).map(([key, value]) => `<li>${escapeHtml(key)}: ${escapeHtml(value)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Auto-tagging status</h2>
      <div class="note"><ul>${Object.entries(report.autoTaggingStatus).map(([key, value]) => `<li>${escapeHtml(key)}: ${escapeHtml(value)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Import readiness classification</h2>
      <div class="note">${chip(report.importReadinessClassification)}<p>Google Ads is not marked execution-ready by this phase.</p></div>
    </section>
    <section>
      <h2>Human recommendations</h2>
      <div class="note"><ul>${report.humanRecommendations.map((item) => `<li><strong>${escapeHtml(item.topic)}:</strong> ${escapeHtml(item.recommendation)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Safety confirmations</h2>
      <div class="note">
        <ul>
          <li>GA4 writes made: false</li>
          <li>GTM writes made: false</li>
          <li>GTM published: false</li>
          <li>Google Ads writes made: false</li>
          <li>Google Ads conversion actions created: false</li>
          <li>Google Ads conversions imported: false</li>
          <li>Google Ads campaigns created: false</li>
          <li>Meta touched: false</li>
          <li>Runtime files touched: false</li>
          <li>Secrets/tokens/PII/raw click IDs printed: false</li>
          <li>Apply allowed: false</li>
          <li>Execute now: false</li>
        </ul>
      </div>
    </section>
  </main>
  <footer>Generated ${escapeHtml(report.generatedAt)} from local source artifacts and read-only preflight checks. This browser artifact performs no live API calls.</footer>
</body>
</html>`;
}

function writeReport(root, report) {
  const paths = {
    jsonPath: path.join(root, 'docs/marketing-ops-google-ads-account-preflight.json'),
    markdownPath: path.join(root, 'docs/marketing-ops-google-ads-account-preflight.md'),
    htmlPath: path.join(root, 'docs/marketing-ops-google-ads-account-preflight.html')
  };
  writeJson(paths.jsonPath, report);
  writeText(paths.markdownPath, buildMarkdown(report));
  writeText(paths.htmlPath, buildHtml(report));
  return paths;
}

async function runGoogleAdsAccountPreflight(root) {
  const report = await buildReport(root);
  const paths = writeReport(root, report);
  return { report, paths };
}

function summaryLines(result) {
  const { report, paths } = result;
  return [
    `Google Ads account preflight: ${statusLabel(report.overallStatus)}`,
    `- Credential status: ${statusLabel(report.credentialStatus.status)}`,
    `- Account identity status: ${statusLabel(report.accountIdentity.status)}`,
    `- Permission/access status: ${statusLabel(report.permissionAccessStatus.errorCategory)}`,
    `- Existing conversion actions: ${report.existingConversionActions.count}`,
    `- Duplicate-risk result: ${statusLabel(report.duplicateRiskReview.result)}`,
    `- Conversion goals status: ${statusLabel(report.conversionGoalsPreflight.status)}`,
    `- GA4 link status: ${statusLabel(report.ga4LinkStatus.status)}`,
    `- Auto-tagging status: ${statusLabel(report.autoTaggingStatus.status)}`,
    `- Import readiness classification: ${statusLabel(report.importReadinessClassification)}`,
    '- Google Ads writes made: false',
    '- Google Ads conversion actions created: false',
    '- Google Ads conversions imported: false',
    '- Google Ads campaigns created: false',
    `- Recommended next phase: ${report.recommendedNextPhase}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    `- HTML: ${paths.htmlPath}`
  ];
}

module.exports = {
  buildReport,
  runGoogleAdsAccountPreflight,
  summaryLines
};
