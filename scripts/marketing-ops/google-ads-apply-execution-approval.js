#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_APPROVAL_PHRASE = 'I approve Phase 3I controlled Google Ads conversion apply execution for CRBOX, limited to mapping existing quote_request_submit_success and signup_success actions, creating secondary excluded conversion actions for contact_form_submit_success, calculator_result, whatsapp_click, and email_click, and keeping phone_click blocked. I understand this will modify Google Ads conversions but will not create campaigns.';

function readJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function futureOperation(action) {
  if (action.applyPlanAction === 'reuse_map_existing') {
    return {
      operationType: 'map_existing_conversion_action',
      operationAllowedNow: false,
      exactFutureOperation: `Map/reuse existing Google Ads action "${action.existingActionToMap}" as the canonical primary conversion for ${action.eventName}. Do not create a duplicate.`,
      rollbackNote: 'If mapping is incorrect, remove it from the apply record and restore the previous canonical mapping; do not delete the existing action automatically.'
    };
  }
  if (action.applyPlanAction === 'reuse_map_existing_quality_pending') {
    return {
      operationType: 'map_existing_conversion_action_quality_pending',
      operationAllowedNow: false,
      exactFutureOperation: `Map/reuse existing Google Ads action "${action.existingActionToMap}" for ${action.eventName}, keeping quality-dependent handling and avoiding primary bidding until quality is confirmed.`,
      rollbackNote: 'If signup quality is poor, keep the action observation-only or exclude it from primary bidding until a quality loop exists.'
    };
  }
  if (action.applyPlanAction === 'future_create_import_secondary_excluded') {
    return {
      operationType: 'create_or_import_secondary_excluded_conversion_action',
      operationAllowedNow: false,
      exactFutureOperation: `Create/import ${action.eventName} as a secondary observation conversion action excluded from the conversions column initially.`,
      rollbackNote: 'If created incorrectly, exclude from conversions column, document deprecation, and avoid deletion without owner approval.'
    };
  }
  return {
    operationType: 'blocked_no_operation',
    operationAllowedNow: false,
    exactFutureOperation: `Do not create/import ${action.eventName}; keep blocked until call tracking confirms completed and qualified calls.`,
    rollbackNote: 'No rollback needed because no operation should be performed.'
  };
}

function decorateActions(actions, approvalStatus) {
  return actions.map((action) => ({
    eventName: action.eventName,
    proposedGoogleAdsActionName: action.proposedGoogleAdsActionName,
    existingActionToMap: action.existingActionToMap || null,
    role: action.primarySecondaryRole,
    includeInConversionsSetting: action.includeInConversionsSetting,
    riskLevel: action.riskLevel,
    ownerApprovalStatus: action.ownerApprovalStatus,
    approvalStatus,
    ...futureOperation(action)
  }));
}

