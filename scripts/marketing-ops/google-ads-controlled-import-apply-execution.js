#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { runGoogleAdsAccountPreflight } = require('./google-ads-account-preflight');

const REQUIRED_APPROVAL_PHRASE = 'I approve Phase 3I controlled Google Ads conversion apply execution for CRBOX, limited to mapping existing quote_request_submit_success and signup_success actions, creating secondary excluded conversion actions for contact_form_submit_success, calculator_result, whatsapp_click, and email_click, and keeping phone_click blocked. I understand this will modify Google Ads conversions but will not create campaigns.';

const REUSE_ACTIONS = Object.freeze([
  {
    eventName: 'quote_request_submit_success',
    existingActionName: 'CRBOX Website (web) quote_request_submit_success',
    includeInConversionsSetting: true,
    role: 'canonical_primary_quote_lead'
  },
  {
    eventName: 'signup_success',
    existingActionName: 'CRBOX Website (web) signup_success',
    includeInConversionsSetting: 'quality_dependent_not_primary_bidding_until_confirmed',
    role: 'quality_dependent_signup'
  }
]);

const SECONDARY_ACTIONS = Object.freeze([
  'contact_form_submit_success',
  'calculator_result',
  'whatsapp_click',
  'email_click'
]);

const SECONDARY_ACTION_NAMES = Object.freeze({
  contact_form_submit_success: 'CRBOX - Contact Form Submitted',
  calculator_result: 'CRBOX - Calculator Result Generated',
  whatsapp_click: 'CRBOX - WhatsApp Click',
  email_click: 'CRBOX - Email Click'
});

const GA4_IMPORTED_ACTION_NAMES = Object.freeze({
  quote_request_submit_success: 'CRBOX Website (web) quote_request_submit_success',
  signup_success: 'CRBOX Website (web) signup_success',
  contact_form_submit_success: 'CRBOX Website (web) contact_form_submit_success',
  calculator_result: 'CRBOX Website (web) calculator_result',
  whatsapp_click: 'CRBOX Website (web) whatsapp_click',
  email_click: 'CRBOX Website (web) email_click'
});

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function approvalFromArgv(argv) {
  const index = argv.indexOf('--approval-phrase');
  if (index >= 0) return argv[index + 1] || '';
  const prefixed = argv.find((arg) => arg.startsWith('--approval-phrase='));
  if (prefixed) return prefixed.slice('--approval-phrase='.length);
  return process.env.MARKETING_AGENT_GOOGLE_ADS_APPROVAL_PHRASE || '';
}

function readJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function existingActions(preflight) {
  return preflight?.existingConversionActions?.actions || [];
}

function findByName(actions, name) {
  return actions.find((action) => action.name === name) || null;
}

function buildOperations(preflight) {
  const actions = existingActions(preflight);
  const operations = [];
  const blockers = [];

  for (const planned of REUSE_ACTIONS) {
    const existing = findByName(actions, planned.existingActionName);
    operations.push({
      eventName: planned.eventName,
      actionName: planned.existingActionName,
      plannedOperation: 'reuse_map_existing_no_duplicate',
      allowedIfNoBlockers: true,
      status: existing ? 'ready_existing_action_found' : 'blocked_existing_action_missing',
      existingResourceName: existing?.resourceName || null,
      includeInConversionsSetting: planned.includeInConversionsSetting,
      role: planned.role,
      writeOperationWouldBe: existing
        ? 'update_existing_conversion_action_mapping_or_goal_settings_if_supported'
        : 'none',
      writeExecuted: false
    });
    if (!existing) blockers.push(`missing_existing_action:${planned.eventName}`);
  }

  for (const eventName of SECONDARY_ACTIONS) {
    const actionName = SECONDARY_ACTION_NAMES[eventName];
    const exactName = findByName(actions, actionName);
    const ga4ImportedEvent = findByName(actions, GA4_IMPORTED_ACTION_NAMES[eventName]);
    operations.push({
      eventName,
      actionName,
      plannedOperation: 'create_or_import_secondary_excluded',
      allowedIfNoBlockers: Boolean(ga4ImportedEvent && !exactName),
      status: exactName
        ? 'blocked_duplicate_planned_name_exists'
        : ga4ImportedEvent
          ? 'ready_existing_ga4_import_action_found'
          : 'blocked_ga4_import_action_not_visible',
      existingResourceName: exactName?.resourceName || ga4ImportedEvent?.resourceName || null,
      includeInConversionsSetting: false,
      role: 'secondary_observation_excluded',
      writeOperationWouldBe: ga4ImportedEvent
        ? 'update_existing_ga4_imported_conversion_action_status_enabled_primary_for_goal_false'
        : 'would_update_visible_imported_ga4_action_or_create_only_if_supported_and_verified',
      writeExecuted: false
    });
    if (exactName) blockers.push(`duplicate_planned_name:${eventName}`);
    if (!exactName && !ga4ImportedEvent) blockers.push(`ga4_import_action_not_visible:${eventName}`);
  }

  operations.push({
    eventName: 'phone_click',
    actionName: 'CRBOX - Phone Click',
    plannedOperation: 'blocked_no_operation',
    allowedIfNoBlockers: false,
    status: 'blocked_until_call_tracking',
    existingResourceName: null,
    includeInConversionsSetting: false,
    role: 'blocked',
    writeOperationWouldBe: 'none',
    writeExecuted: false
  });

  return { operations, blockers };
}

