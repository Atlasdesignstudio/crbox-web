#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { getGoogleAccessToken, googleApiGet, googleApiPost, readableGoogleError } = require('./google-auth');

const ADMIN_BASE = 'https://analyticsadmin.googleapis.com/v1beta';
const DATA_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v24';
const REQUEST_TIMEOUT_MS = 12000;
const TARGET_EVENTS = Object.freeze([
  'contact_form_submit_success',
  'calculator_result',
  'whatsapp_click',
  'email_click'
]);

function propertyPath() {
  const propertyId = process.env.GA4_PROPERTY_ID || '';
  return propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;
}

function normalizeCustomerId(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function maskCustomerId(value) {
  const normalized = normalizeCustomerId(value);
  if (!normalized) return 'not_available';
  return `${normalized.slice(0, 3)}...${normalized.slice(-4)}`;
}

function readJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function requestSignal() {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  }
  return undefined;
}

function inListFilter(fieldName, values) {
  return {
    filter: {
      fieldName,
      inListFilter: { values, caseSensitive: true }
    }
  };
}

async function fetchGoogleAdsAccessToken(env) {
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
  if (!response.ok || !body.access_token) {
    const error = new Error('google_ads_oauth_refresh_failed');
    error.status = response.status;
    throw error;
  }
  return body.access_token;
}

async function googleAdsSearch(customerId, query, env, accessToken) {
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'content-type': 'application/json'
  };
  const loginCustomerId = normalizeCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId;

  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${normalizeCustomerId(customerId)}/googleAds:searchStream`,
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
    throw error;
  }
  return Array.isArray(body) ? body.flatMap((chunk) => chunk.results || []) : [];
}

async function listGa4GoogleAdsLinks(accessToken) {
  try {
    const data = await googleApiGet(`${ADMIN_BASE}/${encodeURI(propertyPath())}/googleAdsLinks?pageSize=200`, accessToken);
    return {
      status: 'checked',
      links: (data.googleAdsLinks || []).map((link) => ({
        name: link.name || '',
        customerId: link.customerId || '',
        customerIdMasked: maskCustomerId(link.customerId),
        canManageClients: link.canManageClients ?? 'not_available',
        adsPersonalizationEnabled: link.adsPersonalizationEnabled ?? 'not_available'
      })),
      error: ''
    };
  } catch (error) {
    return { status: 'api_unavailable', links: [], error: readableGoogleError(error).replace(/\s+Details:.*$/s, '') };
  }
}

async function listKeyEvents(accessToken) {
  const attempts = [
    { endpoint: 'keyEvents', url: `${ADMIN_BASE}/${encodeURI(propertyPath())}/keyEvents?pageSize=200`, field: 'keyEvents' },
    { endpoint: 'conversionEvents', url: `${ADMIN_BASE}/${encodeURI(propertyPath())}/conversionEvents?pageSize=200`, field: 'conversionEvents' }
  ];
  const errors = [];
  for (const attempt of attempts) {
    try {
      const data = await googleApiGet(attempt.url, accessToken);
      return {
        status: 'checked',
        endpoint: attempt.endpoint,
        eventNames: (data[attempt.field] || []).map((item) => item.eventName).filter(Boolean),
        errors
      };
    } catch (error) {
      errors.push(`${attempt.endpoint}: ${readableGoogleError(error).replace(/\s+Details:.*$/s, '')}`);
    }
  }
  return { status: 'api_unavailable', endpoint: '', eventNames: [], errors };
}

async function readGa4EventCounts(accessToken) {
  const response = await googleApiPost(`${DATA_BASE}/${encodeURI(propertyPath())}:runReport`, accessToken, {
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: inListFilter('eventName', TARGET_EVENTS),
    limit: '100',
    keepEmptyRows: false,
    returnPropertyQuota: false
  });
  const counts = new Map();
  for (const row of response.rows || []) {
    counts.set(row.dimensionValues?.[0]?.value || '', Number(row.metricValues?.[0]?.value || 0));
  }
  return TARGET_EVENTS.map((eventName) => ({
    eventName,
    last7DaysCount: counts.get(eventName) || 0,
    observedInGa4Reporting: (counts.get(eventName) || 0) > 0
  }));
}

async function readGoogleAdsConversionActions(env) {
  const accessToken = await fetchGoogleAdsAccessToken(env);
  const results = await googleAdsSearch(
    env.GOOGLE_ADS_CUSTOMER_ID,
    'SELECT conversion_action.resource_name, conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category, conversion_action.origin, conversion_action.include_in_conversions_metric, conversion_action.primary_for_goal FROM conversion_action ORDER BY conversion_action.name',
    env,
    accessToken
  );
  return results.map((row) => {
    const action = row.conversionAction || {};
    return {
      resourceName: action.resourceName || '',
      id: action.id || '',
      name: action.name || '',
      status: action.status || '',
      type: action.type || '',
      category: action.category || '',
      origin: action.origin || '',
      includeInConversionsMetric: action.includeInConversionsMetric ?? 'not_available',
      primaryForGoal: action.primaryForGoal ?? 'not_available'
    };
  });
}

function classify(report) {
  const linkToCustomer = report.ga4GoogleAdsLink.linkToTargetCustomer === true
    || report.ga4GoogleAdsLink.linkToTargetCustomer === 'inferred_from_existing_ga4_imported_conversion_actions';
  const missingKeyEvents = report.targetEvents.filter((event) => !event.ga4KeyEventConfigured);
  const missingImportActions = report.targetEvents.filter((event) => !event.visibleInGoogleAdsConversionActions);

  if (!linkToCustomer) return 'ga4_not_linked_or_link_not_readable';
  if (missingKeyEvents.length === TARGET_EVENTS.length) return 'events_not_marked_as_key_events';
  if (missingImportActions.length) return 'import_candidates_not_available_or_not_imported';
  return 'api_limitation_or_wrong_import_method';
}

function renderMarkdown(report) {
  const rows = report.targetEvents.map((event) => `| ${event.eventName} | ${event.ga4Last7DaysCount} | ${event.ga4KeyEventConfigured} | ${event.visibleInGoogleAdsConversionActions} | ${event.status} |`).join('\n');
  return `# Google Ads GA4 Import Diagnostic

