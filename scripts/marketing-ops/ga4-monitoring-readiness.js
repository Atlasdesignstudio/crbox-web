'use strict';

const fs = require('fs');
const path = require('path');
const { EXPECTED, REQUIRED_ENV } = require('./config');
const {
  getGoogleAccessToken,
  getGoogleTokenInfo,
  googleApiGet,
  googleApiPost,
  readableGoogleError
} = require('./google-auth');
const { envValue, maskSecretsInText, missingEnv } = require('./utils');

const ADMIN_BASE = 'https://analyticsadmin.googleapis.com/v1beta';
const DATA_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const ANALYTICS_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-gtm-publish-result.json',
  'docs/marketing-ops-gtm-post-publish-smoke-test.json',
  'docs/measurement-map-v1.md',
  'docs/analytics-taxonomy.md'
]);
const EXPECTED_CUSTOM_DIMENSIONS = Object.freeze([
  'gclid_present',
  'fbclid_present',
  'attribution_touch',
  'utm_content',
  'utm_term'
]);
const EXPECTED_KEY_EVENTS = Object.freeze([
  { eventName: 'quote_request_submit_success', required: true },
  { eventName: 'signup_success', required: true },
  { eventName: 'contact_form_submit_success', required: false },
  { eventName: 'quote_request_start', required: false },
  { eventName: 'calculator_result', required: false }
]);
const EXPECTED_EVENTS = Object.freeze([
  'quote_request_start',
  'quote_request_submit_success',
  'contact_form_submit_success',
  'calculator_start',
  'calculator_query',
  'calculator_result',
  'signup_success',
  'whatsapp_click',
  'nav_click',
  'cta_click',
  'scroll_depth',
  'section_visible',
  'form_start',
  'portal_section_view'
]);
const ATTRIBUTION_EVENTS = Object.freeze([
  'quote_request_submit_success',
  'signup_success'
]);
const ATTRIBUTION_DIMENSIONS = Object.freeze([
  { requestedName: 'source', apiName: 'source', type: 'standard' },
  { requestedName: 'medium', apiName: 'medium', type: 'standard' },
  { requestedName: 'campaign', apiName: 'campaignName', type: 'standard' },
  { requestedName: 'utm_source', apiName: 'customEvent:utm_source', type: 'custom' },
  { requestedName: 'utm_medium', apiName: 'customEvent:utm_medium', type: 'custom' },
  { requestedName: 'utm_campaign', apiName: 'customEvent:utm_campaign', type: 'custom' },
  { requestedName: 'utm_content', apiName: 'customEvent:utm_content', type: 'custom' },
  { requestedName: 'utm_term', apiName: 'customEvent:utm_term', type: 'custom' },
  { requestedName: 'gclid_present', apiName: 'customEvent:gclid_present', type: 'custom' },
  { requestedName: 'fbclid_present', apiName: 'customEvent:fbclid_present', type: 'custom' },
  { requestedName: 'attribution_touch', apiName: 'customEvent:attribution_touch', type: 'custom' }
]);

function propertyResourceName(propertyId) {
  const value = String(propertyId || '').trim();
  return value.startsWith('properties/') ? value : `properties/${value}`;
}

function propertyPath(propertyId) {
  return encodeURI(propertyResourceName(propertyId));
}

function readJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function sourceArtifactStatus(root) {
  return SOURCE_ARTIFACTS.map((relativePath) => ({
    path: relativePath,
    available: fs.existsSync(path.join(root, relativePath))
  }));
}

function conciseGoogleError(error) {
  const message = String(error?.message || '');
  if (/analytics data api.*disabled|analytics data api has not been used/i.test(message)) {
    return 'Google Analytics Data API is disabled or has not been used for the OAuth client project.';
  }
  return readableGoogleError(error).replace(/\s+Details:.*$/s, '');
}

function inListFilter(fieldName, values) {
  return {
    filter: {
      fieldName,
      inListFilter: {
        values,
        caseSensitive: true
      }
    }
  };
}

async function runDataReport(accessToken, propertyId, request) {
  return googleApiPost(
    `${DATA_BASE}/${propertyPath(propertyId)}:runReport`,
    accessToken,
    request
  );
}

