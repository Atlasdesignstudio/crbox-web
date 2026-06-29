#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { runGoogleAdsAccountPreflight } = require('./google-ads-account-preflight');

const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v24';
const REQUEST_TIMEOUT_MS = 12000;

const EXPECTED_ACTIONS = Object.freeze([
  {
    eventName: 'quote_request_submit_success',
    actionName: 'CRBOX Website (web) quote_request_submit_success',
    expectedStatus: 'ENABLED',
    expectedPrimaryForGoal: true,
    expectedIncludeInConversionsMetric: true,
    role: 'primary_included'
  },
  {
    eventName: 'signup_success',
    actionName: 'CRBOX Website (web) signup_success',
    expectedStatus: 'ENABLED',
    expectedPrimaryForGoal: false,
    expectedIncludeInConversionsMetric: false,
    role: 'secondary_excluded_quality_dependent'
  },
  {
    eventName: 'contact_form_submit_success',
    actionName: 'CRBOX Website (web) contact_form_submit_success',
    expectedStatus: 'ENABLED',
    expectedPrimaryForGoal: false,
    expectedIncludeInConversionsMetric: false,
    role: 'secondary_excluded'
  },
  {
    eventName: 'calculator_result',
    actionName: 'CRBOX Website (web) calculator_result',
    expectedStatus: 'ENABLED',
    expectedPrimaryForGoal: false,
    expectedIncludeInConversionsMetric: false,
    role: 'secondary_excluded'
  },
  {
    eventName: 'whatsapp_click',
    actionName: 'CRBOX Website (web) whatsapp_click',
    expectedStatus: 'ENABLED',
    expectedPrimaryForGoal: false,
    expectedIncludeInConversionsMetric: false,
    role: 'secondary_excluded'
  },
  {
    eventName: 'email_click',
    actionName: 'CRBOX Website (web) email_click',
    expectedStatus: 'ENABLED',
    expectedPrimaryForGoal: false,
    expectedIncludeInConversionsMetric: false,
    role: 'secondary_excluded'
  }
]);

function writeText(filePath, content) {
  fs.writeFileSync(filePath, `${content.replace(/\s+$/u, '')}\n`);
}

function requestSignal() {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  }
  return undefined;
}

function normalizeCustomerId(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function sanitizedError(error) {
  const text = `${error?.message || ''} ${JSON.stringify(error?.body || {})}`.toLowerCase();
  let category = 'google_ads_read_error';
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || text.includes('timeout')) category = 'timeout';
  if (text.includes('permission') || text.includes('authorization')) category = 'permission_error';
  if (text.includes('invalid') || text.includes('unrecognized') || text.includes('cannot be used')) category = 'query_not_supported';
  if (text.includes('oauth') || text.includes('unauthorized')) category = 'oauth_error';
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
  if (!response.ok || !body.access_token) {
    const error = new Error('oauth_token_request_failed');
    error.status = response.status;
    throw error;
  }
  return body.access_token;
}

async function googleAdsSearch(customerId, env, accessToken, query) {
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
  return Array.isArray(body) ? body.flatMap((chunk) => chunk.results || []) : [];
}

function existingActions(preflight) {
  return preflight?.existingConversionActions?.actions || [];
}

function findAction(actions, name) {
  return actions.find((action) => action.name === name) || null;
}

function verifyAction(expected, action) {
  const checks = {
    present: Boolean(action),
    statusMatches: action?.status === expected.expectedStatus,
    primaryForGoalMatches: action?.primaryForGoal === expected.expectedPrimaryForGoal,
    includeInConversionsMatches: action?.includeInConversionsMetric === expected.expectedIncludeInConversionsMetric
  };
  const pass = Object.values(checks).every(Boolean);
  return {
    eventName: expected.eventName,
    actionName: expected.actionName,
    role: expected.role,
    status: pass ? 'pass' : 'warning',
    checks,
    observed: action ? {
      name: action.name,
      status: action.status,
      type: action.type,
      category: action.category,
      includeInConversionsMetric: action.includeInConversionsMetric,
      primaryForGoal: action.primaryForGoal
    } : null
  };
}

function duplicateStatus(preflight) {
  const review = preflight?.duplicateRiskReview || {};
  const plannedMatches = review.plannedActionNameReview || [];
  const unexpectedExactMatches = plannedMatches.filter((item) => item.classification === 'exact_name_match');
  return {
    result: unexpectedExactMatches.length ? 'warning_exact_planned_name_match' : 'pass_no_blocking_duplicate_conflicts',
    preflightResult: review.result || 'not_available',
    unexpectedExactMatchCount: unexpectedExactMatches.length,
    notes: [
      'Expected same-event GA4 imported action mappings are not treated as duplicate conflicts after Phase 3J owner approval.',
      'No new duplicate conversion action names were created by Phase 3J.'
    ]
  };
}