## Summary

Blocker classification: **${report.blockerClassification}**

Phase 3J should remain blocked: **${report.phase3JShouldRemainBlocked}**

## GA4 Link Status

- Status: ${report.ga4GoogleAdsLink.status}
- Link to target customer found: ${report.ga4GoogleAdsLink.linkToTargetCustomer}
- Target customer: ${report.googleAdsCustomerIdMasked}

## Target Events

| Event | GA4 last 7 days count | GA4 key event | Visible in Google Ads conversion actions | Status |
| --- | ---: | --- | --- | --- |
${rows}

## Evidence

${report.evidence.map((item) => `- ${item}`).join('\n')}

## Recommended Manual Fix

${report.recommendedManualFix.map((item) => `- ${item}`).join('\n')}

## Safety

- No Google Ads writes.
- No GA4/GTM writes.
- No conversions or campaigns created.
- No secrets or tokens printed.
`;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHtml(report) {
  const rows = report.targetEvents.map((event) => `<tr><td>${escapeHtml(event.eventName)}</td><td>${event.ga4Last7DaysCount}</td><td>${event.ga4KeyEventConfigured}</td><td>${event.visibleInGoogleAdsConversionActions}</td><td>${escapeHtml(event.status)}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Google Ads GA4 Import Diagnostic</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f7f8fb;color:#1f2937}header{background:#123047;color:white;padding:32px}main{max-width:1100px;margin:auto;padding:24px}table{width:100%;border-collapse:collapse;background:white}th,td{border:1px solid #dce3ec;padding:10px;text-align:left}.notice{background:white;border-left:4px solid #c2410c;padding:16px;margin:16px 0}</style></head><body><header><h1>Google Ads GA4 Import Diagnostic</h1><p>${escapeHtml(report.blockerClassification)}</p></header><main><div class="notice">Phase 3J should remain blocked: ${report.phase3JShouldRemainBlocked}</div><table><thead><tr><th>Event</th><th>GA4 count</th><th>Key event</th><th>Google Ads visible</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></main></body></html>\n`;
}

