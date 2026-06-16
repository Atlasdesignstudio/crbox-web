'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-google-ads-import-planning.json',
  'docs/marketing-ops-google-ads-import-planning.md',
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

const REQUIRED_JSON_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-google-ads-import-planning.json',
  'docs/marketing-ops-paid-media-conversion-map.json',
  'docs/marketing-ops-ga4-monitoring-readiness.json',
  'docs/marketing-ops-ga4-event-processing-validation.json',
  'docs/marketing-ops-ga4-monitoring-dashboard.json',
  'docs/marketing-ops-gtm-publish-result.json',
  'docs/marketing-ops-gtm-post-publish-smoke-test.json'
]);

const EXCLUDED_EVENTS = Object.freeze([
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

function sourceStatus(readiness, processing, dashboard, conversionMap, planning, publish, smoke) {
  return {
    phase3A1Readiness: readiness?.readinessStatus || 'not_available',
    phase3A2Validation: processing?.validationStatus || 'not_available',
    phase3A3Dashboard: dashboard?.overallStatus || 'not_available',
    phase3BConversionMap: conversionMap?.overallStatus || 'not_available',
    phase3CGoogleAdsImportPlanning: planning?.overallStatus || 'not_available',
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
    && status.gtmPublishedVersion === '4'
    && status.postPublishSmokeTest === 'pass';
}

function payloadScope() {
  return {
    mode: 'review_only_no_apply',
    applyAllowed: false,
    requiresExplicitApprovalBeforeApply: true,
    requiresGoogleAdsAccountConfirmation: true,
    requiresDuplicateCheckBeforeApply: true,
    requiresGA4GoogleAdsLinkConfirmation: true,
    requiresConversionGoalReview: true
  };
}

function primaryCandidates() {
  return [
    {
      conversionActionName: 'CRBOX - Quote Request Submitted',
      sourceEventName: 'quote_request_submit_success',
      importSource: 'GA4',
      category: 'lead',
      type: 'primary_import_candidate',
      includeInConversionsColumn: true,
      biddingUse: 'primary_bidding',
      valueStrategy: 'no_fake_value_initially',
      optimizationRole: 'main_lead_generation_conversion',
      executionStatus: 'not_executed',
      approvalRequired: true,
      duplicateCheckRequired: true,
      caveats: [
        'Low volume before campaign scale.',
        'Lead quality should be monitored.',
        'Avoid duplicate import from GTM or other sources.'
      ]
    },
    {
      conversionActionName: 'CRBOX - Signup Completed',
      sourceEventName: 'signup_success',
      importSource: 'GA4',
      category: 'signup',
      type: 'primary_quality_dependent_candidate',
      includeInConversionsColumn: 'quality_dependent',
      recommendedInitialSetting: 'secondary_observation_until_quality_confirmed',
      biddingUse: 'primary_bidding_or_secondary_observation',
      valueStrategy: 'no_fake_value_initially',
      optimizationRole: 'account_creation_quality_dependent',
      executionStatus: 'not_executed',
      approvalRequired: true,
      qualityValidationRequired: true,
      duplicateCheckRequired: true,
      caveats: [
        'Registration does not always equal qualified customer.',
        'Quality loop needed before aggressive bidding.'
      ]
    }
  ];
}

function secondaryObservationCandidates() {
  return [
    {
      conversionActionName: 'CRBOX - Contact Form Submitted',
      sourceEventName: 'contact_form_submit_success',
      importSource: 'GA4',
      category: 'lead',
      type: 'secondary_observation_candidate',
      includeInConversionsColumn: false,
      biddingUse: 'secondary_observation',
      valueStrategy: 'no_fake_value_initially',
      executionStatus: 'not_executed',
      approvalRequired: true,
      caveats: ['May include support/general inquiries.']
    },
    {
      conversionActionName: 'CRBOX - Calculator Result Generated',
      sourceEventName: 'calculator_result',
      importSource: 'GA4',
      category: 'engagement',
      type: 'secondary_observation_candidate',
      includeInConversionsColumn: false,
      biddingUse: 'remarketing_signal_or_secondary_observation',
      valueStrategy: 'no_fake_value_initially',
      executionStatus: 'not_executed',
      approvalRequired: true,
      caveats: [
        'Can represent price-shopping behavior.',
        'Not a confirmed lead.'
      ]
    },
    {
      conversionActionName: 'CRBOX - WhatsApp Click',
      sourceEventName: 'whatsapp_click',
      importSource: 'GA4',
      category: 'contact',
      type: 'secondary_observation_candidate',
      includeInConversionsColumn: false,
      biddingUse: 'secondary_observation',
      valueStrategy: 'no_fake_value_initially',
      executionStatus: 'not_executed',
      approvalRequired: true,
      caveats: ['Click does not confirm completed conversation.']
    },
    {
      conversionActionName: 'CRBOX - Email Click',
      sourceEventName: 'email_click',
      importSource: 'GA4',
      category: 'contact',
      type: 'secondary_observation_candidate',
      includeInConversionsColumn: false,
      biddingUse: 'secondary_observation',
      valueStrategy: 'no_fake_value_initially',
      executionStatus: 'not_executed',
      approvalRequired: true,
      caveats: ['Click does not confirm email sent.']
    }
  ];
}

function blockedCandidates() {
  return [
    {
      conversionActionName: 'CRBOX - Phone Click',
      sourceEventName: 'phone_click',
      importSource: 'GA4',
      category: 'phone_call',
      type: 'blocked_until_call_tracking',
      includeInConversionsColumn: false,
      biddingUse: 'blocked_until_call_tracking',
      valueStrategy: 'no_fake_value_initially',
      executionStatus: 'blocked_not_executed',
      approvalRequired: true,
      callTrackingRequired: true,
      caveats: [
        'Click does not confirm completed call.',
        'Do not import for bidding until call tracking exists.'
      ]
    }
  ];
}

function exclusionReason(eventName) {
  if (eventName.includes('login') || eventName.includes('portal') || eventName.includes('package') || eventName.includes('invoice')) {
    return 'Portal/internal lifecycle or operational event, not an acquisition conversion.';
  }
  if (eventName.includes('error') || eventName === 'form_abandon') {
    return 'Failure or abandonment signal; useful diagnostically, unsafe as an optimization goal.';
  }
  if (eventName === 'scroll_depth' || eventName === 'section_visible' || eventName === 'nav_click' || eventName === 'outbound_click') {
    return 'Broad engagement/navigation signal that can inflate performance and optimize toward shallow behavior.';
  }
  return 'Diagnostic-only event excluded from Google Ads conversion import.';
}

function riskIfImported(eventName) {
  if (eventName.includes('error')) return 'Could optimize toward broken or failed sessions.';
  if (eventName.includes('login') || eventName.includes('portal') || eventName.includes('package') || eventName.includes('invoice')) {
    return 'Could optimize acquisition campaigns toward existing-client or operational behavior.';
  }
  return 'Could inflate conversion counts and train bidding toward low-value engagement.';
}

function excludedEvents() {
  return EXCLUDED_EVENTS.map((eventName) => ({
    eventName,
    reason: exclusionReason(eventName),
    importAllowed: false,
    includeInConversionsColumn: false,
    biddingUse: 'do_not_import',
    exclusionReason: exclusionReason(eventName),
    riskIfImported: riskIfImported(eventName)
  }));
}

function payloadValidationRules() {
  return [
    'Google Ads account ID must be confirmed.',
    'GA4-Google Ads link status must be confirmed.',
    'Existing conversion actions must be listed.',
    'Planned conversion action names must be checked against existing actions.',
    'Duplicate action names must block execution.',
    'Duplicate GA4 event imports must block execution unless explicitly approved.',
    'quote_request_submit_success must remain the only immediate primary bidding candidate unless explicitly changed.',
    'Secondary conversions must not be included in conversions column initially.',
    'signup_success must not be included in conversions column unless quality is approved.',
    'phone_click must remain blocked until call tracking exists.',
    'Do-not-import events must not appear in the apply payload.',
    'No fake conversion values.',
    'No PII or raw click IDs.',
    'No campaigns created in import apply phase.'
  ].map((rule) => ({ rule, status: 'required_before_apply' }));
}

function accountPrerequisites(planning) {
  const source = planning?.accountLinkingPrerequisites || [];
  if (!source.length) {
    return [
      'Google Ads account ID',
      'manager/MCC relationship',
      'GA4-Google Ads link status',
      'user permissions',
      'auto-tagging status',
      'key event availability in Google Ads',
      'existing conversion actions',
      'timezone/currency',
      'enhanced conversions decision',
      'consent requirements'
    ].map((item) => ({ item, status: 'requires_manual_confirmation' }));
  }
  return source.map((item) => ({
    item: item.item,
    status: item.status || 'requires_manual_confirmation'
  }));
}

function futureApplyPayload(scope, proposed, excluded) {
  return {
    mode: 'review_only',
    applyAllowed: false,
    platform: 'google_ads',
    operationType: 'conversion_import_or_create_review',
    accountId: 'requires_manual_confirmation',
    ga4PropertyLink: 'requires_manual_confirmation',
    plannedActions: [
      ...proposed.primaryCandidates,
      ...proposed.secondaryObservationCandidates,
      ...proposed.blockedCandidates
    ],
    excludedEvents: excluded,
    preflightRequired: true,
    duplicateCheckRequired: true,
    approvalRequired: true,
    executeNow: false,
    payloadScope: scope.mode
  };
}

function humanApprovalChecklist() {
  return [
    'Approve Google Ads account ID.',
    'Approve GA4-Google Ads link.',
    'Approve canonical conversion action names.',
    'Approve primary conversion set.',
    'Decide signup handling: primary immediately, secondary observation first, or exclude until quality validated.',
    'Approve secondary observation events.',
    'Confirm phone click remains blocked.',
    'Confirm do-not-import events.',
    'Confirm no fake values.',
    'Confirm no campaigns are created.',
    'Confirm rollback/no-op plan.'
  ].map((item) => ({ item, approved: false, requiredBeforeApply: true }));
}

function rollbackNoOpInterpretation() {
  return {
    phase3DAction: 'no_rollback_performed_review_only',
    interpretation: [
      'Phase 3D performs no rollback because it performs no execution.',
      'If a future apply creates something incorrectly, do not delete automatically.',
      'Exclude incorrect or duplicate actions from the conversions column.',
      'Rename or deprecate incorrect actions if needed.',
      'Document the canonical conversion action.',
      'Pause or remove incorrect actions from bidding use.',
      'Review before deletion.'
    ]
  };
}

function buildReport(root) {
  const planning = readJson(root, 'docs/marketing-ops-google-ads-import-planning.json');
  const conversionMap = readJson(root, 'docs/marketing-ops-paid-media-conversion-map.json');
  const readiness = readJson(root, 'docs/marketing-ops-ga4-monitoring-readiness.json');
  const processing = readJson(root, 'docs/marketing-ops-ga4-event-processing-validation.json');
  const dashboard = readJson(root, 'docs/marketing-ops-ga4-monitoring-dashboard.json');
  const publish = readJson(root, 'docs/marketing-ops-gtm-publish-result.json');
  const smoke = readJson(root, 'docs/marketing-ops-gtm-post-publish-smoke-test.json');
  const availability = sourceArtifactAvailability(root);
  const missingRequired = availability.some((artifact) => artifact.requiredForStatus && !artifact.available);
  const status = sourceStatus(readiness, processing, dashboard, conversionMap, planning, publish, smoke);
  const ready = !missingRequired && sourceStatusReady(status);
  const scope = payloadScope();
  const proposedConversionActionPayload = {
    primaryCandidates: primaryCandidates(),
    secondaryObservationCandidates: secondaryObservationCandidates(),
    blockedCandidates: blockedCandidates()
  };
  const explicitExcludedEvents = excludedEvents();

  return {
    generatedAt: new Date().toISOString(),
    phase: '3D',
    mode: 'google_ads_import_payload_review_only',
    sourceArtifacts: SOURCE_ARTIFACTS,
    sourceArtifactAvailability: availability,
    overallStatus: ready ? 'ready_for_payload_review_with_manual_prerequisites' : 'blocked_missing_source_artifact',
    sourceStatus: status,
    executiveSummary: [
      'Google Ads import payload has been prepared for review.',
      'No Google Ads changes are made in this phase.',
      'No conversion actions are created.',
      'No conversions are imported.',
      'No campaigns are created.',
      'The payload is not approved for execution yet.',
      'Account/linking prerequisites still require manual confirmation.'
    ],
    payloadScope: scope,
    proposedConversionActionPayload,
    excludedEvents: explicitExcludedEvents,
    payloadValidationRules: payloadValidationRules(),
    payloadValidationStatus: ready ? 'pass_with_manual_prerequisites' : 'blocked',
    accountPrerequisites: accountPrerequisites(planning),
    futureApplyPayload: futureApplyPayload(scope, proposedConversionActionPayload, explicitExcludedEvents),
    humanApprovalChecklist: humanApprovalChecklist(),
    rollbackNoOpInterpretation: rollbackNoOpInterpretation(),
    recommendedNextPhase: 'Phase 3E - Google Ads Read-only Account Preflight',
    recommendedNextPhaseReason: [
      'Read the Google Ads account safely before producing an executable apply.',
      'Confirm account ID, access, existing conversion actions, duplicate risks, GA4 link status, conversion goals state, timezone, and currency.',
      'Do not recommend execution until account prerequisites are confirmed.'
    ],
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

function actionRows(actions) {
  return actions.map((item) => [
    item.sourceEventName,
    item.conversionActionName,
    item.type,
    item.includeInConversionsColumn,
    item.biddingUse,
    item.valueStrategy,
    item.executionStatus
  ]);
}

function buildMarkdown(report) {
  const primaryRows = actionRows(report.proposedConversionActionPayload.primaryCandidates);
  const secondaryRows = actionRows(report.proposedConversionActionPayload.secondaryObservationCandidates);
  const blockedRows = actionRows(report.proposedConversionActionPayload.blockedCandidates);
  const excludedRows = report.excludedEvents.map((item) => [
    item.eventName,
    item.importAllowed,
    item.includeInConversionsColumn,
    item.biddingUse,
    item.exclusionReason,
    item.riskIfImported
  ]);
  const prereqRows = report.accountPrerequisites.map((item) => [item.item, item.status]);

  return [
    '# CRBOX Google Ads Import Payload Review',
    '',
    '## Executive summary',
    '',
    `- Phase: ${report.phase}`,
    `- Mode: ${report.mode}`,
    `- Generated: ${report.generatedAt}`,
    `- Overall status: ${report.overallStatus}`,
    `- Payload validation status: ${report.payloadValidationStatus}`,
    ...report.executiveSummary.map((item) => `- ${item}`),
    '',
    '## Scope',
    '',
    '- Payload review only.',
    '- No Google Ads linking, conversion import, conversion action creation, campaign setup, or audience setup is performed.',
    '- No GA4, GTM, Meta, or runtime changes are performed.',
    '- applyAllowed: false',
    '- executeNow: false',
    '',
    '## Source artifacts',
    '',
    ...report.sourceArtifactAvailability.map((artifact) => `- ${artifact.path}: ${artifact.available ? 'available' : 'source_artifact_missing'}`),
    '',
    '## Payload scope',
    '',
    ...Object.entries(report.payloadScope).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Proposed conversion action payload',
    '',
    '## Primary candidates',
    '',
    markdownTable(['Event', 'Action name', 'Type', 'Conversions column', 'Bidding use', 'Value strategy', 'Execution'], primaryRows),
    '',
    '## Secondary observation candidates',
    '',
    markdownTable(['Event', 'Action name', 'Type', 'Conversions column', 'Bidding use', 'Value strategy', 'Execution'], secondaryRows),
    '',
    '## Blocked candidates',
    '',
    markdownTable(['Event', 'Action name', 'Type', 'Conversions column', 'Bidding use', 'Value strategy', 'Execution'], blockedRows),
    '',
    '## Explicit excluded events',
    '',
    markdownTable(['Event', 'Import allowed', 'Conversions column', 'Bidding use', 'Reason', 'Risk if imported'], excludedRows),
    '',
    '## Payload validation rules',
    '',
    ...report.payloadValidationRules.map((item) => `- ${item.rule}: ${item.status}`),
    '',
    '## Account prerequisites',
    '',
    markdownTable(['Prerequisite', 'Status'], prereqRows),
    '',
    '## Future apply payload summary',
    '',
    `- Mode: ${report.futureApplyPayload.mode}`,
    `- Platform: ${report.futureApplyPayload.platform}`,
    `- Operation type: ${report.futureApplyPayload.operationType}`,
    `- Account ID: ${report.futureApplyPayload.accountId}`,
    `- GA4 property link: ${report.futureApplyPayload.ga4PropertyLink}`,
    `- Planned actions: ${report.futureApplyPayload.plannedActions.length}`,
    `- Excluded events: ${report.futureApplyPayload.excludedEvents.length}`,
    `- Apply allowed: ${report.futureApplyPayload.applyAllowed}`,
    `- Execute now: ${report.futureApplyPayload.executeNow}`,
    '',
    '## Human approval checklist',
    '',
    ...report.humanApprovalChecklist.map((item) => `- [ ] ${item.item}`),
    '',
    '## Rollback / no-op interpretation',
    '',
    ...report.rollbackNoOpInterpretation.interpretation.map((item) => `- ${item}`),
    '',
    '## Recommended next phase',
    '',
    `Recommended next phase: ${report.recommendedNextPhase}`,
    '',
    ...report.recommendedNextPhaseReason.map((item) => `- ${item}`),
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
  if (text.includes('blocked') || text.includes('false') || text.includes('do_not') || text.includes('not_executed')) return 'bad';
  if (text.includes('manual') || text.includes('quality') || text.includes('secondary') || text.includes('review') || text.includes('required')) return 'warn';
  if (text.includes('ready') || text.includes('pass') || text.includes('primary') || text === 'true') return 'good';
  return 'neutral';
}

function chip(value) {
  return `<span class="chip ${statusClass(value)}">${escapeHtml(statusLabel(value))}</span>`;
}

function tableRows(rows) {
  return rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('\n');
}

function actionTableRows(actions) {
  return actions.map((item) => [
    `<strong>${escapeHtml(item.sourceEventName)}</strong>`,
    escapeHtml(item.conversionActionName),
    chip(item.type),
    chip(item.includeInConversionsColumn),
    escapeHtml(item.biddingUse),
    escapeHtml(item.executionStatus)
  ]);
}

function buildHtml(report) {
  const actionRowsForHtml = actionTableRows([
    ...report.proposedConversionActionPayload.primaryCandidates,
    ...report.proposedConversionActionPayload.secondaryObservationCandidates,
    ...report.proposedConversionActionPayload.blockedCandidates
  ]);
  const excludedRowsForHtml = report.excludedEvents.map((item) => [
    `<strong>${escapeHtml(item.eventName)}</strong>`,
    chip(item.importAllowed),
    escapeHtml(item.exclusionReason),
    escapeHtml(item.riskIfImported)
  ]);
  const prereqRowsForHtml = report.accountPrerequisites.map((item) => [
    escapeHtml(item.item),
    chip(item.status)
  ]);
  const validationItems = report.payloadValidationRules.map((item) =>
    `<li>${escapeHtml(item.rule)} ${chip(item.status)}</li>`
  ).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRBOX Google Ads Import Payload Review</title>
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
    ul, ol { margin: 0; padding-left: 20px; }
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
    <h1>Google Ads Import Payload Review</h1>
    <p>Review-only future payload for Google Ads conversion import planning. Nothing is connected, imported, created, or executed.</p>
    <div class="summary">
      <div>${chip(report.overallStatus)}<p>Overall status</p></div>
      <div>${chip(report.payloadValidationStatus)}<p>Payload validation</p></div>
      <div>${chip(report.payloadScope.applyAllowed)}<p>Apply allowed</p></div>
      <div>${chip(report.futureApplyPayload.executeNow)}<p>Execute now</p></div>
    </div>
  </header>
  <main>
    <section>
      <h2>Payload scope</h2>
      <div class="grid">
        <article class="card"><div class="kicker">Mode</div>${chip(report.payloadScope.mode)}<p>Future apply is explicitly disabled.</p></article>
        <article class="card"><div class="kicker">Approval</div>${chip('requires_explicit_approval_before_apply')}<p>Human approval is required before any execution phase.</p></article>
        <article class="card"><div class="kicker">Account</div>${chip('requires_google_ads_account_confirmation')}<p>Google Ads account ID and access are not confirmed in this phase.</p></article>
        <article class="card"><div class="kicker">Duplicate check</div>${chip('requires_duplicate_check_before_apply')}<p>Existing conversion actions must be listed before apply.</p></article>
      </div>
    </section>
    <section>
      <h2>Proposed conversion action payload</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>GA4 event</th><th>Conversion action name</th><th>Type</th><th>Conversions column</th><th>Bidding use</th><th>Execution</th></tr></thead>
          <tbody>${tableRows(actionRowsForHtml)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Excluded events</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Import allowed</th><th>Exclusion reason</th><th>Risk if imported</th></tr></thead>
          <tbody>${tableRows(excludedRowsForHtml)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Validation rules</h2>
      <div class="note"><ul>${validationItems}</ul></div>
    </section>
    <section>
      <h2>Account prerequisites</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Prerequisite</th><th>Status</th></tr></thead>
          <tbody>${tableRows(prereqRowsForHtml)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Future apply payload summary</h2>
      <div class="grid">
        <article class="card"><div class="kicker">Platform</div><h3>${escapeHtml(report.futureApplyPayload.platform)}</h3><p>${escapeHtml(report.futureApplyPayload.operationType)}</p></article>
        <article class="card"><div class="kicker">Planned actions</div><h3>${report.futureApplyPayload.plannedActions.length}</h3><p>All remain not executed.</p></article>
        <article class="card"><div class="kicker">Excluded events</div><h3>${report.futureApplyPayload.excludedEvents.length}</h3><p>Diagnostic/internal/error events are blocked from import.</p></article>
        <article class="card"><div class="kicker">Apply</div>${chip(report.futureApplyPayload.applyAllowed)}<p>Review-only payload, not executable.</p></article>
      </div>
    </section>
    <section>
      <h2>Human approval checklist</h2>
      <div class="note"><ul>${report.humanApprovalChecklist.map((item) => `<li>${escapeHtml(item.item)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Rollback / no-op interpretation</h2>
      <div class="note"><ul>${report.rollbackNoOpInterpretation.interpretation.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Recommended next phase</h2>
      <div class="note">
        <p><strong>${escapeHtml(report.recommendedNextPhase)}</strong></p>
        <ul>${report.recommendedNextPhaseReason.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
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
          <li>Apply allowed: false</li>
          <li>Execute now: false</li>
        </ul>
      </div>
    </section>
  </main>
  <footer>Generated ${escapeHtml(report.generatedAt)} from local source artifacts. This static artifact performs no Google Ads API calls.</footer>
</body>
</html>`;
}

function writeReport(root, report) {
  const paths = {
    jsonPath: path.join(root, 'docs/marketing-ops-google-ads-import-payload-review.json'),
    markdownPath: path.join(root, 'docs/marketing-ops-google-ads-import-payload-review.md'),
    htmlPath: path.join(root, 'docs/marketing-ops-google-ads-import-payload-review.html')
  };
  writeJson(paths.jsonPath, report);
  writeText(paths.markdownPath, buildMarkdown(report));
  writeText(paths.htmlPath, buildHtml(report));
  return paths;
}

function runGoogleAdsImportPayloadReview(root) {
  const report = buildReport(root);
  const paths = writeReport(root, report);
  return { report, paths };
}

function summaryLines(result) {
  const { report, paths } = result;
  return [
    `Google Ads import payload review: ${statusLabel(report.overallStatus)}`,
    `- Payload validation status: ${statusLabel(report.payloadValidationStatus)}`,
    `- Apply allowed: ${report.payloadScope.applyAllowed}`,
    `- Execute now: ${report.futureApplyPayload.executeNow}`,
    `- Primary payload candidates: ${report.proposedConversionActionPayload.primaryCandidates.map((item) => item.sourceEventName).join(', ')}`,
    `- Secondary observation payload candidates: ${report.proposedConversionActionPayload.secondaryObservationCandidates.map((item) => item.sourceEventName).join(', ')}`,
    `- Blocked candidates: ${report.proposedConversionActionPayload.blockedCandidates.map((item) => item.sourceEventName).join(', ')}`,
    `- Excluded events: ${report.excludedEvents.length}`,
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
  runGoogleAdsImportPayloadReview,
  summaryLines
};