function parseEventCountRows(response) {
  const counts = new Map();
  for (const row of response.rows || []) {
    const eventName = row.dimensionValues?.[0]?.value || '';
    const eventCount = Number(row.metricValues?.[0]?.value || 0);
    if (eventName) counts.set(eventName, eventCount);
  }
  return counts;
}

async function readEventCounts(accessToken, propertyId, dateRange) {
  const response = await runDataReport(accessToken, propertyId, {
    dateRanges: [dateRange],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: inListFilter('eventName', [...EXPECTED_EVENTS]),
    limit: '100',
    keepEmptyRows: false,
    returnPropertyQuota: false
  });
  return parseEventCountRows(response);
}

async function listKeyEvents(accessToken, propPath) {
  const attempts = [
    {
      endpoint: 'keyEvents',
      url: `${ADMIN_BASE}/${propPath}/keyEvents?pageSize=200`,
      field: 'keyEvents'
    },
    {
      endpoint: 'conversionEvents',
      url: `${ADMIN_BASE}/${propPath}/conversionEvents?pageSize=200`,
      field: 'conversionEvents'
    }
  ];
  const errors = [];

  for (const attempt of attempts) {
    try {
      const data = await googleApiGet(attempt.url, accessToken);
      return {
        endpoint: attempt.endpoint,
        items: data[attempt.field] || [],
        errors
      };
    } catch (error) {
      errors.push(`${attempt.endpoint}: ${readableGoogleError(error)}`);
    }
  }

  return { endpoint: '', items: [], errors };
}

function isMeaningfulDimensionValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized)
    && normalized !== '(not set)'
    && normalized !== '(not provided)'
    && normalized !== 'unknown';
}

async function checkAttributionDimension(accessToken, propertyId, definition, configuredDimensions) {
  if (definition.type === 'custom' && !configuredDimensions.has(definition.requestedName)) {
    return {
      dimension: definition.requestedName,
      apiName: definition.apiName,
      metricName: definition.type === 'standard' ? 'keyEvents' : 'eventCount',
      status: 'not_checked',
      rowsWithValue: 0,
      eventCountWithValue: 0,
      limitation: 'The event parameter is not registered as a GA4 event-scoped custom dimension, so the Data API cannot query it directly.'
    };
  }

  const metricName = definition.type === 'standard' ? 'keyEvents' : 'eventCount';
  try {
    const response = await runDataReport(accessToken, propertyId, {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today', name: 'last_7_days' }],
      dimensions: [{ name: 'eventName' }, { name: definition.apiName }],
      metrics: [{ name: metricName }],
      dimensionFilter: inListFilter('eventName', [...ATTRIBUTION_EVENTS]),
      limit: '1000',
      keepEmptyRows: false,
      returnPropertyQuota: false
    });
    const meaningfulRows = (response.rows || []).filter((row) =>
      isMeaningfulDimensionValue(row.dimensionValues?.[1]?.value)
    );
    const eventCountWithValue = meaningfulRows.reduce(
      (total, row) => total + Number(row.metricValues?.[0]?.value || 0),
      0
    );

    return {
      dimension: definition.requestedName,
      apiName: definition.apiName,
      metricName,
      status: meaningfulRows.length > 0 ? 'observed' : 'configured_but_no_recent_volume',
      rowsWithValue: meaningfulRows.length,
      eventCountWithValue,
      limitation: ''
    };
  } catch (error) {
    return {
      dimension: definition.requestedName,
      apiName: definition.apiName,
      metricName,
      status: 'api_unavailable',
      rowsWithValue: 0,
      eventCountWithValue: 0,
      limitation: conciseGoogleError(error)
    };
  }
}

