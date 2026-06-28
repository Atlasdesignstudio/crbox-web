#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PHASE = '3G-Review';
const MODE = 'google_ads_manual_mapping_decision_review_only';

const sourceArtifacts = [
  'docs/marketing-ops-google-ads-controlled-import-approval.json',
  'docs/marketing-ops-google-ads-apply-payload-final-review.json',
  'docs/marketing-ops-google-ads-account-preflight.json'
];

const ownerDecisions = [
  {
    eventName: 'quote_request_submit_success',
    proposedGoogleAdsActionName: 'CRBOX - Quote Request Submitted',
    existingActionToMap: 'CRBOX Website (web) quote_request_submit_success',
    decision: 'APPROVE_REUSE_EXISTING_AS_PRIMARY',
    recommendation: 'reuse_existing',
    role: 'primary',
    includeInConversionsRecommendation: true,
    riskLevel: 'medium',
    status: 'approved_to_map_existing',
    notes: [
      'Use the existing action as the canonical quote lead conversion.',
      'Do not create a duplicate conversion action.'
    ]
  },
  {
    eventName: 'signup_success',
    proposedGoogleAdsActionName: 'CRBOX - Signup Completed',
    existingActionToMap: 'CRBOX Website (web) signup_success',
    decision: 'APPROVE_REUSE_EXISTING_QUALITY_PENDING',
    recommendation: 'reuse_existing_quality_pending',
    role: 'primary_quality_dependent',
    includeInConversionsRecommendation: 'quality_dependent_not_primary_bidding_until_confirmed',
    riskLevel: 'medium',
    status: 'approved_to_map_existing_quality_pending',
    notes: [
      'Use the existing action and do not create a duplicate.',
      'Keep conversion-column inclusion quality-dependent until signup quality is confirmed.'
    ]
  },
  {
    eventName: 'contact_form_submit_success',
    proposedGoogleAdsActionName: 'CRBOX - Contact Form Submitted',
    existingActionToMap: null,
    decision: 'APPROVE_CREATE_SECONDARY_EXCLUDED',
    recommendation: 'create_secondary_excluded',
    role: 'secondary_observation',
    includeInConversionsRecommendation: false,
    riskLevel: 'low',
    status: 'approved_to_create_secondary_excluded',
    notes: ['Create or import only as secondary observation and exclude from conversions column initially.']
  },
  {
    eventName: 'calculator_result',
    proposedGoogleAdsActionName: 'CRBOX - Calculator Result Generated',
    existingActionToMap: null,
    decision: 'APPROVE_CREATE_SECONDARY_EXCLUDED',
    recommendation: 'create_secondary_excluded',
    role: 'secondary_observation',
    includeInConversionsRecommendation: false,
    riskLevel: 'low',
    status: 'approved_to_create_secondary_excluded',
    notes: ['Create or import only as secondary observation and exclude from conversions column initially.']
  },
  {
    eventName: 'whatsapp_click',
    proposedGoogleAdsActionName: 'CRBOX - WhatsApp Click',
    existingActionToMap: null,
    decision: 'APPROVE_CREATE_SECONDARY_EXCLUDED',
    recommendation: 'create_secondary_excluded',
    role: 'secondary_observation',
    includeInConversionsRecommendation: false,
    riskLevel: 'low',
    status: 'approved_to_create_secondary_excluded',
    notes: ['Create or import only as secondary observation and exclude from conversions column initially.']
  },
  {
    eventName: 'email_click',
    proposedGoogleAdsActionName: 'CRBOX - Email Click',
    existingActionToMap: null,
    decision: 'APPROVE_CREATE_SECONDARY_EXCLUDED',
    recommendation: 'create_secondary_excluded',
    role: 'secondary_observation',
    includeInConversionsRecommendation: false,
    riskLevel: 'low',
    status: 'approved_to_create_secondary_excluded',
    notes: ['Create or import only as secondary observation and exclude from conversions column initially.']
  },
  {
    eventName: 'phone_click',
    proposedGoogleAdsActionName: 'CRBOX - Phone Click',
    existingActionToMap: null,
    decision: 'KEEP_BLOCKED',
    recommendation: 'block_until_call_tracking',
    role: 'blocked',
    includeInConversionsRecommendation: false,
    riskLevel: 'medium',
    status: 'blocked',
    notes: ['Keep blocked until call tracking confirms completed and qualified calls.']
  }
];

function artifactAvailability(root) {
  return Object.fromEntries(sourceArtifacts.map((artifactPath) => [
    artifactPath,
    fs.existsSync(path.join(root, artifactPath)) ? 'available' : 'source_artifact_missing'
  ]));
}