function requestSignal() {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(12000);
  }
  return undefined;
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

async function mutateConversionActions(customerId, operations, env, accessToken, validateOnly) {
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'content-type': 'application/json'
  };
  const loginCustomerId = String(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/[^0-9]/g, '');
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId;
  const normalizedCustomerId = String(customerId || '').replace(/[^0-9]/g, '');
  const response = await fetch(
    `https://googleads.googleapis.com/${process.env.GOOGLE_ADS_API_VERSION || 'v24'}/customers/${normalizedCustomerId}/conversionActions:mutate`,
    {
      method: 'POST',
      headers,
      signal: requestSignal(),
      body: JSON.stringify({
        customerId: normalizedCustomerId,
        operations,
        validateOnly
      })
    }
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('google_ads_conversion_action_mutate_failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function mutationOperationsFromPlan(operations) {
  return operations
    .filter((operation) => operation.eventName !== 'phone_click')
    .filter((operation) => operation.existingResourceName)
    .map((operation) => ({
      update: {
        resourceName: operation.existingResourceName,
        status: 'ENABLED',
        primaryForGoal: operation.eventName === 'quote_request_submit_success'
      },
      updateMask: 'status,primary_for_goal'
    }));
}

function sanitizedMutationError(error) {
  const text = JSON.stringify(error?.body || {});
  let category = 'google_ads_mutate_error';
  if (/field_mask|update_mask/i.test(text)) category = 'field_mask_error';
  if (/permission|authorization/i.test(text)) category = 'permission_error';
  if (/mutate_not_allowed/i.test(text)) category = 'mutate_not_allowed';
  if (/invalid/i.test(text)) category = 'invalid_argument';
  return {
    category,
    httpStatus: error?.status || 'not_available',
    message: category
  };
}

function baseSafety() {
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
    vercelTouched: false,
    runtimeFilesTouched: false,
    websiteRuntimeFilesTouched: false,
    secretsPrinted: false,
    tokensPrinted: false,
    piiPrinted: false,
    rawClickIdsPrinted: false
  };
}