function writeArtifacts(root, report) {
  const jsonPath = path.join(root, 'docs/marketing-ops-google-ads-ga4-import-diagnostic.json');
  const mdPath = path.join(root, 'docs/marketing-ops-google-ads-ga4-import-diagnostic.md');
  const htmlPath = path.join(root, 'docs/marketing-ops-google-ads-ga4-import-diagnostic.html');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  fs.writeFileSync(htmlPath, renderHtml(report));
  return { jsonPath, mdPath, htmlPath };
}

async function runGoogleAdsGa4ImportDiagnostic(root) {
  let ga4AccessToken = null;
  let ga4AuthStatus = 'pass';
  let ga4AuthError = '';
  try {
    ga4AccessToken = await getGoogleAccessToken();
  } catch (error) {
    ga4AuthStatus = 'oauth_error';
    ga4AuthError = readableGoogleError(error).replace(/\s+Details:.*$/s, '');
  }

  const googleAdsActions = await readGoogleAdsConversionActions(process.env);
  let ga4GoogleAdsLink = { status: 'not_checked_ga4_oauth_unavailable', links: [], error: ga4AuthError };
  let keyEvents = { status: 'not_checked_ga4_oauth_unavailable', endpoint: '', eventNames: [], errors: ga4AuthError ? [ga4AuthError] : [] };
  let ga4Counts = [];

  if (ga4AccessToken) {
    [ga4GoogleAdsLink, keyEvents, ga4Counts] = await Promise.all([
      listGa4GoogleAdsLinks(ga4AccessToken),
      listKeyEvents(ga4AccessToken),
      readGa4EventCounts(ga4AccessToken)
    ]);
  } else {
    const readiness = readJson(root, 'docs/marketing-ops-ga4-monitoring-readiness.json');
    const processing = readJson(root, 'docs/marketing-ops-ga4-event-processing-validation.json');
    keyEvents.eventNames = (readiness?.expectedKeyEvents || [])
      .filter((event) => event.status === 'configured')
      .map((event) => event.eventName);
    ga4Counts = TARGET_EVENTS.map((eventName) => {
      const processingEvent = (processing?.eventVolumeValidation || []).find((event) => event.eventName === eventName);
      const readinessEvent = (readiness?.recentEventObservability?.events || []).find((event) => event.eventName === eventName);
      const last7DaysCount = processingEvent?.last7DaysCount ?? readinessEvent?.last7DaysCount ?? 0;
      return {
        eventName,
        last7DaysCount,
        observedInGa4Reporting: last7DaysCount > 0,
        source: processingEvent || readinessEvent ? 'existing_read_only_artifact' : 'not_available'
      };
    });
  }
  const keyEventSet = new Set(keyEvents.eventNames);
  const actionNames = new Set(googleAdsActions.map((action) => action.name));
  const targetEvents = TARGET_EVENTS.map((eventName) => {
    const ga4Count = ga4Counts.find((item) => item.eventName === eventName);
    const googleAdsImportedName = `CRBOX Website (web) ${eventName}`;
    const plannedName = {
      contact_form_submit_success: 'CRBOX - Contact Form Submitted',
      calculator_result: 'CRBOX - Calculator Result Generated',
      whatsapp_click: 'CRBOX - WhatsApp Click',
      email_click: 'CRBOX - Email Click'
    }[eventName];
    const visible = actionNames.has(googleAdsImportedName) || actionNames.has(plannedName);
    const key = keyEventSet.has(eventName);
    return {
      eventName,
      ga4Last7DaysCount: ga4Count?.last7DaysCount || 0,
      observedInGa4Reporting: Boolean(ga4Count?.observedInGa4Reporting),
      ga4KeyEventConfigured: key,
      visibleInGoogleAdsConversionActions: visible,
      expectedImportedActionName: googleAdsImportedName,
      plannedActionName: plannedName,
      status: key
        ? visible ? 'import_candidate_visible' : 'key_event_but_not_visible_in_google_ads'
        : 'observed_but_not_key_event'
    };
  });

  let linkToTargetCustomer = ga4GoogleAdsLink.links.some((link) =>
    normalizeCustomerId(link.customerId) === normalizeCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID)
  );
  const hasGa4ImportedActions = googleAdsActions.some((action) =>
    String(action.type || '').startsWith('GOOGLE_ANALYTICS_4')
  );
  if (!linkToTargetCustomer && hasGa4ImportedActions) {
    linkToTargetCustomer = 'inferred_from_existing_ga4_imported_conversion_actions';
  }
  ga4GoogleAdsLink.linkToTargetCustomer = linkToTargetCustomer;

  const report = {
    generatedAt: new Date().toISOString(),
    phase: '3J-Diagnostic',
    mode: 'google_ads_ga4_import_read_only_diagnostic',
    googleAdsCustomerIdMasked: maskCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID),
    ga4PropertyId: process.env.GA4_PROPERTY_ID || '',
    ga4AuthStatus,
    ga4AuthErrorCategory: ga4AuthStatus === 'pass' ? 'none' : 'oauth_error',
    ga4GoogleAdsLink,
    keyEvents: {
      status: keyEvents.status,
      endpoint: keyEvents.endpoint,
      targetEventsConfigured: targetEvents.filter((event) => event.ga4KeyEventConfigured).map((event) => event.eventName),
      targetEventsMissing: targetEvents.filter((event) => !event.ga4KeyEventConfigured).map((event) => event.eventName)
    },
    googleAdsConversionActionInventory: {
      count: googleAdsActions.length,
      targetVisibleActions: targetEvents.filter((event) => event.visibleInGoogleAdsConversionActions).map((event) => event.eventName),
      targetMissingActions: targetEvents.filter((event) => !event.visibleInGoogleAdsConversionActions).map((event) => event.eventName)
    },
    targetEvents,
    blockerClassification: '',
    evidence: [],
    recommendedManualFix: [
      'In GA4 Admin, mark the approved secondary events as key events if they should be importable into Google Ads.',
      'Confirm the GA4 property is linked to Google Ads customer 1440115096.',
      'Wait for Google Ads to surface the newly eligible GA4 key events as importable conversion actions.',
      'Rerun the read-only diagnostic and Phase 3J preflight before any future write attempt.'
    ],
    phase3JShouldRemainBlocked: true,
    safety: {
      ga4WritesMade: false,
      gtmWritesMade: false,
      googleAdsWritesMade: false,
      googleAdsConversionActionsCreated: false,
      googleAdsConversionsImported: false,
      googleAdsCampaignsCreated: false,
      secretsPrinted: false,
      tokensPrinted: false,
      piiPrinted: false,
      rawClickIdsPrinted: false
    }
  };
  report.blockerClassification = classify(report);
  report.evidence = [
    `GA4 link to target customer found: ${linkToTargetCustomer}.`,
    `Target events observed in GA4 reporting: ${targetEvents.filter((event) => event.observedInGa4Reporting).map((event) => event.eventName).join(', ') || 'none'}.`,
    `Target events configured as GA4 key events: ${report.keyEvents.targetEventsConfigured.join(', ') || 'none'}.`,
    `Target events visible in Google Ads conversion actions: ${report.googleAdsConversionActionInventory.targetVisibleActions.join(', ') || 'none'}.`
  ];
  const paths = writeArtifacts(root, report);
  return { report, paths };
}

