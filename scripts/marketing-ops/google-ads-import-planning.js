'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-paid-media-conversion-map.json',
  'docs/marketing-ops-paid-media-conversion-map.md',
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

const CONVERSION_ACTION_NAMES = Object.freeze({
  quote_request_submit_success: 'CRBOX - Quote Request Submitted',
  signup_success: 'CRBOX - Signup Completed',
  contact_form_submit_success: 'CRBOX - Contact Form Submitted',
  calculator_result: 'CRBOX - Calculator Result Generated',
  whatsapp_click: 'CRBOX - WhatsApp Click',
  email_click: 'CRBOX - Email Click',
  phone_click: 'CRBOX - Phone Click'
});

const DO_NOT_IMPORT_EVENTS = Object.freeze([
  'scroll_depth',
  'section_visible',
  'nav_click',
  'portal_section_view',
  'login_success',
  'login_error',
  'invoice_upload_error',
  'package_search',
  'package_detail_view',
  'package_search_result',
  'outbound_click',
  'form_abandon',
  'signup_error'
]);

function readJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function sourceArtifactAvailability(root) {
  return SOURCE_ARTIFACTS.map((relativePath) => ({
    path: relativePath,
    available: fs.existsSync(path.join(root, relativePath))
  }));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, `${content.replace(/\s+$/u, '')}\n`);
}

function byEventName(items) {
  return new Map((items || []).map((item) => [item.eventName, item]));
}

function sourceStatus(readiness, processing, dashboard, conversionMap, publish, smoke) {
  return {
    phase3A1Readiness: readiness?.readinessStatus || 'not_available',
    phase3A2Validation: processing?.validationStatus || 'not_available',
    phase3A3Dashboard: dashboard?.overallStatus || 'not_available',
    phase3BConversionMap: conversionMap?.overallStatus || 'not_available',
    gtmPublishedVersion: publish?.publishedVersion?.versionId || 'not_available',
    postPublishSmokeTest: smoke?.finalStatus || smoke?.status || 'not_available',
    paidMediaConversionMapAvailable: Boolean(conversionMap)
  };
}

function sourceStatusReady(status) {
  return status.phase3A1Readiness === 'pass'
    && status.phase3A2Validation === 'pass_with_limitations'
    && status.phase3A3Dashboard === 'ready_with_limitations'
    && status.phase3BConversionMap === 'ready_for_import_planning_with_limitations'
    && status.gtmPublishedVersion === '4'
    && status.postPublishSmokeTest === 'pass'
    && status.paidMediaConversionMapAvailable === true;
}

function conversionActionName(eventName) {
  return CONVERSION_ACTION_NAMES[eventName] || `not_planned_for_import:${eventName}`;
}

function businessMeaning(conversionMap, eventName) {
  const all = [
    ...(conversionMap?.primaryConversions || []),
    ...(conversionMap?.secondaryConversions || []),
    ...(conversionMap?.microConversions || []),
    ...(conversionMap?.diagnosticOnlyEvents || [])
  ];
  const found = all.find((item) => item.eventName === eventName);
  return found?.businessMeaning || found?.reason || 'not_available';
}

function plannedAction(eventName, category, conversionMap) {
  const google = conversionMap?.googleAdsImportMap?.[eventName] || {};
  const isImportCandidate = Object.prototype.hasOwnProperty.call(CONVERSION_ACTION_NAMES, eventName);
  return {
    eventName,
    category,
    businessMeaning: businessMeaning(conversionMap, eventName),
    googleAdsImportRecommendation: google.importToGoogleAds || (isImportCandidate ? 'not_checked' : 'no_diagnostic_only'),
    conversionActionName: isImportCandidate ? conversionActionName(eventName) : 'not_applicable',
    includeInConversionsColumn: google.includeInConversionsColumn ?? false,
    biddingUse: google.biddingUse || (category === 'do_not_import' ? 'do_not_import' : 'not_checked'),
    initialOptimizationRole: google.biddingUse || 'not_checked',
    expectedRisk: riskFor(eventName, category),
    caveats: google.caveats || 'not_available',
    approvalStatus: 'requires_future_explicit_approval'
  };
}