function buildReport(root) {
  const dryRun = readJson(root, 'docs/marketing-ops-google-ads-controlled-import-dry-run.json');
  if (!dryRun) {
    return {
      generatedAt: new Date().toISOString(),
      phase: '3I',
      mode: 'google_ads_apply_execution_approval_only',
      overallStatus: 'blocked_missing_phase_3h_dry_run_artifact',
      applyAllowed: false,
      executeNow: false,
      requiredOwnerApprovalPhrase: REQUIRED_APPROVAL_PHRASE,
      safety: baseSafety()
    };
  }

  const reuseMap = decorateActions(dryRun.actionsToReuseOrMap || [], 'requires_explicit_owner_execution_approval');
  const createSecondary = decorateActions(dryRun.actionsToCreateOrImportInFutureApply || [], 'requires_explicit_owner_execution_approval');
  const blocked = decorateActions(dryRun.actionsBlocked || [], 'blocked_no_execution');

  return {
    generatedAt: new Date().toISOString(),
    phase: '3I',
    mode: 'google_ads_apply_execution_approval_only',
    sourceArtifacts: [
      'docs/marketing-ops-google-ads-controlled-import-dry-run.json',
      'docs/marketing-ops-google-ads-manual-mapping-decision.json',
      'docs/marketing-ops-google-ads-account-preflight.json'
    ],
    sourceStatus: {
      phase3HDryRun: dryRun.overallStatus,
      phase3HApplyAllowed: dryRun.applyAllowed,
      phase3HExecuteNow: dryRun.executeNow,
      phase3HExecuted: dryRun.phase3HExecuted
    },
    overallStatus: 'approval_required_before_controlled_apply_execution',
    applyAllowed: false,
    executeNow: false,
    phase3IExecuted: false,
    requiredOwnerApprovalPhrase: REQUIRED_APPROVAL_PHRASE,
    approvalChecklist: [
      'Confirm Google Ads account is CRBOX and read-only preflight remains current.',
      'Confirm existing quote_request_submit_success action is mapped/reused and no duplicate is created.',
      'Confirm existing signup_success action is mapped/reused with quality-dependent handling.',
      'Confirm four secondary actions are excluded from conversions column initially.',
      'Confirm phone_click remains blocked.',
      'Confirm no campaigns will be created.',
      'Confirm rollback/no-op handling is accepted.'
    ],
    actionsToReuseOrMap: reuseMap,
    actionsToCreateSecondaryExcluded: createSecondary,
    actionsBlocked: blocked,
    approvalSummary: {
      reuseMapCount: reuseMap.length,
      createSecondaryExcludedCount: createSecondary.length,
      blockedCount: blocked.length,
      explicitApprovalPhraseRequired: true
    },
    risks: [
      'Mapping the wrong existing conversion action could affect reporting continuity.',
      'Creating duplicate same-event conversions could inflate reporting; the future apply must block duplicates.',
      'Secondary conversions must remain excluded from conversions column initially to avoid shallow optimization.',
      'signup_success remains quality-dependent until downstream quality is confirmed.'
    ],
    rollbackNotes: [
      'Do not delete conversion actions automatically.',
      'If an action is configured incorrectly, exclude it from conversions column and document the canonical action.',
      'If duplicate conversion actions are detected, keep only the approved canonical action active for reporting/bidding.',
      'If signup quality is poor, keep signup_success observation-only until a quality loop exists.'
    ],
    recommendedNextPhase: 'Phase 3J - Google Ads Controlled Import Apply Execution',
    safety: baseSafety()
  };
}

function baseSafety() {
  return {
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
    executeNow: false
  };
}

function markdownTable(actions) {
  if (!actions.length) return 'No actions.';
  return [
    '| Event | Operation | Include in conversions | Risk | Allowed now |',
    '| --- | --- | --- | --- | --- |',
    ...actions.map((action) => `| ${action.eventName} | ${action.operationType} | ${action.includeInConversionsSetting} | ${action.riskLevel} | ${action.operationAllowedNow} |`)
  ].join('\n');
}