async function recentConversionStatus(preflight) {
  const names = EXPECTED_ACTIONS.map((action) => action.actionName);
  try {
    const token = await fetchAccessToken(process.env);
    const escapedNames = names.map((name) => `'${name.replace(/'/g, "\\'")}'`).join(', ');
    const query = `
      SELECT
        segments.conversion_action_name,
        metrics.conversions,
        metrics.all_conversions
      FROM customer
      WHERE segments.date DURING LAST_7_DAYS
        AND segments.conversion_action_name IN (${escapedNames})
    `;
    const rows = await googleAdsSearch(process.env.GOOGLE_ADS_CUSTOMER_ID, process.env, token, query);
    return {
      status: 'checked',
      dateRange: 'LAST_7_DAYS',
      rows: rows.map((row) => ({
        conversionActionName: row.segments?.conversionActionName || 'not_available',
        conversions: Number(row.metrics?.conversions || 0),
        allConversions: Number(row.metrics?.allConversions || 0)
      })),
      limitation: rows.length ? null : 'No recent Google Ads conversion rows returned for the monitored actions.'
    };
  } catch (error) {
    return {
      status: 'not_checked_api_limitation',
      dateRange: 'LAST_7_DAYS',
      rows: [],
      error: sanitizedError(error),
      limitation: 'Recent conversion reporting was not available through the safe read-only query in this phase.'
    };
  }
}

function safety() {
  return {
    ga4WritesMade: false,
    gtmWritesMade: false,
    gtmPublished: false,
    googleAdsWritesMade: false,
    googleAdsConversionActionsCreated: false,
    googleAdsConversionsImported: false,
    googleAdsCampaignsCreated: false,
    campaignsTouched: false,
    metaTouched: false,
    replitTouched: false,
    runtimeFilesTouched: false,
    websiteRuntimeFilesTouched: false,
    secretsPrinted: false,
    tokensPrinted: false,
    piiPrinted: false,
    rawClickIdsPrinted: false
  };
}