function buildReport(root) {
  const approvedReuseMap = ownerDecisions.filter((item) => item.recommendation.startsWith('reuse_existing'));
  const approvedCreateSecondary = ownerDecisions.filter((item) => item.recommendation === 'create_secondary_excluded');
  const blocked = ownerDecisions.filter((item) => item.status === 'blocked');

  return {
    generatedAt: new Date().toISOString(),
    phase: PHASE,
    mode: MODE,
    sourceArtifacts,
    sourceArtifactAvailability: artifactAvailability(root),
    overallStatus: 'owner_mapping_decisions_recorded_pre_execution',
    applyAllowed: false,
    executeNow: false,
    phase3HExecuted: false,
    ownerDecisionSummary: {
      approvedReuseMapCount: approvedReuseMap.length,
      approvedCreateSecondaryCount: approvedCreateSecondary.length,
      blockedCount: blocked.length,
      remainingManualDecisions: 0
    },
    actionsApprovedToMapOrReuse: approvedReuseMap.map((item) => item.eventName),
    actionsApprovedToCreateAsSecondaryExcluded: approvedCreateSecondary.map((item) => item.eventName),
    actionsBlocked: blocked.map((item) => item.eventName),
    manualMappingDecisions: ownerDecisions,
    preExecutionDecisionSummary: {
      phase3HCanProceedToDryRunApplyPlanOnly: true,
      phase3HCanExecuteWrites: false,
      remainingManualBlockers: 0,
      requiredBoundary: 'Proceed only to Phase 3H dry-run/apply-plan review. Do not execute Google Ads writes until separately approved.'
    },
    recommendedNextStep: 'Proceed to Phase 3H dry-run/apply-plan review only. Do not execute Google Ads writes until separately approved.',
    safety: {
      ga4WritesMade: false,
      gtmWritesMade: false,
      gtmPublished: false,
      googleAdsTouched: false,
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
      executeNow: false,
      phase3HExecuted: false
    }
  };
}