function baseReport(root) {
  const propertyId = envValue('GA4_PROPERTY_ID');
  const measurementId = envValue('GA4_MEASUREMENT_ID') || EXPECTED.ga4MeasurementId;
  return {
    generatedAt: new Date().toISOString(),
    phase: '3A-1',
    mode: 'ga4_monitoring_readiness_read_only',
    sourceArtifacts: [...SOURCE_ARTIFACTS],
    sourceArtifactAvailability: sourceArtifactStatus(root),
    property: {
      propertyId: propertyId || '',
      measurementId,
      reachable: false,
      measurementIdConfirmed: false
    },
    authReadiness: {
      credentialsAvailable: false,
      tokenAvailableWithoutPrinting: false,
      requiredReadScopesAvailable: false,
      requiredReadScopes: [ANALYTICS_READONLY_SCOPE],
      writeScopesRequired: false,
      missingEnvironmentVariables: []
    },
    adminChecks: {
      propertyRead: false,
      dataStreamsListed: false,
      customDimensionsListed: false,
      keyEventsListed: false,
      keyEventsEndpoint: '',
      status: 'not_checked',
      errors: []
    },
    expectedCustomDimensions: EXPECTED_CUSTOM_DIMENSIONS.map((parameterName) => ({
      parameterName,
      required: true,
      status: 'not_checked',
      displayName: '',
      scope: ''
    })),
    additionalConfiguredCustomDimensions: [],
    expectedKeyEvents: EXPECTED_KEY_EVENTS.map(({ eventName, required }) => ({
      eventName,
      required,
      status: 'not_checked'
    })),
    recentEventObservability: {
      status: 'not_checked',
      dateRange: {
        today: { startDate: 'today', endDate: 'today' },
        last7Days: { startDate: '7daysAgo', endDate: 'today' },
        limitation: 'GA4 Data API standard reports use property-date ranges; this is not a rolling 24-hour query.'
      },
      events: EXPECTED_EVENTS.map((eventName) => ({
        eventName,
        todayCount: null,
        last7DaysCount: null,
        status: 'not_checked'
      })),
      errors: []
    },
    attributionObservability: {
      status: 'not_checked',
      checkedEvents: [...ATTRIBUTION_EVENTS],
      checkedDimensions: ATTRIBUTION_DIMENSIONS.map((definition) => ({
        dimension: definition.requestedName,
        apiName: definition.apiName,
        metricName: definition.type === 'standard' ? 'keyEvents' : 'eventCount',
        status: 'not_checked',
        rowsWithValue: 0,
        eventCountWithValue: 0,
        limitation: ''
      })),
      limitations: [
        'Only aggregate row and event-count signals are retained; dimension values are not written to artifacts.',
        'Unregistered event parameters cannot be queried directly through the GA4 Data API.',
        'No raw gclid or fbclid dimension is requested.'
      ]
    },
    safety: {
      ga4WritesMade: false,
      gtmWritesMade: false,
      gtmPublished: false,
      googleAdsTouched: false,
      metaTouched: false,
      runtimeFilesTouched: false,
      websiteRuntimeFilesTouched: false,
      secretsPrinted: false,
      tokensPrinted: false,
      piiQueried: false,
      piiPrinted: false,
      rawClickIdsQueried: false,
      rawClickIdsPrinted: false
    },
    readinessStatus: 'fail',
    readinessDetail: 'blocked_api_access',
    limitations: [],
    recommendation: {
      prerequisites: [],
      nextPhase: 'Phase 3A-2 - GA4 Event Processing Validation'
    }
  };
}

function evaluateReadiness(report) {
  if (
    !report.authReadiness.tokenAvailableWithoutPrinting
    || !report.authReadiness.requiredReadScopesAvailable
    || !report.property.reachable
    || report.adminChecks.status === 'blocked_api_access'
  ) {
    return { status: 'fail', detail: 'blocked_api_access' };
  }

  const requiredDimensionMissing = report.expectedCustomDimensions.some(
    (item) => item.required && item.status !== 'present'
  );
  const requiredKeyEventMissing = report.expectedKeyEvents.some(
    (item) => item.required && item.status !== 'configured'
  );
  const dataUnavailable = report.recentEventObservability.status === 'api_unavailable';
  const attributionUnavailable = report.attributionObservability.status === 'api_unavailable';
  const anyRecentVolume = report.recentEventObservability.events.some(
    (item) => Number(item.last7DaysCount || 0) > 0
  );

  if (dataUnavailable || attributionUnavailable) {
    return { status: 'partial', detail: 'data_api_unavailable' };
  }
  if (requiredDimensionMissing || requiredKeyEventMissing) {
    return { status: 'partial', detail: 'required_configuration_gap' };
  }
  if (!anyRecentVolume) return { status: 'pass', detail: 'pass_with_low_volume' };
  return { status: 'pass', detail: 'pass' };
}