function riskFor(eventName, category) {
  if (eventName === 'quote_request_submit_success') return 'low';
  if (eventName === 'signup_success') return 'medium_quality_dependent';
  if (eventName === 'phone_click') return 'blocked_until_call_tracking';
  if (category === 'secondary_observation') return 'medium_if_used_for_bidding';
  if (category === 'do_not_import') return 'high_if_imported_or_optimized';
  return 'not_checked';
}

function buildRecommendedImportSet(conversionMap) {
  const primaryEvents = ['quote_request_submit_success', 'signup_success'];
  const secondaryEvents = [
    'contact_form_submit_success',
    'calculator_result',
    'whatsapp_click',
    'email_click'
  ];
  const laterEvents = ['phone_click'];

  return {
    primaryImportCandidates: primaryEvents.map((eventName) =>
      plannedAction(eventName, 'primary_import_candidate', conversionMap)
    ),
    secondaryObservationCandidates: secondaryEvents.map((eventName) =>
      plannedAction(eventName, 'secondary_observation', conversionMap)
    ),
    laterBlockedCandidates: laterEvents.map((eventName) =>
      plannedAction(eventName, 'later_blocked_candidate', conversionMap)
    ),
    doNotImportCandidates: DO_NOT_IMPORT_EVENTS.map((eventName) =>
      plannedAction(eventName, 'do_not_import', conversionMap)
    )
  };
}

function buildConversionActionNaming() {
  return {
    rationale: [
      'Use business-readable and platform-readable names.',
      'Prefix each action with CRBOX to avoid generic names such as Lead.',
      'Avoid duplicate names and duplicate actions for the same GA4 event.',
      'Keep names stable so reporting and future import payloads do not drift.'
    ],
    proposedNames: Object.entries(CONVERSION_ACTION_NAMES).map(([eventName, conversionActionNameValue]) => ({
      eventName,
      conversionActionName: conversionActionNameValue
    }))
  };
}

function buildIncludePlan(importSet) {
  const rows = [
    ...importSet.primaryImportCandidates,
    ...importSet.secondaryObservationCandidates,
    ...importSet.laterBlockedCandidates,
    ...importSet.doNotImportCandidates
  ];
  return rows.map((row) => ({
    eventName: row.eventName,
    conversionActionName: row.conversionActionName,
    includeInConversionsColumn: row.eventName === 'signup_success'
      ? 'quality_dependent'
      : row.includeInConversionsColumn,
    reasoning: includeReasoning(row.eventName, row.category)
  }));
}

function includeReasoning(eventName, category) {
  if (eventName === 'quote_request_submit_success') {
    return 'Clearest lead outcome; keep primary bidding focused on final quote request submission.';
  }
  if (eventName === 'signup_success') {
    return 'Quality-dependent; include only after activation/lead quality is acceptable, or start as secondary observation.';
  }
  if (category === 'secondary_observation') {
    return 'Useful for reporting and observation, but excluding initially avoids inflating conversions and bidding toward shallow actions.';
  }
  if (eventName === 'phone_click') {
    return 'Blocked until call tracking confirms completed and qualified calls.';
  }
  return 'Diagnostic/internal/error/broad event; exclude from the conversions column.';
}