function renderMarkdown(report) {
  const rows = report.conversionActionVerification.map((item) => `| ${item.eventName} | ${item.role} | ${item.observed?.status || 'missing'} | ${item.observed?.primaryForGoal ?? 'missing'} | ${item.observed?.includeInConversionsMetric ?? 'missing'} | ${item.status} |`).join('\n');
  const warnings = report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join('\n') : 'No blocking warnings.';
  return `# Google Ads Post-Apply Monitoring / Conversion Verification

## Summary

Status: **${report.overallStatus}**

Account: **${report.account.descriptiveName}**

Final conversion action count: **${report.finalConversionActionCount}**

Duplicate status: **${report.duplicateStatus.result}**

## Conversion Action Verification

| Event | Role | Status | Primary for goal | Included in conversions | Result |
| --- | --- | --- | --- | --- | --- |
${rows}

## Blocked Action

- phone_click: ${report.phoneClick.status}

## Recent Reporting

Recent conversion status: **${report.recentConversionReporting.status}**

${report.recentConversionReporting.limitation || 'Recent reporting rows were available.'}

## Warnings

${warnings}

## Safety

- No Google Ads writes were made by Phase 3K.
- No campaigns were touched or created.
- No GA4, GTM, Meta, Replit, or runtime files were modified.
- No secrets or tokens were printed.
`;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHtml(report) {
  const rows = report.conversionActionVerification.map((item) => `<tr><td>${escapeHtml(item.eventName)}</td><td>${escapeHtml(item.role)}</td><td>${escapeHtml(item.observed?.status || 'missing')}</td><td>${escapeHtml(item.observed?.primaryForGoal ?? 'missing')}</td><td>${escapeHtml(item.observed?.includeInConversionsMetric ?? 'missing')}</td><td>${escapeHtml(item.status)}</td></tr>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Google Ads Post-Apply Monitoring</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2937; background: #f7f8fb; }
    header { background: #123047; color: #fff; padding: 32px; }
    main { max-width: 1180px; margin: auto; padding: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 16px 0; }
    .card { background: #fff; border: 1px solid #dce3ec; border-radius: 8px; padding: 16px; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { border: 1px solid #dce3ec; padding: 10px; text-align: left; }
    .pass { color: #166534; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>Google Ads Post-Apply Monitoring</h1>
    <p>${escapeHtml(report.overallStatus)}</p>
  </header>
  <main>
    <section class="grid">
      <div class="card"><strong>Account</strong><br>${escapeHtml(report.account.descriptiveName)}</div>
      <div class="card"><strong>Conversion actions</strong><br>${escapeHtml(report.finalConversionActionCount)}</div>
      <div class="card"><strong>Duplicate status</strong><br>${escapeHtml(report.duplicateStatus.result)}</div>
      <div class="card"><strong>Campaigns touched</strong><br>${escapeHtml(report.safety.campaignsTouched)}</div>
    </section>
    <table>
      <thead><tr><th>Event</th><th>Role</th><th>Status</th><th>Primary</th><th>Included</th><th>Result</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>`;
}

function writeArtifacts(root, report) {
  const jsonPath = path.join(root, 'docs/marketing-ops-google-ads-post-apply-monitoring.json');
  const mdPath = path.join(root, 'docs/marketing-ops-google-ads-post-apply-monitoring.md');
  const htmlPath = path.join(root, 'docs/marketing-ops-google-ads-post-apply-monitoring.html');
  writeText(jsonPath, JSON.stringify(report, null, 2));
  writeText(mdPath, renderMarkdown(report));
  writeText(htmlPath, renderHtml(report));
  return { jsonPath, mdPath, htmlPath };
}

async function runGoogleAdsPostApplyMonitoring(root) {
  const preflightRun = await runGoogleAdsAccountPreflight(root);
  const preflight = preflightRun.report;
  const actions = existingActions(preflight);
  const verification = EXPECTED_ACTIONS.map((expected) => verifyAction(expected, findAction(actions, expected.actionName)));
  const phoneClickMatches = actions.filter((action) => /phone_click|phone click/i.test(action.name || ''));
  const duplicate = duplicateStatus(preflight);
  const recent = await recentConversionStatus(preflight);
  const warnings = [];
  if (preflight.accountIdentity?.descriptiveName !== 'CRBOX') warnings.push('account_not_crbox');
  for (const item of verification) {
    if (item.status !== 'pass') warnings.push(`conversion_action_warning:${item.eventName}`);
  }
  if (phoneClickMatches.length) warnings.push('phone_click_present_unexpectedly');
  if (duplicate.result !== 'pass_no_blocking_duplicate_conflicts') warnings.push(`duplicate_status:${duplicate.result}`);

  const report = {
    generatedAt: new Date().toISOString(),
    phase: '3K',
    mode: 'google_ads_post_apply_monitoring_read_only',
    overallStatus: warnings.length ? 'pass_with_warnings' : 'pass',
    sourceArtifacts: [
      'docs/marketing-ops-google-ads-controlled-import-apply-execution.json',
      'docs/marketing-ops-google-ads-account-preflight.json',
      'docs/marketing-ops-google-ads-ga4-import-diagnostic.json'
    ],
    account: {
      status: preflight.accountIdentity?.status || 'not_available',
      descriptiveName: preflight.accountIdentity?.descriptiveName || 'not_available',
      customerId: preflight.accountIdentity?.customerId || 'not_available'
    },
    finalConversionActionCount: preflight.existingConversionActions?.count || 0,
    conversionActionVerification: verification,
    phoneClick: {
      status: phoneClickMatches.length ? 'warning_present_unexpectedly' : 'absent_blocked',
      matches: phoneClickMatches.map((action) => ({
        name: action.name,
        status: action.status,
        primaryForGoal: action.primaryForGoal,
        includeInConversionsMetric: action.includeInConversionsMetric
      }))
    },
    duplicateStatus: duplicate,
    campaignUntouchedConfirmation: {
      status: 'confirmed_by_scope_and_safety_artifacts',
      googleAdsCampaignsCreated: false,
      campaignsTouched: false
    },
    recentConversionReporting: recent,
    warnings,
    recommendedNextPhase: 'Phase 3L - Google Ads Conversion Monitoring Window',
    safety: safety(),
    paths: {}
  };
  report.paths = writeArtifacts(root, report);
  return { report, paths: report.paths };
}

function summaryLines({ report, paths }) {
  return [
    `overallStatus: ${report.overallStatus}`,
    `account: ${report.account.descriptiveName}`,
    `final conversion action count: ${report.finalConversionActionCount}`,
    `duplicate status: ${report.duplicateStatus.result}`,
    `phone_click: ${report.phoneClick.status}`,
    `recent conversion reporting: ${report.recentConversionReporting.status}`,
    `warnings: ${report.warnings.length ? report.warnings.join(', ') : 'none'}`,
    `JSON: ${paths.jsonPath}`,
    `Markdown: ${paths.mdPath}`,
    `HTML: ${paths.htmlPath}`,
    'Mutation statement: no Google Ads writes, campaign changes, GA4/GTM/Meta changes, or runtime changes were performed.'
  ];
}

module.exports = {
  runGoogleAdsPostApplyMonitoring,
  summaryLines
};

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  runGoogleAdsPostApplyMonitoring(root)
    .then((result) => {
      for (const line of summaryLines(result)) console.log(line);
      if (result.report.overallStatus === 'fail') process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error && error.message ? error.message : String(error));
      process.exitCode = 1;
    });
}
