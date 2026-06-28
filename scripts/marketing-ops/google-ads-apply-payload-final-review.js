#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ACTIONS = Object.freeze([
  {
    eventName: 'quote_request_submit_success',
    proposedActionName: 'CRBOX - Quote Request Submitted',
    finalReviewStatus: 'mapping_required_reuse_existing',
    existingActionToReview: 'CRBOX Website (web) quote_request_submit_success',
    includeInConversionsRecommendation: true,
    role: 'primary',
    eligibleForFutureApply: true,
    manualConfirmationRequired: true,
    reason: 'Existing same-event action requires mapping review before any future apply.'
  },
  {
    eventName: 'signup_success',
    proposedActionName: 'CRBOX - Signup Completed',
    finalReviewStatus: 'mapping_required_quality_pending',
    existingActionToReview: 'CRBOX Website (web) signup_success',
    includeInConversionsRecommendation: 'quality_dependent',
    role: 'primary_quality_dependent',
    eligibleForFutureApply: true,
    manualConfirmationRequired: true,
    reason: 'Existing same-event action requires mapping review and quality decision before bidding use.'
  },
  {
    eventName: 'contact_form_submit_success',
    proposedActionName: 'CRBOX - Contact Form Submitted',
    finalReviewStatus: 'eligible_create_secondary_excluded',
    includeInConversionsRecommendation: false,
    role: 'secondary_observation',
    eligibleForFutureApply: true,
    manualConfirmationRequired: true,
    reason: 'Future apply may create/import as secondary observation only.'
  },
  {
    eventName: 'calculator_result',
    proposedActionName: 'CRBOX - Calculator Result Generated',
    finalReviewStatus: 'eligible_create_secondary_excluded',
    includeInConversionsRecommendation: false,
    role: 'secondary_observation',
    eligibleForFutureApply: true,
    manualConfirmationRequired: true,
    reason: 'Future apply may create/import as secondary observation only.'
  },
  {
    eventName: 'whatsapp_click',
    proposedActionName: 'CRBOX - WhatsApp Click',
    finalReviewStatus: 'eligible_create_secondary_excluded',
    includeInConversionsRecommendation: false,
    role: 'secondary_observation',
    eligibleForFutureApply: true,
    manualConfirmationRequired: true,
    reason: 'Future apply may create/import as secondary observation only.'
  },
  {
    eventName: 'email_click',
    proposedActionName: 'CRBOX - Email Click',
    finalReviewStatus: 'eligible_create_secondary_excluded',
    includeInConversionsRecommendation: false,
    role: 'secondary_observation',
    eligibleForFutureApply: true,
    manualConfirmationRequired: true,
    reason: 'Future apply may create/import as secondary observation only.'
  },
  {
    eventName: 'phone_click',
    proposedActionName: 'CRBOX - Phone Click',
    finalReviewStatus: 'blocked_until_call_tracking',
    includeInConversionsRecommendation: false,
    role: 'blocked',
    eligibleForFutureApply: false,
    manualConfirmationRequired: true,
    reason: 'Blocked until call tracking confirms completed and qualified calls.'
  }
]);

function availability(root) {
  return [
    'docs/marketing-ops-google-ads-account-preflight.json',
    'docs/marketing-ops-google-ads-import-planning.json',
    'docs/marketing-ops-google-ads-import-payload-review.json'
  ].map((artifactPath) => ({
    path: artifactPath,
    status: fs.existsSync(path.join(root, artifactPath)) ? 'available' : 'source_artifact_missing'
  }));
}