function buildBiddingUsePlan(importSet) {
  return {
    quote_request_submit_success: 'primary_bidding',
    signup_success: 'primary_bidding_or_secondary_observation_depending_on_quality',
    contact_form_submit_success: 'secondary_observation',
    calculator_result: 'remarketing_signal_or_secondary_observation',
    whatsapp_click: 'secondary_observation',
    email_click: 'secondary_observation',
    phone_click: 'blocked_until_call_tracking',
    diagnosticEvents: 'do_not_import',
    details: [
      ...importSet.primaryImportCandidates,
      ...importSet.secondaryObservationCandidates,
      ...importSet.laterBlockedCandidates,
      ...importSet.doNotImportCandidates
    ].map((row) => ({
      eventName: row.eventName,
      biddingUse: row.eventName === 'phone_click' ? 'blocked_until_call_tracking' : row.biddingUse,
      notes: row.caveats
    }))
  };
}

function buildAttributionAndDuplicateRiskPlanning() {
  return {
    risks: [
      'Imported GA4 conversions may be attributed differently inside Google Ads.',
      'GA4 and Google Ads attribution models may differ.',
      'Duplicate conversion actions can inflate performance if the same event is imported multiple ways.',
      'Secondary events can inflate the conversions column if included too early.',
      'Importing both shallow and final events as primary conversions can train bidding toward low-value actions.',
      'Portal/internal lifecycle events should not be imported as acquisition conversions.'
    ],
    controls: [
      'Check existing Google Ads conversions before creating or importing new ones.',
      'Match by conversion action name and GA4 event source.',
      'Never create duplicate conversion actions for the same GA4 event without explicit approval.',
      'Use one primary quote submit conversion action initially.',
      'Keep secondary conversions as observation first.',
      'Exclude diagnostic and portal/internal events from import.'
    ]
  };
}

function buildAccountLinkingPrerequisites() {
  return [
    ['Confirm Google Ads account ID', 'requires_manual_confirmation'],
    ['Confirm manager account / MCC relationship if applicable', 'requires_manual_confirmation'],
    ['Confirm GA4 property is linked or can be linked', 'requires_manual_confirmation'],
    ['Confirm user permissions', 'requires_manual_confirmation'],
    ['Confirm whether auto-tagging is enabled', 'requires_manual_confirmation'],
    ['Confirm imported GA4 key events are available in Google Ads', 'requires_manual_confirmation'],
    ['Confirm Google Ads conversion goals UI status', 'requires_manual_confirmation'],
    ['Confirm whether existing conversion actions already exist', 'requires_manual_confirmation'],
    ['Confirm timezone and currency if available', 'requires_manual_confirmation'],
    ['Confirm whether enhanced conversions are desired later', 'requires_manual_confirmation'],
    ['Confirm consent requirements', 'requires_manual_confirmation']
  ].map(([item, status]) => ({ item, status }));
}

function buildExecutionReadinessChecklist() {
  return [
    'Review Phase 3B conversion map.',
    'Approve the Google Ads import set.',
    'Confirm Google Ads account ID.',
    'Confirm no duplicate conversion actions.',
    'Confirm GA4-Google Ads link status.',
    'Confirm key events in GA4.',
    'Confirm conversion action names.',
    'Confirm which conversions are included in the conversions column.',
    'Confirm values are set to no value / no fake value initially.',
    'Confirm secondary conversions are observation-only.',
    'Confirm rollback / no-op plan.'
  ].map((item) => ({ item, status: 'required_before_execution' }));
}

function buildRollbackNoOpPlan() {
  return {
    phase3CAction: 'no_rollback_performed_planning_only',
    futureRollbackMeaning: [
      'If conversion actions are created incorrectly, pause or remove them from the conversions column.',
      'Rename/deprecate incorrect actions if needed; do not delete without approval.',
      'If duplicate conversion actions exist, exclude duplicates from the conversions column and document the canonical action.',
      'If event quality is poor, move the action from primary bidding to secondary observation.',
      'If signup quality is poor, exclude signup_success from the conversions column until a quality loop exists.'
    ]
  };
}