function renderMarkdown(report) {
  const rows = report.operations.map((operation) => `| ${operation.eventName} | ${operation.plannedOperation} | ${operation.status} | ${operation.includeInConversionsSetting} | ${operation.writeExecuted} |`).join('\n');
  const rollbackNotes = report.rollbackNoOpNotes.map((note) => `- ${note}`).join('\n');
  const safetyWriteLine = report.googleAdsWritesMade
    ? 'Approved Google Ads conversion-action writes were made within the Phase 3J scope.'
    : 'No Google Ads writes were made.';
  return `# Google Ads Controlled Import Apply Execution Result

## Summary

Overall status: **${report.overallStatus}**

Google Ads writes made: **${report.googleAdsWritesMade}**

Account name: **${report.accountName}**

Duplicate status: **${report.duplicateStatus}**

## Operations

| Event | Planned operation | Status | Include in conversions | Write executed |
| --- | --- | --- | --- | --- |
${rows}

## Blockers

${report.blockers.length ? report.blockers.map((item) => `- ${item}`).join('\n') : 'No blockers.'}

## Rollback / No-Op Notes

${rollbackNotes}

## Safety

- ${safetyWriteLine}
- No campaigns were created.
- No GA4, GTM, Meta, Replit, Vercel, or runtime files were modified.
- No secrets or tokens were printed.
`;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHtml(report) {
  const rows = report.operations.map((operation) => `<tr><td>${escapeHtml(operation.eventName)}</td><td>${escapeHtml(operation.plannedOperation)}</td><td>${escapeHtml(operation.status)}</td><td>${escapeHtml(operation.includeInConversionsSetting)}</td><td>${escapeHtml(operation.writeExecuted)}</td></tr>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Google Ads Controlled Import Apply Execution Result</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2937; background: #f7f8fb; }
    header { background: #123047; color: white; padding: 32px; }
    main { max-width: 1180px; margin: auto; padding: 24px; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th, td { border: 1px solid #dce3ec; padding: 10px; text-align: left; }
    .notice { background: white; border-left: 4px solid #c2410c; padding: 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <header><h1>Google Ads Controlled Import Apply Execution Result</h1><p>${escapeHtml(report.overallStatus)}</p></header>
  <main>
    <div class="notice">Google Ads writes made: ${report.googleAdsWritesMade}. Conversion actions created/imported: ${report.safety.googleAdsConversionsImported}. Campaigns created: ${report.safety.googleAdsCampaignsCreated}.</div>
    <table><thead><tr><th>Event</th><th>Operation</th><th>Status</th><th>Include in conversions</th><th>Write executed</th></tr></thead><tbody>${rows}</tbody></table>
  </main>
</body>
</html>
`;
}

function writeArtifacts(root, report) {
  const jsonPath = path.join(root, 'docs/marketing-ops-google-ads-controlled-import-apply-execution.json');
  const mdPath = path.join(root, 'docs/marketing-ops-google-ads-controlled-import-apply-execution.md');
  const htmlPath = path.join(root, 'docs/marketing-ops-google-ads-controlled-import-apply-execution.html');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  fs.writeFileSync(htmlPath, renderHtml(report));
  return { jsonPath, mdPath, htmlPath };
}

async function runGoogleAdsControlledImportApplyExecution(root, argv = []) {
  const approval = readJson(root, 'docs/marketing-ops-google-ads-apply-execution-approval.json');
  const dryRun = readJson(root, 'docs/marketing-ops-google-ads-controlled-import-dry-run.json');
  const approvalPhrase = approvalFromArgv(argv);
  const approvalPhraseMatches = approvalPhrase === REQUIRED_APPROVAL_PHRASE;
  const confirmFlagPresent = hasFlag(argv, '--confirm-owner-approval');
  const preflightRun = await runGoogleAdsAccountPreflight(root);
  const preflight = preflightRun.report;
  const accountName = preflight.accountIdentity?.descriptiveName || 'not_available';
  const accountOk = accountName === 'CRBOX';
  const { operations, blockers } = buildOperations(preflight);
  const finalBlockers = [...blockers];
  if (!approval) finalBlockers.push('missing_phase_3i_approval_artifact');
  if (!dryRun) finalBlockers.push('missing_phase_3h_dry_run_artifact');
  if (!approvalPhraseMatches) finalBlockers.push('approval_phrase_missing_or_mismatch');
  if (!confirmFlagPresent) finalBlockers.push('confirm_owner_approval_flag_missing');
  if (!accountOk) finalBlockers.push('account_identity_not_crbox');

  let validateResult = null;
  let mutateResult = null;
  let mutationError = null;
  let writesMade = false;
  let operationsSucceeded = [];
  let postApplyPreflight = null;
  const mutationOperations = mutationOperationsFromPlan(operations);

  if (!finalBlockers.length) {
    try {
      const accessToken = await fetchGoogleAdsAccessToken(process.env);
      validateResult = await mutateConversionActions(process.env.GOOGLE_ADS_CUSTOMER_ID, mutationOperations, process.env, accessToken, true);
      mutateResult = await mutateConversionActions(process.env.GOOGLE_ADS_CUSTOMER_ID, mutationOperations, process.env, accessToken, false);
      writesMade = true;
      operationsSucceeded = operations
        .filter((operation) => operation.eventName !== 'phone_click')
        .map((operation) => ({
          eventName: operation.eventName,
          resourceName: operation.existingResourceName,
          operation: operation.writeOperationWouldBe,
          status: 'succeeded'
        }));
      for (const operation of operations) {
        if (operation.eventName !== 'phone_click') operation.writeExecuted = true;
      }
      postApplyPreflight = (await runGoogleAdsAccountPreflight(root)).report;
    } catch (error) {
      mutationError = sanitizedMutationError(error);
      finalBlockers.push(`mutation_failed:${mutationError.category}`);
    }
  }

  const finalPreflight = postApplyPreflight || preflight;

  const report = {
    generatedAt: new Date().toISOString(),
    phase: '3J',
    mode: 'google_ads_controlled_import_apply_execution',
    overallStatus: finalBlockers.length
      ? writesMade ? 'partial_failure_after_google_ads_write_attempt' : 'blocked_before_google_ads_writes'
      : 'controlled_apply_execution_complete',
    exitCode: finalBlockers.length ? 1 : 0,
    ownerApprovalPhraseProvided: approvalPhraseMatches,
    confirmOwnerApprovalFlagPresent: confirmFlagPresent,
    sourceArtifacts: [
      'docs/marketing-ops-google-ads-apply-execution-approval.json',
      'docs/marketing-ops-google-ads-controlled-import-dry-run.json',
      'docs/marketing-ops-google-ads-account-preflight.json'
    ],
    accountName,
    accountIdentityStatus: preflight.accountIdentity?.status || 'not_available',
    existingConversionActionsCount: preflight.existingConversionActions?.count || 0,
    finalConversionActionCount: finalPreflight.existingConversionActions?.count || 0,
    duplicateStatus: finalPreflight.duplicateRiskReview?.result || preflight.duplicateRiskReview?.result || 'not_available',
    blockers: finalBlockers,
    operations,
    validateOnlyMutation: {
      attempted: !finalBlockers.filter((blocker) => !String(blocker).startsWith('mutation_failed:')).length || Boolean(validateResult),
      succeeded: Boolean(validateResult && !mutationError),
      responseResultCount: validateResult?.results?.length || 0
    },
    mutationError,
    operationsAttempted: operations.map((operation) => ({
      eventName: operation.eventName,
      plannedOperation: operation.plannedOperation,
      attempted: operation.writeExecuted,
      status: operation.status
    })),
    operationsSucceeded,
    operationsSkipped: operations.map((operation) => ({
      eventName: operation.eventName,
      reason: operation.writeExecuted ? 'not_skipped' : operation.status
    })).filter((operation) => operation.reason !== 'not_skipped'),
    conversionActionsReusedMapped: operationsSucceeded
      .filter((operation) => ['quote_request_submit_success', 'signup_success'].includes(operation.eventName)),
    conversionActionsCreatedImported: operationsSucceeded
      .filter((operation) => SECONDARY_ACTIONS.includes(operation.eventName)),
    blockedActions: ['phone_click'],
    includeInConversionsSettings: Object.fromEntries(operations.map((operation) => [
      operation.eventName,
      operation.includeInConversionsSetting
    ])),
    googleAdsWritesMade: writesMade,
    rollbackNoOpNotes: [
      writesMade ? 'If unexpected behavior is observed, set affected conversion actions back to secondary/excluded or HIDDEN only after separate review.' : 'No rollback required because the run stopped before writes.',
      'Do not create duplicate conversion actions for quote_request_submit_success or signup_success.',
      'Campaigns were not touched.'
    ],
    safety: {
      ...baseSafety(),
      googleAdsWritesMade: writesMade,
      googleAdsConversionActionsCreated: false,
      googleAdsConversionsImported: writesMade,
      googleAdsCampaignsCreated: false,
      campaignsTouched: false
    },
    paths: {}
  };
  report.paths = writeArtifacts(root, report);
  return { report, paths: report.paths };
}

function summaryLines({ report, paths }) {
  const mutationStatement = report.googleAdsWritesMade
    ? 'Mutation statement: approved Google Ads conversion-action writes completed; no campaigns or other platform objects were created.'
    : 'Mutation statement: stopped before Google Ads writes; no campaigns, conversions, or platform objects were created.';
  return [
    `overallStatus: ${report.overallStatus}`,
    `Google Ads writes made: ${report.googleAdsWritesMade}`,
    `account name: ${report.accountName}`,
    `existing conversion actions count: ${report.existingConversionActionsCount}`,
    `final conversion action count: ${report.finalConversionActionCount}`,
    `duplicate status: ${report.duplicateStatus}`,
    `blockers: ${report.blockers.length ? report.blockers.join(', ') : 'none'}`,
    `conversion actions reused/mapped: ${report.conversionActionsReusedMapped.length}`,
    `conversion actions created/imported: ${report.conversionActionsCreatedImported.length}`,
    `blocked actions: ${report.blockedActions.join(', ')}`,
    `JSON: ${paths.jsonPath}`,
    `Markdown: ${paths.mdPath}`,
    `HTML: ${paths.htmlPath}`,
    mutationStatement
  ];
}

module.exports = {
  runGoogleAdsControlledImportApplyExecution,
  summaryLines
};

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  runGoogleAdsControlledImportApplyExecution(root, process.argv.slice(2))
    .then((result) => {
      for (const line of summaryLines(result)) console.log(line);
      if (result.report.exitCode) process.exitCode = result.report.exitCode;
    })
    .catch((error) => {
      console.error(error && error.message ? error.message : String(error));
      process.exitCode = 1;
    });
}