function renderMarkdown(report) {
  const rows = report.manualMappingDecisions.map((item) => (
    `| ${item.eventName} | ${item.proposedGoogleAdsActionName} | ${item.decision} | ${item.recommendation} | ${item.includeInConversionsRecommendation} | ${item.riskLevel} | ${item.status} |`
  )).join('\n');

  return `# Google Ads Manual Mapping Decision

## Executive Summary

Phase 3G-Review records the owner's manual Google Ads conversion mapping decisions before any Phase 3H execution.

Overall status: **${report.overallStatus}**

Apply allowed: **${report.applyAllowed}**

Execute now: **${report.executeNow}**

Phase 3H executed: **${report.phase3HExecuted}**

## Owner Decision Summary

- Approved reuse/map count: ${report.ownerDecisionSummary.approvedReuseMapCount}
- Approved create-secondary count: ${report.ownerDecisionSummary.approvedCreateSecondaryCount}
- Blocked count: ${report.ownerDecisionSummary.blockedCount}
- Remaining manual decisions: ${report.ownerDecisionSummary.remainingManualDecisions}

## Manual Mapping Decisions

| Event | Proposed Google Ads action | Decision | Recommendation | Include in conversions | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

## Specific Mapping Decisions

### quote_request_submit_success

Use/map the existing action **CRBOX Website (web) quote_request_submit_success** as the canonical quote lead conversion. Do not create a duplicate.

### signup_success

Use/map the existing action **CRBOX Website (web) signup_success**. Do not create a duplicate. Keep conversion-column inclusion quality-dependent and do not use as primary bidding until signup quality is confirmed.

## Pre-Execution Decision

Phase 3H is not executed by this artifact. Phase 3H may proceed only to dry-run/apply-plan review. Google Ads writes require separate explicit approval.

## Recommended Next Step

${report.recommendedNextStep}

## Safety Confirmations

- No GA4 writes made.
- No GTM writes made.
- GTM not published.
- Google Ads not touched.
- Google Ads writes made: false.
- Google Ads conversion actions created: false.
- Google Ads conversions imported: false.
- Google Ads campaigns created: false.
- Meta not touched.
- Runtime files not touched.
- No secrets printed.
- No tokens printed.
- No PII printed.
- No raw click IDs printed.
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(report) {
  const cards = report.manualMappingDecisions.map((item) => `
    <section class="card">
      <div class="card-head">
        <h2>${escapeHtml(item.eventName)}</h2>
        <span class="chip ${item.status === 'blocked' ? 'bad' : item.recommendation.startsWith('reuse') ? 'good' : 'warn'}">${escapeHtml(item.status)}</span>
      </div>
      <dl>
        <dt>Proposed action</dt><dd>${escapeHtml(item.proposedGoogleAdsActionName)}</dd>
        <dt>Decision</dt><dd>${escapeHtml(item.decision)}</dd>
        <dt>Recommendation</dt><dd>${escapeHtml(item.recommendation)}</dd>
        <dt>Include in conversions</dt><dd>${escapeHtml(item.includeInConversionsRecommendation)}</dd>
        <dt>Risk</dt><dd>${escapeHtml(item.riskLevel)}</dd>
      </dl>
    </section>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRBOX Google Ads Manual Mapping Decision</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #17202a; background: #f6f7f9; }
    header { padding: 32px; background: #14213d; color: white; }
    main { max-width: 1180px; margin: 0 auto; padding: 24px; }
    h1, h2 { margin: 0; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
    .metric, .card { background: white; border: 1px solid #d9dee7; border-radius: 8px; padding: 16px; }
    .metric strong { display: block; font-size: 24px; margin-top: 6px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .chip { display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .good { background: #d8f3dc; color: #1b5e20; }
    .warn { background: #fff3cd; color: #7a4f01; }
    .bad { background: #fde2e1; color: #8a1c1c; }
    dl { display: grid; grid-template-columns: 170px 1fr; gap: 8px 12px; margin: 0; }
    dt { color: #5f6f89; font-weight: 700; }
    dd { margin: 0; }
    .notice { margin-top: 20px; background: #fff; border-left: 4px solid #f2b705; padding: 16px; }
    @media (max-width: 800px) { .summary, .grid { grid-template-columns: 1fr; } dl { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>CRBOX Google Ads Manual Mapping Decision</h1>
    <p>Phase ${escapeHtml(report.phase)} · ${escapeHtml(report.overallStatus)}</p>
  </header>
  <main>
    <section class="summary">
      <div class="metric">Reuse/map approved<strong>${report.ownerDecisionSummary.approvedReuseMapCount}</strong></div>
      <div class="metric">Create secondary approved<strong>${report.ownerDecisionSummary.approvedCreateSecondaryCount}</strong></div>
      <div class="metric">Blocked<strong>${report.ownerDecisionSummary.blockedCount}</strong></div>
      <div class="metric">Remaining manual decisions<strong>${report.ownerDecisionSummary.remainingManualDecisions}</strong></div>
    </section>
    <div class="notice">
      <strong>Review-only boundary:</strong> applyAllowed=${report.applyAllowed}, executeNow=${report.executeNow}, Phase 3H executed=${report.phase3HExecuted}. No Google Ads writes are performed by this artifact.
    </div>
    <section class="grid">
      ${cards}
    </section>
    <div class="notice">
      <strong>Recommended next step:</strong> ${escapeHtml(report.recommendedNextStep)}
    </div>
  </main>
</body>
</html>
`;
}

function writeArtifacts(root, report) {
  const jsonPath = path.join(root, 'docs/marketing-ops-google-ads-manual-mapping-decision.json');
  const mdPath = path.join(root, 'docs/marketing-ops-google-ads-manual-mapping-decision.md');
  const htmlPath = path.join(root, 'docs/marketing-ops-google-ads-manual-mapping-decision.html');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  fs.writeFileSync(htmlPath, renderHtml(report));
  return { jsonPath, mdPath, htmlPath };
}

function runGoogleAdsManualMappingDecision(root) {
  const report = buildReport(root);
  const paths = writeArtifacts(root, report);
  return { report, paths };
}

function summaryLines(result) {
  const { report, paths } = result;
  return [
    `Phase: ${report.phase}`,
    `overallStatus: ${report.overallStatus}`,
    `applyAllowed: ${report.applyAllowed}`,
    `executeNow: ${report.executeNow}`,
    `phase3HExecuted: ${report.phase3HExecuted}`,
    `approved reuse/map count: ${report.ownerDecisionSummary.approvedReuseMapCount}`,
    `approved create-secondary count: ${report.ownerDecisionSummary.approvedCreateSecondaryCount}`,
    `blocked count: ${report.ownerDecisionSummary.blockedCount}`,
    `remaining manual decisions: ${report.ownerDecisionSummary.remainingManualDecisions}`,
    `JSON: ${paths.jsonPath}`,
    `Markdown: ${paths.mdPath}`,
    `HTML: ${paths.htmlPath}`,
    'Mutation statement: no GA4, GTM, Google Ads, Meta, or runtime platform writes were performed.'
  ];
}

module.exports = {
  runGoogleAdsManualMappingDecision,
  summaryLines
};

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  for (const line of summaryLines(runGoogleAdsManualMappingDecision(root))) {
    console.log(line);
  }
}