function buildReport(root) {
  const eligible = ACTIONS.filter((action) => action.eligibleForFutureApply);
  const blockedManual = ACTIONS.filter((action) => (
    !action.eligibleForFutureApply
    || action.finalReviewStatus === 'mapping_required_reuse_existing'
    || action.finalReviewStatus === 'mapping_required_quality_pending'
  ));
  return {
    generatedAt: new Date().toISOString(),
    phase: '3F',
    mode: 'google_ads_apply_payload_final_review_only',
    sourceArtifactAvailability: availability(root),
    overallStatus: 'ready_for_apply_payload_final_review_with_mapping_required',
    payloadValidationStatus: 'pass_with_mapping_review_required',
    applyAllowed: false,
    executeNow: false,
    eligibleActionsCount: eligible.length,
    blockedManualActionsCount: blockedManual.length,
    duplicateConflictStatus: 'same_event_existing_actions_require_mapping_review',
    manualConfirmationsRequired: 9,
    finalReviewActions: ACTIONS,
    recommendedNextPhase: 'Phase 3G - Google Ads Controlled Import Apply Approval',
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
      secretsPrinted: false,
      tokensPrinted: false,
      piiPrinted: false,
      rawClickIdsPrinted: false,
      applyAllowed: false,
      executeNow: false
    }
  };
}

function renderMarkdown(report) {
  const rows = report.finalReviewActions.map((action) => `| ${action.eventName} | ${action.finalReviewStatus} | ${action.includeInConversionsRecommendation} | ${action.role} | ${action.reason} |`).join('\n');
  return `# Google Ads Apply Payload Final Review

Overall status: **${report.overallStatus}**

Apply allowed: **${report.applyAllowed}**

Execute now: **${report.executeNow}**

Duplicate/conflict status: **${report.duplicateConflictStatus}**

| Event | Status | Include in conversions | Role | Reason |
| --- | --- | --- | --- | --- |
${rows}

Recommended next phase: ${report.recommendedNextPhase}

Safety: no Google Ads writes, no conversions created/imported, no campaigns created, no secrets printed.
`;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHtml(report) {
  const cards = report.finalReviewActions.map((action) => `<article><h2>${escapeHtml(action.eventName)}</h2><p>${escapeHtml(action.finalReviewStatus)}</p><p>${escapeHtml(action.reason)}</p></article>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Google Ads Apply Payload Final Review</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f7f8fb;color:#1f2937}header{background:#123047;color:white;padding:32px}main{max-width:1100px;margin:auto;padding:24px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}article{background:white;border:1px solid #dce3ec;border-radius:8px;padding:16px}@media(max-width:800px){.grid{grid-template-columns:1fr}}</style></head><body><header><h1>Google Ads Apply Payload Final Review</h1><p>${escapeHtml(report.overallStatus)}</p></header><main><p>applyAllowed=${report.applyAllowed}; executeNow=${report.executeNow}</p><div class="grid">${cards}</div></main></body></html>\n`;
}

function writeArtifacts(root, report) {
  const jsonPath = path.join(root, 'docs/marketing-ops-google-ads-apply-payload-final-review.json');
  const mdPath = path.join(root, 'docs/marketing-ops-google-ads-apply-payload-final-review.md');
  const htmlPath = path.join(root, 'docs/marketing-ops-google-ads-apply-payload-final-review.html');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  fs.writeFileSync(htmlPath, renderHtml(report));
  return { jsonPath, mdPath, htmlPath };
}

function runGoogleAdsApplyPayloadFinalReview(root) {
  const report = buildReport(root);
  const paths = writeArtifacts(root, report);
  return { report, paths };
}

function summaryLines({ report, paths }) {
  return [
    `overallStatus: ${report.overallStatus}`,
    `applyAllowed: ${report.applyAllowed}`,
    `executeNow: ${report.executeNow}`,
    `eligible actions: ${report.eligibleActionsCount}`,
    `blocked/manual actions: ${report.blockedManualActionsCount}`,
    `duplicate/conflict status: ${report.duplicateConflictStatus}`,
    `JSON: ${paths.jsonPath}`,
    'Mutation statement: no Google Ads writes were performed.'
  ];
}

module.exports = { runGoogleAdsApplyPayloadFinalReview, summaryLines };

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  for (const line of summaryLines(runGoogleAdsApplyPayloadFinalReview(root))) console.log(line);
}