function buildConversionValuePlan() {
  return {
    strategy: 'no_fake_values',
    recommendations: [
      'Do not assign fake conversion values.',
      'Start with no value or the default platform setting only if required.',
      'Do not use dynamic values until backend/admin source of truth exists.',
      'Use offline values only in a future approved phase.',
      'Quote submit and signup can later receive values from lead quality or shipment/revenue proxies.'
    ],
    byEvent: [
      {
        eventName: 'quote_request_submit_success',
        initialValue: 'no_value',
        futureValue: 'offline_or_quality_proxy_later'
      },
      {
        eventName: 'signup_success',
        initialValue: 'no_value',
        futureValue: 'activation_or_customer_quality_proxy_later'
      },
      {
        eventName: 'secondary_observation_events',
        initialValue: 'no_value',
        futureValue: 'reporting_only_static_value_later_if_approved'
      }
    ]
  };
}

function buildFutureExecutionSequence() {
  return [
    'Read-only Google Ads account preflight.',
    'Verify GA4-Google Ads linking status.',
    'List existing Google Ads conversion actions.',
    'Compare existing actions against planned action names.',
    'Produce final apply payload review.',
    'Controlled import/create only after explicit approval.',
    'Post-import verification.',
    'Observe for several days before using conversions for automated bidding.'
  ].map((step, index) => ({
    stepNumber: index + 1,
    step,
    executeNow: false
  }));
}