function summaryLines({ report, paths }) {
  return [
    `blockerClassification: ${report.blockerClassification}`,
    `GA4 link to target customer: ${report.ga4GoogleAdsLink.linkToTargetCustomer}`,
    `target events configured as key events: ${report.keyEvents.targetEventsConfigured.join(', ') || 'none'}`,
    `target events missing key event config: ${report.keyEvents.targetEventsMissing.join(', ') || 'none'}`,
    `target events visible in Google Ads: ${report.googleAdsConversionActionInventory.targetVisibleActions.join(', ') || 'none'}`,
    `Phase 3J should remain blocked: ${report.phase3JShouldRemainBlocked}`,
    `JSON: ${paths.jsonPath}`,
    `Markdown: ${paths.mdPath}`,
    `HTML: ${paths.htmlPath}`,
    'Mutation statement: no GA4, GTM, Google Ads, Meta, or runtime platform writes were performed.'
  ];
}

module.exports = {
  runGoogleAdsGa4ImportDiagnostic,
  summaryLines
};

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  runGoogleAdsGa4ImportDiagnostic(root)
    .then((result) => {
      for (const line of summaryLines(result)) console.log(line);
    })
    .catch((error) => {
      console.error(error && error.message ? error.message : String(error));
      process.exitCode = 1;
    });
}