function renderMarkdown(report) {
  return `# Google Ads Controlled Import Apply Execution Approval

## Executive Summary

Phase 3I is approval-only. It creates the final owner approval checklist before any real Google Ads conversion apply execution.

Overall status: **${report.overallStatus}**

Apply allowed: **${report.applyAllowed}**

Execute now: **${report.executeNow}**

## Required Owner Approval Phrase

${report.requiredOwnerApprovalPhrase}

## Reuse / Map Existing Actions

${markdownTable(report.actionsToReuseOrMap || [])}

## Create Secondary Excluded Actions

${markdownTable(report.actionsToCreateSecondaryExcluded || [])}

## Blocked Actions

${markdownTable(report.actionsBlocked || [])}

## Approval Checklist

${(report.approvalChecklist || []).map((item) => `- ${item}`).join('\n')}

## Risks

${(report.risks || []).map((item) => `- ${item}`).join('\n')}

## Rollback Notes

${(report.rollbackNotes || []).map((item) => `- ${item}`).join('\n')}

## Recommended Next Phase

${report.recommendedNextPhase}

## Safety Confirmations

- No Google Ads writes were made.
- No conversion actions were created or imported.
- No campaigns were created.
- No GA4, GTM, Meta, or runtime files were modified.
- No secrets or tokens were printed.
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCards(title, actions) {
  const cards = (actions || []).map((action) => `
    <article class="card">
      <h3>${escapeHtml(action.eventName)}</h3>
      <p><strong>Operation:</strong> ${escapeHtml(action.operationType)}</p>
      <p><strong>Include in conversions:</strong> ${escapeHtml(action.includeInConversionsSetting)}</p>
      <p><strong>Allowed now:</strong> ${escapeHtml(action.operationAllowedNow)}</p>
      <p>${escapeHtml(action.exactFutureOperation)}</p>
    </article>`).join('\n') || '<p>No actions.</p>';
  return `<section><h2>${escapeHtml(title)}</h2><div class="grid">${cards}</div></section>`;
}

function renderHtml(report) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRBOX Google Ads Apply Execution Approval</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2937; background: #f7f8fb; }
    header { background: #123047; color: white; padding: 32px; }
    main { max-width: 1180px; margin: 0 auto; padding: 24px; }
    .notice, .card { background: white; border: 1px solid #dce3ec; border-radius: 8px; padding: 16px; }
    .notice { border-left: 4px solid #f2b705; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>CRBOX Google Ads Apply Execution Approval</h1>
    <p>Phase ${escapeHtml(report.phase)} · ${escapeHtml(report.overallStatus)}</p>
  </header>
  <main>
    <div class="notice">Approval-only: applyAllowed=${report.applyAllowed}, executeNow=${report.executeNow}. No Google Ads writes were made.</div>
    <section class="notice"><h2>Required Owner Approval Phrase</h2><p>${escapeHtml(report.requiredOwnerApprovalPhrase)}</p></section>
    ${renderCards('Reuse / Map Existing Actions', report.actionsToReuseOrMap)}
    ${renderCards('Create Secondary Excluded Actions', report.actionsToCreateSecondaryExcluded)}
    ${renderCards('Blocked Actions', report.actionsBlocked)}
  </main>
</body>
</html>
`;
}

function writeArtifacts(root, report) {
  const jsonPath = path.join(root, 'docs/marketing-ops-google-ads-apply-execution-approval.json');
  const mdPath = path.join(root, 'docs/marketing-ops-google-ads-apply-execution-approval.md');
  const htmlPath = path.join(root, 'docs/marketing-ops-google-ads-apply-execution-approval.html');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  fs.writeFileSync(htmlPath, renderHtml(report));
  return { jsonPath, mdPath, htmlPath };
}

function runGoogleAdsApplyExecutionApproval(root) {
  const report = buildReport(root);
  const paths = writeArtifacts(root, report);
  return { report, paths };
}

function summaryLines({ report, paths }) {
  return [
    `overallStatus: ${report.overallStatus}`,
    `applyAllowed: ${report.applyAllowed}`,
    `executeNow: ${report.executeNow}`,
    `approval phrase required: ${Boolean(report.requiredOwnerApprovalPhrase)}`,
    `reuse/map actions: ${report.approvalSummary ? report.approvalSummary.reuseMapCount : 0}`,
    `create secondary excluded actions: ${report.approvalSummary ? report.approvalSummary.createSecondaryExcludedCount : 0}`,
    `blocked actions: ${report.approvalSummary ? report.approvalSummary.blockedCount : 0}`,
    `JSON: ${paths.jsonPath}`,
    `Markdown: ${paths.mdPath}`,
    `HTML: ${paths.htmlPath}`,
    'Mutation statement: no GA4, GTM, Google Ads, Meta, or runtime platform writes were performed.'
  ];
}

module.exports = {
  runGoogleAdsApplyExecutionApproval,
  summaryLines
};

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  for (const line of summaryLines(runGoogleAdsApplyExecutionApproval(root))) {
    console.log(line);
  }
}