function buildReport(root) {
  const conversionMap = readJson(root, 'docs/marketing-ops-paid-media-conversion-map.json');
  const readiness = readJson(root, 'docs/marketing-ops-ga4-monitoring-readiness.json');
  const processing = readJson(root, 'docs/marketing-ops-ga4-event-processing-validation.json');
  const dashboard = readJson(root, 'docs/marketing-ops-ga4-monitoring-dashboard.json');
  const publish = readJson(root, 'docs/marketing-ops-gtm-publish-result.json');
  const smoke = readJson(root, 'docs/marketing-ops-gtm-post-publish-smoke-test.json');
  const availability = sourceArtifactAvailability(root);
  const status = sourceStatus(readiness, processing, dashboard, conversionMap, publish, smoke);
  const missingSource = availability.some((artifact) => !artifact.available && !artifact.path.endsWith('.md'));
  const overallStatus = missingSource || !sourceStatusReady(status)
    ? 'blocked_missing_source_artifact'
    : 'ready_for_google_ads_import_planning_with_limitations';
  const recommendedImportSet = buildRecommendedImportSet(conversionMap);

  return {
    generatedAt: new Date().toISOString(),
    phase: '3C',
    mode: 'google_ads_import_planning_only',
    sourceArtifacts: SOURCE_ARTIFACTS,
    sourceArtifactAvailability: availability,
    overallStatus,
    sourceStatus: status,
    executiveSummary: [
      'Google Ads is ready for import planning only.',
      'No Google Ads changes are made in this phase.',
      'No conversion actions are created.',
      'No campaigns are created.',
      'This document is the approval artifact before any Google Ads execution phase.'
    ],
    recommendedImportSet,
    conversionActionNaming: buildConversionActionNaming(),
    includeInConversionsColumnPlan: buildIncludePlan(recommendedImportSet),
    biddingUsePlan: buildBiddingUsePlan(recommendedImportSet),
    attributionAndDuplicateRiskPlanning: buildAttributionAndDuplicateRiskPlanning(),
    accountLinkingPrerequisites: buildAccountLinkingPrerequisites(),
    executionReadinessChecklist: buildExecutionReadinessChecklist(),
    rollbackNoOpPlan: buildRollbackNoOpPlan(),
    conversionValuePlan: buildConversionValuePlan(),
    futureExecutionSequence: buildFutureExecutionSequence(),
    recommendedNextPhase: 'Phase 3D - Google Ads Import Payload Review',
    safety: {
      ga4WritesMade: false,
      gtmWritesMade: false,
      gtmPublished: false,
      googleAdsTouched: false,
      googleAdsConversionActionsCreated: false,
      googleAdsConversionsImported: false,
      googleAdsCampaignsCreated: false,
      metaTouched: false,
      runtimeFilesTouched: false,
      websiteRuntimeFilesTouched: false,
      secretsPrinted: false,
      tokensPrinted: false,
      piiPrinted: false,
      rawClickIdsPrinted: false
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
  const importRows = [
    ...report.recommendedImportSet.primaryImportCandidates,
    ...report.recommendedImportSet.secondaryObservationCandidates,
    ...report.recommendedImportSet.laterBlockedCandidates
  ].map((item) => [
    item.eventName,
    item.category,
    item.googleAdsImportRecommendation,
    item.conversionActionName,
    item.includeInConversionsColumn,
    item.biddingUse,
    item.expectedRisk
  ]);
  const namingRows = report.conversionActionNaming.proposedNames.map((item) => [
    item.eventName,
    item.conversionActionName
  ]);
  const includeRows = report.includeInConversionsColumnPlan.map((item) => [
    item.eventName,
    item.includeInConversionsColumn,
    item.reasoning
  ]);
  const prereqRows = report.accountLinkingPrerequisites.map((item) => [item.item, item.status]);

  return [
    '# CRBOX Google Ads Import Planning',
    '',
    '## Executive summary',
    '',
    `- Phase: ${report.phase}`,
    `- Mode: ${report.mode}`,
    `- Generated: ${report.generatedAt}`,
    `- Overall status: ${report.overallStatus}`,
    ...report.executiveSummary.map((item) => `- ${item}`),
    '',
    '## Scope',
    '',
    '- Planning/preflight only.',
    '- No Google Ads linking, conversion import, conversion action creation, or campaign setup is performed.',
    '- No GA4, GTM, Meta, or runtime changes are performed.',
    '',
    '## Source artifacts',
    '',
    ...report.sourceArtifactAvailability.map((artifact) => `- ${artifact.path}: ${artifact.available ? 'available' : 'source_artifact_missing'}`),
    '',
    '## Recommended import set',
    '',
    markdownTable(
      ['Event', 'Category', 'Import recommendation', 'Conversion action name', 'Conversions column', 'Bidding use', 'Risk'],
      importRows
    ),
    '',
    'Do-not-import candidates:',
    ...report.recommendedImportSet.doNotImportCandidates.map((item) => `- ${item.eventName}: ${item.caveats}`),
    '',
    '## Proposed conversion action names',
    '',
    markdownTable(['Event', 'Proposed Google Ads conversion action name'], namingRows),
    '',
    'Naming rationale:',
    ...report.conversionActionNaming.rationale.map((item) => `- ${item}`),
    '',
    '## Include-in-conversions-column plan',
    '',
    markdownTable(['Event', 'Include in conversions column', 'Reasoning'], includeRows),
    '',
    '## Bidding use plan',
    '',
    ...Object.entries(report.biddingUsePlan)
      .filter(([key]) => key !== 'details')
      .map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Attribution and duplicate-risk planning',
    '',
    'Risks:',
    ...report.attributionAndDuplicateRiskPlanning.risks.map((item) => `- ${item}`),
    '',
    'Controls:',
    ...report.attributionAndDuplicateRiskPlanning.controls.map((item) => `- ${item}`),
    '',
    '## Account/linking prerequisites',
    '',
    markdownTable(['Prerequisite', 'Status'], prereqRows),
    '',
    '## Execution-readiness checklist',
    '',
    ...report.executionReadinessChecklist.map((item) => `- [ ] ${item.item}`),
    '',
    '## Rollback / no-op plan',
    '',
    `- Phase 3C action: ${report.rollbackNoOpPlan.phase3CAction}`,
    ...report.rollbackNoOpPlan.futureRollbackMeaning.map((item) => `- ${item}`),
    '',
    '## Conversion value strategy',
    '',
    `- Strategy: ${report.conversionValuePlan.strategy}`,
    ...report.conversionValuePlan.recommendations.map((item) => `- ${item}`),
    '',
    '## Future execution sequence',
    '',
    ...report.futureExecutionSequence.map((item) => `${item.stepNumber}. ${item.step}`),
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
    '- Google Ads touched: false',
    '- Google Ads conversion actions created: false',
    '- Google Ads conversions imported: false',
    '- Google Ads campaigns created: false',
    '- Meta touched: false',
    '- Runtime files touched: false',
    '- Secrets printed: false',
    '- Tokens printed: false',
    '- PII printed: false',
    '- Raw click IDs printed: false'
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
  if (text.includes('blocked') || text.includes('do_not') || text.includes('no_diagnostic') || text === 'false') return 'bad';
  if (text.includes('secondary') || text.includes('later') || text.includes('quality') || text.includes('limitation') || text.includes('manual')) return 'warn';
  if (text.includes('primary') || text.includes('ready') || text === 'true') return 'good';
  return 'neutral';
}

function chip(value) {
  return `<span class="chip ${statusClass(value)}">${escapeHtml(statusLabel(value))}</span>`;
}

function tableRows(rows) {
  return rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('\n');
}

function buildHtml(report) {
  const importRows = [
    ...report.recommendedImportSet.primaryImportCandidates,
    ...report.recommendedImportSet.secondaryObservationCandidates,
    ...report.recommendedImportSet.laterBlockedCandidates
  ].map((item) => [
    `<strong>${escapeHtml(item.eventName)}</strong>`,
    escapeHtml(item.conversionActionName),
    chip(item.googleAdsImportRecommendation),
    escapeHtml(String(item.includeInConversionsColumn)),
    escapeHtml(item.biddingUse),
    escapeHtml(item.expectedRisk)
  ]);
  const namingRows = report.conversionActionNaming.proposedNames.map((item) => [
    escapeHtml(item.eventName),
    escapeHtml(item.conversionActionName)
  ]);
  const includeRows = report.includeInConversionsColumnPlan.map((item) => [
    escapeHtml(item.eventName),
    chip(item.includeInConversionsColumn),
    escapeHtml(item.reasoning)
  ]);
  const prereqRows = report.accountLinkingPrerequisites.map((item) => [
    escapeHtml(item.item),
    chip(item.status)
  ]);
  const sequenceItems = report.futureExecutionSequence.map((item) =>
    `<li><strong>Step ${item.stepNumber}:</strong> ${escapeHtml(item.step)}</li>`
  ).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRBOX Google Ads Import Planning</title>
  <style>
    :root {
      --bg: #f5f7fa;
      --panel: #ffffff;
      --ink: #17202a;
      --muted: #627083;
      --line: #d9dee6;
      --good: #0f7a4f;
      --good-bg: #e8f6ef;
      --warn: #8a5a00;
      --warn-bg: #fff2d1;
      --bad: #9b2f2f;
      --bad-bg: #fde7e7;
      --neutral: #4b5563;
      --neutral-bg: #eef1f5;
      --header: #14324a;
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
    header .kicker { color: #b7c7d8; }
    .chip {
      display: inline-flex;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      margin: 2px 0 8px;
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
    <h1>Google Ads Import Planning</h1>
    <p>Planning-only approval artifact before Google Ads linking, conversion import, or campaign setup.</p>
    <div class="summary">
      <div>${chip(report.overallStatus)}<p>Overall status</p></div>
      <div>${chip('yes_primary')}<p>Quote submit candidate</p></div>
      <div>${chip('quality_dependent')}<p>Signup handling</p></div>
      <div>${chip('planning_only')}<p>No execution in this phase</p></div>
    </div>
  </header>
  <main>
    <section>
      <h2>Strategic recommendation</h2>
      <div class="note"><ul>${report.executiveSummary.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Recommended import set</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Action name</th><th>Import</th><th>Conversions column</th><th>Bidding use</th><th>Risk</th></tr></thead>
          <tbody>${tableRows(importRows)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Conversion action naming table</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>GA4 event</th><th>Proposed Google Ads conversion action name</th></tr></thead>
          <tbody>${tableRows(namingRows)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Include-in-conversions-column plan</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Include</th><th>Reasoning</th></tr></thead>
          <tbody>${tableRows(includeRows)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Bidding use plan</h2>
      <div class="grid">
        <article class="card"><h3>Primary</h3><p>quote_request_submit_success is the initial primary bidding candidate.</p></article>
        <article class="card"><h3>Quality-dependent</h3><p>signup_success may be primary or secondary observation depending on activation quality.</p></article>
        <article class="card"><h3>Secondary</h3><p>Contact, calculator, WhatsApp, and email signals remain observation/reporting first.</p></article>
        <article class="card"><h3>Blocked</h3><p>phone_click is blocked until call tracking exists.</p></article>
      </div>
    </section>
    <section>
      <h2>Duplicate-risk controls</h2>
      <div class="note"><ul>${report.attributionAndDuplicateRiskPlanning.controls.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Account/linking prerequisites</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Prerequisite</th><th>Status</th></tr></thead>
          <tbody>${tableRows(prereqRows)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Execution-readiness checklist</h2>
      <div class="note"><ul>${report.executionReadinessChecklist.map((item) => `<li>${escapeHtml(item.item)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Rollback / no-op plan</h2>
      <div class="note"><ul>${report.rollbackNoOpPlan.futureRollbackMeaning.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Conversion value plan</h2>
      <div class="note"><ul>${report.conversionValuePlan.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Future execution sequence</h2>
      <div class="note"><ol>${sequenceItems}</ol></div>
    </section>
    <section>
      <h2>Safety confirmations</h2>
      <div class="note">
        <ul>
          <li>GA4 writes made: false</li>
          <li>GTM writes made: false</li>
          <li>GTM published: false</li>
          <li>Google Ads touched: false</li>
          <li>Google Ads conversion actions created: false</li>
          <li>Google Ads conversions imported: false</li>
          <li>Google Ads campaigns created: false</li>
          <li>Meta touched: false</li>
          <li>Runtime files touched: false</li>
          <li>Secrets/tokens/PII/raw click IDs printed: false</li>
        </ul>
      </div>
    </section>
  </main>
  <footer>Generated ${escapeHtml(report.generatedAt)} from local source artifacts. No Google Ads execution occurs in this phase.</footer>
</body>
</html>`;
}

function writeReport(root, report) {
  const paths = {
    jsonPath: path.join(root, 'docs/marketing-ops-google-ads-import-planning.json'),
    markdownPath: path.join(root, 'docs/marketing-ops-google-ads-import-planning.md'),
    htmlPath: path.join(root, 'docs/marketing-ops-google-ads-import-planning.html')
  };
  writeJson(paths.jsonPath, report);
  writeText(paths.markdownPath, buildMarkdown(report));
  writeText(paths.htmlPath, buildHtml(report));
  return paths;
}

function runGoogleAdsImportPlanning(root) {
  const report = buildReport(root);
  const paths = writeReport(root, report);
  return { report, paths };
}

function summaryLines(result) {
  const { report, paths } = result;
  return [
    `Google Ads import planning: ${statusLabel(report.overallStatus)}`,
    `- Primary import candidates: ${report.recommendedImportSet.primaryImportCandidates.map((item) => item.eventName).join(', ')}`,
    `- Secondary observation candidates: ${report.recommendedImportSet.secondaryObservationCandidates.map((item) => item.eventName).join(', ')}`,
    `- Later/blocked candidates: ${report.recommendedImportSet.laterBlockedCandidates.map((item) => item.eventName).join(', ')}`,
    `- Do-not-import candidates: ${report.recommendedImportSet.doNotImportCandidates.length}`,
    '- Google Ads touched: false',
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
  runGoogleAdsImportPlanning,
  summaryLines
};