function buildMarkdown(report) {
  const configuredKeyEvents = report.expectedKeyEvents.filter((item) => item.status === 'configured');
  const seenEvents = report.recentEventObservability.events.filter((item) => item.status === 'seen_recently');
  return [
    '# CRBOX GA4 Monitoring Validation Readiness',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Phase: **3A-1**',
    '',
    'Mode: **ga4_monitoring_readiness_read_only**',
    '',
    '## Executive Summary',
    '',
    `- Readiness status: **${report.readinessStatus}**`,
    `- Readiness detail: **${report.readinessDetail}**`,
    `- GA4 property reachable: ${report.property.reachable}`,
    `- Measurement ID confirmed: ${report.property.measurementIdConfirmed}`,
    `- Recent expected events observed: ${seenEvents.length}`,
    `- Expected key events configured: ${configuredKeyEvents.length}/${report.expectedKeyEvents.length}`,
    '',
    '## Scope',
    '',
    '- Verify local auth and required GA4 read scope.',
    '- Read GA4 Admin configuration for the property, web stream, custom dimensions, and key events.',
    '- Read aggregate recent event counts through the GA4 Data API.',
    '- Check aggregate attribution-dimension observability without storing dimension values.',
    '- Perform no platform or runtime mutations.',
    '',
    '## Source Of Truth',
    '',
    ...report.sourceArtifactAvailability.map((item) => `- \`${item.path}\`: ${item.available ? 'available' : 'missing'}`),
    '',
    '## GA4 Property And Access Readiness',
    '',
    `- Property ID: \`${report.property.propertyId || 'not available'}\``,
    `- Measurement ID: \`${report.property.measurementId}\``,
    `- Property reachable: ${report.property.reachable}`,
    `- Measurement ID confirmed by web-stream list: ${report.property.measurementIdConfirmed}`,
    `- Credentials available: ${report.authReadiness.credentialsAvailable}`,
    `- Access token retrieved without printing: ${report.authReadiness.tokenAvailableWithoutPrinting}`,
    `- Required read scope available: ${report.authReadiness.requiredReadScopesAvailable}`,
    '- Write scopes required by this phase: false',
    '',
    '## Expected Custom Dimensions Status',
    '',
    '| Parameter | Required | Status | Scope |',
    '|---|---:|---|---|',
    ...report.expectedCustomDimensions.map((item) =>
      `| \`${item.parameterName}\` | ${item.required} | **${item.status}** | ${item.scope || 'not available'} |`
    ),
    '',
    '## Expected Key Events Status',
    '',
    '| Event | Required | Status |',
    '|---|---:|---|',
    ...report.expectedKeyEvents.map((item) =>
      `| \`${item.eventName}\` | ${item.required} | **${item.status}** |`
    ),
    '',
    '## Recent Event Observability Summary',
    '',
    `Status: **${report.recentEventObservability.status}**`,
    '',
    '| Event | Today | Last 7 days | Status |',
    '|---|---:|---:|---|',
    ...report.recentEventObservability.events.map((item) =>
      `| \`${item.eventName}\` | ${item.todayCount ?? 'not checked'} | ${item.last7DaysCount ?? 'not checked'} | **${item.status}** |`
    ),
    '',
    report.recentEventObservability.dateRange.limitation,
    '',
    '## Attribution Observability Summary',
    '',
    `Status: **${report.attributionObservability.status}**`,
    '',
    '| Requested dimension | GA4 Data API name | Aggregate metric | Status | Rows with value | Count with value |',
    '|---|---|---|---|---:|---:|',
    ...report.attributionObservability.checkedDimensions.map((item) =>
      `| \`${item.dimension}\` | \`${item.apiName}\` | \`${item.metricName || 'not checked'}\` | **${item.status}** | ${item.rowsWithValue} | ${item.eventCountWithValue} |`
    ),
    '',
    '## Safety Confirmations',
    '',
    ...Object.entries(report.safety).map(([key, value]) => `- ${key}: ${value}`),
    '',
    'The GA4 Data API `runReport` method uses HTTP POST to execute a read-only report query. No GA4 configuration write endpoint is called.',
    '',
    '## Limitations',
    '',
    ...[...report.limitations, ...report.attributionObservability.limitations].map((item) => `- ${item}`),
    '',
    '## Recommended Next Phase',
    '',
    ...report.recommendation.prerequisites.map((item) => `- Prerequisite: ${item}`),
    ...(report.recommendation.prerequisites.length ? [''] : []),
    report.recommendation.nextPhase
  ].join('\n') + '\n';
}

