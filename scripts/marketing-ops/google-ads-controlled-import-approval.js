#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const APPROVAL_ACTIONS = Object.freeze([
  { eventName: 'quote_request_submit_success', approvalGateStatus: 'requires_mapping_review', finalRecommendation: 'map_existing_before_apply', riskLevel: 'medium' },
  { eventName: 'signup_success', approvalGateStatus: 'requires_mapping_review_quality_pending', finalRecommendation: 'map_existing_quality_pending', riskLevel: 'medium' },
  { eventName: 'contact_form_submit_success', approvalGateStatus: 'approved_for_future_secondary_create', finalRecommendation: 'create_secondary_excluded_after_approval', riskLevel: 'low' },
  { eventName: 'calculator_result', approvalGateStatus: 'approved_for_future_secondary_create', finalRecommendation: 'create_secondary_excluded_after_approval', riskLevel: 'low' },
  { eventName: 'whatsapp_click', approvalGateStatus: 'approved_for_future_secondary_create', finalRecommendation: 'create_secondary_excluded_after_approval', riskLevel: 'low' },
  { eventName: 'email_click', approvalGateStatus: 'approved_for_future_secondary_create', finalRecommendation: 'create_secondary_excluded_after_approval', riskLevel: 'low' },
  { eventName: 'phone_click', approvalGateStatus: 'blocked', finalRecommendation: 'keep_blocked_until_call_tracking', riskLevel: 'medium' }
]);

function buildReport(root) {
  const finalReviewPath = path.join(root, 'docs/marketing-ops-google-ads-apply-payload-final-review.json');
  return {
    generatedAt: new Date().toISOString(),
    phase: '3G',
    mode: 'google_ads_controlled_import_approval_gate_review_only',
    sourceArtifactAvailability: [
      {
        path: 'docs/marketing-ops-google-ads-apply-payload-final-review.json',
        status: fs.existsSync(finalReviewPath) ? 'available' : 'source_artifact_missing'
      },
      {
        path: 'docs/marketing-ops-google-ads-account-preflight.json',
        status: fs.existsSync(path.join(root, 'docs/marketing-ops-google-ads-account-preflight.json')) ? 'available' : 'source_artifact_missing'
      }
    ],
    overallStatus: 'approval_gate_ready_mapping_review_required',
    applyAllowed: false,
    executeNow: false,
    actionsApprovedForFutureApply: 4,
    actionsBlocked: 1,
    actionsRequiringMappingReview: 2,
    manualConfirmationsRequired: 21,
    duplicateConflictStatus: 'same_event_existing_actions_require_mapping_review',
    approvalGateActions: APPROVAL_ACTIONS,
    recommendedNextPhase: 'Phase 3H - Google Ads Controlled Import Apply Execution',
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
  const rows = report.approvalGateActions.map((action) => `| ${action.eventName} | ${action.approvalGateStatus} | ${action.finalRecommendation} | ${action.riskLevel} |`).join('\n');
  return `# Google Ads Controlled Import Approval Gate

Overall status: **${report.overallStatus}**

Apply allowed: **${report.applyAllowed}**

Execute now: **${report.executeNow}**

Duplicate/conflict status: **${report.duplicateConflictStatus}**

| Event | Approval gate status | Final recommendation | Risk |
| --- | --- | --- | --- |
${rows}

Recommended next phase: ${report.recommendedNextPhase}

Safety: no Google Ads writes, no conversions created/imported, no campaigns created, no secrets printed.
`;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHtml(report) {
  const rows = report.approvalGateActions.map((action) => `<tr><td>${escapeHtml(action.eventName)}</td><td>${escapeHtml(action.approvalGateStatus)}</td><td>${escapeHtml(action.finalRecommendation)}</td><td>${escapeHtml(action.riskLevel)}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Google Ads Controlled Import Approval Gate</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f7f8fb;color:#1f2937}header{background:#123047;color:white;padding:32px}main{max-width:1100px;margin:auto;padding:24px}table{width:100%;border-collapse:collapse;background:white}th,td{border:1px solid #dce3ec;padding:10px;text-align:left}</style></head><body><header><h1>Google Ads Controlled Import Approval Gate</h1><p>${escapeHtml(report.overallStatus)}</p></header><main><p>applyAllowed=${report.applyAllowed}; executeNow=${report.executeNow}</p><table><thead><tr><th>Event</th><th>Status</th><th>Recommendation</th><th>Risk</th></tr></thead><tbody>${rows}</tbody></table></main></body></html>\n`;
}

function writeArtifacts(root, report) {
  const jsonPath = path.join(root, 'docs/marketing-ops-google-ads-controlled-import-approval.json');
  const mdPath = path.join(root, 'docs/marketing-ops-google-ads-controlled-import-approval.md');
  const htmlPath = path.join(root, 'docs/marketing-ops-google-ads-controlled-import-approval.html');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  fs.writeFileSync(htmlPath, renderHtml(report));
  return { jsonPath, mdPath, htmlPath };
}

function runGoogleAdsControlledImportApproval(root) {
  const report = buildReport(root);
  const paths = writeArtifacts(root, report);
  return { report, paths };
}

function summaryLines({ report, paths }) {
  return [
    `overallStatus: ${report.overallStatus}`,
    `applyAllowed: ${report.applyAllowed}`,
    `executeNow: ${report.executeNow}`,
    `actions approved for future apply: ${report.actionsApprovedForFutureApply}`,
    `actions blocked: ${report.actionsBlocked}`,
    `actions requiring mapping review: ${report.actionsRequiringMappingReview}`,
    `JSON: ${paths.jsonPath}`,
    'Mutation statement: no Google Ads writes were performed.'
  ];
}

module.exports = { runGoogleAdsControlledImportApproval, summaryLines };

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  for (const line of summaryLines(runGoogleAdsControlledImportApproval(root))) console.log(line);
}