function writeArtifacts(root, report) {
  const jsonPath = path.join(root, 'docs', 'marketing-ops-ga4-monitoring-readiness.json');
  const markdownPath = path.join(root, 'docs', 'marketing-ops-ga4-monitoring-readiness.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(markdownPath, buildMarkdown(report), 'utf8');
  return { jsonPath, markdownPath };
}

async function runGa4MonitoringReadiness(root) {
  const report = baseReport(root);
  const requiredEnvironment = REQUIRED_ENV.ga4;
  const missing = missingEnv(requiredEnvironment);
  report.authReadiness.missingEnvironmentVariables = missing;
  report.authReadiness.credentialsAvailable = missing.length === 0;

  const publishResult = readJson(root, 'docs/marketing-ops-gtm-publish-result.json');
  const smokeTest = readJson(root, 'docs/marketing-ops-gtm-post-publish-smoke-test.json');
  if (!publishResult || publishResult.phase !== '2Q' || publishResult.gtmPublished !== true) {
    report.limitations.push('The Phase 2Q GTM publish result artifact is missing or invalid.');
  }
  if (!smokeTest || smokeTest.phase !== '2R' || smokeTest.finalStatus !== 'pass') {
    report.limitations.push('The Phase 2R post-publish smoke-test artifact is missing or not passing.');
  }

  if (missing.length > 0) {
    report.adminChecks.status = 'blocked_api_access';
    report.adminChecks.errors.push(`Required environment variables are missing: ${missing.join(', ')}`);
    report.limitations.push('GA4 Admin and Data API checks were not run because required local environment values are missing.');
    const readiness = evaluateReadiness(report);
    report.readinessStatus = readiness.status;
    report.readinessDetail = readiness.detail;
    return { report, paths: writeArtifacts(root, report) };
  }

  const propertyId = envValue('GA4_PROPERTY_ID');
  const measurementId = envValue('GA4_MEASUREMENT_ID') || EXPECTED.ga4MeasurementId;
  const propPath = propertyPath(propertyId);
  let accessToken;
  let scopeSet = new Set();

  try {
    accessToken = await getGoogleAccessToken();
    report.authReadiness.tokenAvailableWithoutPrinting = true;
    const tokenInfo = await getGoogleTokenInfo(accessToken);
    scopeSet = new Set(String(tokenInfo.scope || '').split(/\s+/).filter(Boolean));
    report.authReadiness.requiredReadScopesAvailable = scopeSet.has(ANALYTICS_READONLY_SCOPE);
  } catch (error) {
    report.adminChecks.status = 'blocked_api_access';
    report.adminChecks.errors.push(readableGoogleError(error));
    report.limitations.push('Access-token retrieval or token scope verification failed.');
    const readiness = evaluateReadiness(report);
    report.readinessStatus = readiness.status;
    report.readinessDetail = readiness.detail;
    return { report, paths: writeArtifacts(root, report) };
  }

  if (!report.authReadiness.requiredReadScopesAvailable) {
    report.adminChecks.status = 'blocked_api_access';
    report.adminChecks.errors.push(`Required OAuth scope is missing: ${ANALYTICS_READONLY_SCOPE}`);
    report.limitations.push('The GA4 read-only OAuth scope is unavailable.');
    const readiness = evaluateReadiness(report);
    report.readinessStatus = readiness.status;
    report.readinessDetail = readiness.detail;
    return { report, paths: writeArtifacts(root, report) };
  }

  let configuredDimensions = new Set();
  let configuredKeyEvents = new Set();

  try {
    const property = await googleApiGet(`${ADMIN_BASE}/${propPath}`, accessToken);
    report.property.reachable = Boolean(property?.name);
    report.adminChecks.propertyRead = report.property.reachable;

    const streamsData = await googleApiGet(`${ADMIN_BASE}/${propPath}/dataStreams?pageSize=200`, accessToken);
    report.adminChecks.dataStreamsListed = true;
    const matchingStream = (streamsData.dataStreams || []).find((stream) =>
      stream.type === 'WEB_DATA_STREAM'
      && stream.webStreamData?.measurementId === measurementId
    );
    report.property.measurementIdConfirmed = Boolean(matchingStream)
      && measurementId === EXPECTED.ga4MeasurementId;

    const dimensionsData = await googleApiGet(`${ADMIN_BASE}/${propPath}/customDimensions?pageSize=200`, accessToken);
    const dimensions = dimensionsData.customDimensions || [];
    report.adminChecks.customDimensionsListed = true;
    configuredDimensions = new Set(
      dimensions
        .filter((item) => !item.scope || item.scope === 'EVENT')
        .map((item) => item.parameterName)
        .filter(Boolean)
    );
    report.expectedCustomDimensions = EXPECTED_CUSTOM_DIMENSIONS.map((parameterName) => {
      const found = dimensions.find((item) =>
        item.parameterName === parameterName && (!item.scope || item.scope === 'EVENT')
      );
      return {
        parameterName,
        required: true,
        status: found ? 'present' : 'missing',
        displayName: found?.displayName || '',
        scope: found?.scope || ''
      };
    });
    report.additionalConfiguredCustomDimensions = dimensions
      .filter((item) =>
        item.parameterName
        && (!item.scope || item.scope === 'EVENT')
        && !EXPECTED_CUSTOM_DIMENSIONS.includes(item.parameterName)
      )
      .map((item) => ({
        parameterName: item.parameterName,
        displayName: item.displayName || '',
        scope: item.scope || ''
      }));

    const keyEventsResult = await listKeyEvents(accessToken, propPath);
    report.adminChecks.keyEventsEndpoint = keyEventsResult.endpoint;
    report.adminChecks.keyEventsListed = Boolean(keyEventsResult.endpoint);
    report.adminChecks.errors.push(...keyEventsResult.errors);
    configuredKeyEvents = new Set(
      keyEventsResult.items.map((item) => item.eventName).filter(Boolean)
    );
    report.expectedKeyEvents = EXPECTED_KEY_EVENTS.map(({ eventName, required }) => ({
      eventName,
      required,
      status: keyEventsResult.endpoint
        ? (configuredKeyEvents.has(eventName) ? 'configured' : 'missing')
        : 'api_unavailable'
    }));
    report.adminChecks.status = report.property.reachable
      && report.adminChecks.customDimensionsListed
      && report.adminChecks.keyEventsListed
      ? 'pass'
      : 'partial';
  } catch (error) {
    report.adminChecks.status = 'blocked_api_access';
    report.adminChecks.errors.push(readableGoogleError(error));
    report.limitations.push('GA4 Admin configuration could not be fully read.');
  }

  if (report.property.reachable) {
    try {
      const [todayCounts, last7DaysCounts] = await Promise.all([
        readEventCounts(accessToken, propertyId, {
          startDate: 'today',
          endDate: 'today',
          name: 'today'
        }),
        readEventCounts(accessToken, propertyId, {
          startDate: '7daysAgo',
          endDate: 'today',
          name: 'last_7_days'
        })
      ]);
      report.recentEventObservability.events = EXPECTED_EVENTS.map((eventName) => {
        const todayCount = todayCounts.get(eventName) || 0;
        const last7DaysCount = last7DaysCounts.get(eventName) || 0;
        const status = last7DaysCount > 0
          ? 'seen_recently'
          : (configuredKeyEvents.has(eventName)
            ? 'configured_but_no_recent_volume'
            : 'not_observed');
        return { eventName, todayCount, last7DaysCount, status };
      });
      report.recentEventObservability.status = 'pass';
    } catch (error) {
      report.recentEventObservability.status = 'api_unavailable';
      report.recentEventObservability.errors.push(conciseGoogleError(error));
      report.recentEventObservability.events = EXPECTED_EVENTS.map((eventName) => ({
        eventName,
        todayCount: null,
        last7DaysCount: null,
        status: 'api_unavailable'
      }));
    }

    if (report.recentEventObservability.status === 'api_unavailable') {
      const limitation = report.recentEventObservability.errors[0]
        || 'GA4 Data API reporting is unavailable.';
      report.attributionObservability.checkedDimensions = ATTRIBUTION_DIMENSIONS.map((definition) => ({
        dimension: definition.requestedName,
        apiName: definition.apiName,
        metricName: definition.type === 'standard' ? 'keyEvents' : 'eventCount',
        status: definition.type === 'custom' && !configuredDimensions.has(definition.requestedName)
          ? 'not_checked'
          : 'api_unavailable',
        rowsWithValue: 0,
        eventCountWithValue: 0,
        limitation: definition.type === 'custom' && !configuredDimensions.has(definition.requestedName)
          ? 'The event parameter is not registered as a GA4 event-scoped custom dimension, so the Data API cannot query it directly.'
          : limitation
      }));
    } else {
      report.attributionObservability.checkedDimensions = await Promise.all(
        ATTRIBUTION_DIMENSIONS.map((definition) =>
          checkAttributionDimension(accessToken, propertyId, definition, configuredDimensions)
        )
      );
    }
    const attributionStatuses = new Set(
      report.attributionObservability.checkedDimensions.map((item) => item.status)
    );
    const queryableStatuses = report.attributionObservability.checkedDimensions
      .filter((item) => item.status !== 'not_checked')
      .map((item) => item.status);
    report.attributionObservability.status = queryableStatuses.length > 0
      && queryableStatuses.every((status) => status === 'api_unavailable')
      ? 'api_unavailable'
      : (attributionStatuses.has('api_unavailable') || attributionStatuses.has('not_checked')
        ? 'partial'
        : 'pass');
  }

  const readiness = evaluateReadiness(report);
  report.readinessStatus = readiness.status;
  report.readinessDetail = readiness.detail;
  if (report.recentEventObservability.status === 'api_unavailable') {
    report.recommendation.prerequisites.push(
      'Enable the Google Analytics Data API for the OAuth client project, then rerun this read-only command.'
    );
  }
  const paths = writeArtifacts(root, report);
  return { report, paths };
}

function summaryLines(run) {
  const { report, paths } = run;
  const configuredKeyEvents = report.expectedKeyEvents.filter((item) => item.status === 'configured');
  const observedEvents = report.recentEventObservability.events.filter(
    (item) => item.status === 'seen_recently'
  );
  return [
    `GA4 monitoring readiness: ${String(report.readinessStatus).toUpperCase()}`,
    `- Detail: ${report.readinessDetail}`,
    `- Property reachable: ${report.property.reachable}`,
    `- Measurement ID confirmed: ${report.property.measurementIdConfirmed}`,
    `- Custom dimensions listed: ${report.adminChecks.customDimensionsListed}`,
    `- Key events listed: ${report.adminChecks.keyEventsListed}`,
    `- Configured expected key events: ${configuredKeyEvents.length}/${report.expectedKeyEvents.length}`,
    `- Recent event observability: ${report.recentEventObservability.status}`,
    ...(report.recentEventObservability.status === 'pass'
      ? [`- Recent expected events observed: ${observedEvents.length}/${report.recentEventObservability.events.length}`]
      : []),
    `- Attribution observability: ${report.attributionObservability.status}`,
    '- GA4 writes made: false',
    '- GTM writes made: false',
    '- GTM published: false',
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`
  ];
}

module.exports = {
  ANALYTICS_READONLY_SCOPE,
  EXPECTED_CUSTOM_DIMENSIONS,
  EXPECTED_EVENTS,
  EXPECTED_KEY_EVENTS,
  runGa4MonitoringReadiness,
  summaryLines
};
