#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PHASE = '3H';
const MODE = 'google_ads_controlled_import_apply_plan_dry_run';

const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-google-ads-account-preflight.json',
  'docs/marketing-ops-google-ads-apply-payload-final-review.json',
  'docs/marketing-ops-google-ads-controlled-import-approval.json',
  'docs/marketing-ops-google-ads-manual-mapping-decision.json'
]);

function readJsonIfPresent(root, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sourceArtifactAvailability(root) {
  return SOURCE_ARTIFACTS.map((artifactPath) => ({
    path: artifactPath,
    status: fs.existsSync(path.join(root, artifactPath)) ? 'available' : 'source_artifact_missing'
  }));
}

function manualDecisionFallback() {
  return [
    {
      eventName: 'quote_request_submit_success',
      proposedGoogleAdsActionName: 'CRBOX - Quote Request Submitted',
      existingActionToMap: 'CRBOX Website (web) quote_request_submit_success',
      decision: 'APPROVE_REUSE_EXISTING_AS_PRIMARY',
      recommendation: 'reuse_existing',
      role: 'primary',
      includeInConversionsRecommendation: true,
      riskLevel: 'medium',
      status: 'approved_to_map_existing'
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
      status: 'approved_to_map_existing_quality_pending'
    },
    {
      eventName: 'contact_form_submit_success',
      proposedGoogleAdsActionName: 'CRBOX - Contact Form Submitted',
      decision: 'APPROVE_CREATE_SECONDARY_EXCLUDED',
      recommendation: 'create_secondary_excluded',
      role: 'secondary_observation',
      includeInConversionsRecommendation: false,
      riskLevel: 'low',
      status: 'approved_to_create_secondary_excluded'
    },
    {
      eventName: 'calculator_result',
      proposedGoogleAdsActionName: 'CRBOX - Calculator Result Generated',
      decision: 'APPROVE_CREATE_SECONDARY_EXCLUDED',
      recommendation: 'create_secondary_excluded',
      role: 'secondary_observation',
      includeInConversionsRecommendation: false,
      riskLevel: 'low',
      status: 'approved_to_create_secondary_excluded'
    },
    {
      eventName: 'whatsapp_click',
      proposedGoogleAdsActionName: 'CRBOX - WhatsApp Click',
      decision: 'APPROVE_CREATE_SECONDARY_EXCLUDED',
      recommendation: 'create_secondary_excluded',
      role: 'secondary_observation',
      includeInConversionsRecommendation: false,
      riskLevel: 'low',
      status: 'approved_to_create_secondary_excluded'
    },
    {
      eventName: 'email_click',
      proposedGoogleAdsActionName: 'CRBOX - Email Click',
      decision: 'APPROVE_CREATE_SECONDARY_EXCLUDED',
      recommendation: 'create_secondary_excluded',
      role: 'secondary_observation',
      includeInConversionsRecommendation: false,
      riskLevel: 'low',
      status: 'approved_to_create_secondary_excluded'
    },
    {
      eventName: 'phone_click',
      proposedGoogleAdsActionName: 'CRBOX - Phone Click',
      decision: 'KEEP_BLOCKED',
      recommendation: 'block_until_call_tracking',
      role: 'blocked',
      includeInConversionsRecommendation: false,
      riskLevel: 'medium',
      status: 'blocked'
    }
  ];
}

function operationForDecision(decision) {
  if (decision.recommendation === 'reuse_existing') {
    return {
      futureApiOperationType: 'map_existing_conversion_action_no_create',
      operationCurrentlyAllowed: false,
      applyPlanAction: 'reuse_map_existing',
      reason: 'Owner approved reusing the existing same-event Google Ads action as canonical. A future apply must not create a duplicate.'
    };
  }
  if (decision.recommendation === 'reuse_existing_quality_pending') {
    return {
      futureApiOperationType: 'map_existing_conversion_action_quality_pending_no_create',
      operationCurrentlyAllowed: false,
      applyPlanAction: 'reuse_map_existing_quality_pending',
      reason: 'Owner approved reusing the existing same-event action, but signup remains quality-dependent and not primary bidding until quality is confirmed.'
    };
  }
  if (decision.recommendation === 'create_secondary_excluded') {
    return {
      futureApiOperationType: 'create_or_import_ga4_conversion_action_as_secondary_excluded',
      operationCurrentlyAllowed: false,
      applyPlanAction: 'future_create_import_secondary_excluded',
      reason: 'Owner approved future secondary observation only. It must be excluded from the conversions column initially.'
    };
  }
  return {
    futureApiOperationType: 'none_blocked',
    operationCurrentlyAllowed: false,
    applyPlanAction: 'blocked',
    reason: 'Owner kept this action blocked until additional measurement is available.'
  };
}

function buildDryRunAction(decision) {
  const operation = operationForDecision(decision);
  return {
    eventName: decision.eventName,
    proposedGoogleAdsActionName: decision.proposedGoogleAdsActionName,
    existingActionToMap: decision.existingActionToMap || null,
    ownerDecision: decision.decision,
    ownerApprovalStatus: decision.status,
    applyPlanAction: operation.applyPlanAction,
    reason: operation.reason,
    includeInConversionsSetting: decision.includeInConversionsRecommendation,
    primarySecondaryRole: decision.role,
    riskLevel: decision.riskLevel,
    futureApiOperationType: operation.futureApiOperationType,
    operationCurrentlyAllowed: operation.operationCurrentlyAllowed,
    googleAdsWriteWillRunNow: false
  };
}

function buildReport(root) {
  const preflight = readJsonIfPresent(root, 'docs/marketing-ops-google-ads-account-preflight.json');
  const finalReview = readJsonIfPresent(root, 'docs/marketing-ops-google-ads-apply-payload-final-review.json');
  const approvalGate = readJsonIfPresent(root, 'docs/marketing-ops-google-ads-controlled-import-approval.json');
  const mappingDecision = readJsonIfPresent(root, 'docs/marketing-ops-google-ads-manual-mapping-decision.json');
  const decisions = mappingDecision?.manualMappingDecisions || manualDecisionFallback();
  const actions = decisions.map(buildDryRunAction);
  const actionsToReuseMap = actions.filter((action) => action.applyPlanAction.startsWith('reuse_map'));
  const actionsToCreateImportFuture = actions.filter((action) => action.applyPlanAction === 'future_create_import_secondary_excluded');
  const actionsBlocked = actions.filter((action) => action.applyPlanAction === 'blocked');

  return {
    generatedAt: new Date().toISOString(),
    phase: PHASE,
    mode: MODE,
    sourceArtifacts: SOURCE_ARTIFACTS,
    sourceArtifactAvailability: sourceArtifactAvailability(root),
    sourceStatus: {
      phase3EAccountPreflight: preflight?.overallStatus || 'source_artifact_missing',
      phase3FFinalReview: finalReview?.overallStatus || 'source_artifact_missing',
      phase3GApprovalGate: approvalGate?.overallStatus || 'source_artifact_missing',
      phase3GReviewOwnerDecision: mappingDecision?.overallStatus || 'source_artifact_missing'
    },
    overallStatus: 'dry_run_apply_plan_ready_no_execution',
    applyAllowed: false,
    executeNow: false,
    phase3HExecuted: false,
    dryRunOnly: true,
    googleAdsReadOnlyAccessContext: {
      status: 'previously_confirmed_by_phase_context',
      existingConversionActionsCount: preflight?.existingConversionActions?.length ?? 'not_checked_in_this_dry_run',
      currentApiReadPerformed: false
    },
    actionsToReuseOrMap: actionsToReuseMap,
    actionsToCreateOrImportInFutureApply: actionsToCreateImportFuture,
    actionsBlocked,
    actionSummary: {
      reuseMapCount: actionsToReuseMap.length,
      futureCreateImportCount: actionsToCreateImportFuture.length,
      blockedCount: actionsBlocked.length,
      manualBlockersRemaining: 0
    },
    futureApplyBoundary: {
      mayProceedToControlledApplyOnlyAfterExplicitOwnerApproval: true,
      currentPhaseAllowsWrites: false,
      duplicateCreationAllowed: false,
      campaignCreationAllowed: false,
      conversionImportAllowedNow: false
    },
    recommendedNextPhase: 'Phase 3I - Google Ads Controlled Import Apply Execution Approval',
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

function markdownTable(actions) {
  if (!actions.length) return 'No actions.';
  return [
    '| Event | Plan action | Include in conversions | Role | Future operation | Allowed now | Risk |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...actions.map((action) => (
      `| ${action.eventName} | ${action.applyPlanAction} | ${action.includeInConversionsSetting} | ${action.primarySecondaryRole} | ${action.futureApiOperationType} | ${action.operationCurrentlyAllowed} | ${action.riskLevel} |`
    ))
  ].join('\n');
}

function renderMarkdown(report) {
  return `# Google Ads Controlled Import Apply Plan / Dry Run

## Executive Summary

Phase 3H creates a dry-run/apply-plan artifact only. It explains what a future controlled Google Ads apply would do, but it performs no Google Ads writes.

Overall status: **${report.overallStatus}**

Apply allowed: **${report.applyAllowed}**

Execute now: **${report.executeNow}**

Phase 3H executed: **${report.phase3HExecuted}**

## Source Artifacts

${report.sourceArtifactAvailability.map((item) => `- ${item.path}: ${item.status}`).join('\n')}

## Actions To Reuse / Map

${markdownTable(report.actionsToReuseOrMap)}

## Actions To Create / Import In A Future Apply

${markdownTable(report.actionsToCreateOrImportInFutureApply)}

## Actions Blocked

${markdownTable(report.actionsBlocked)}

## Apply Boundary

- Current phase allows writes: ${report.futureApplyBoundary.currentPhaseAllowsWrites}
- Conversion import allowed now: ${report.futureApplyBoundary.conversionImportAllowedNow}
- Duplicate creation allowed: ${report.futureApplyBoundary.duplicateCreationAllowed}
- Campaign creation allowed: ${report.futureApplyBoundary.campaignCreationAllowed}

## Safety Confirmations

- No Google Ads writes were made.
- No conversion actions were created or imported.
- No campaigns were created.
- No GA4, GTM, Meta, or runtime files were modified.
- No secrets or tokens were printed.

## Recommended Next Phase

${report.recommendedNextPhase}
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderActionCards(title, actions) {
  const cards = actions.map((action) => `
    <article class="card">
      <h3>${escapeHtml(action.eventName)}</h3>
      <p><strong>Plan:</strong> ${escapeHtml(action.applyPlanAction)}</p>
      <p><strong>Role:</strong> ${escapeHtml(action.primarySecondaryRole)}</p>
      <p><strong>Include in conversions:</strong> ${escapeHtml(action.includeInConversionsSetting)}</p>
      <p><strong>Future operation:</strong> ${escapeHtml(action.futureApiOperationType)}</p>
      <p><strong>Allowed now:</strong> ${escapeHtml(action.operationCurrentlyAllowed)}</p>
      <p><strong>Reason:</strong> ${escapeHtml(action.reason)}</p>
    </article>`).join('\n') || '<p>No actions.</p>';
  return `<section><h2>${escapeHtml(title)}</h2><div class="grid">${cards}</div></section>`;
}

function renderHtml(report) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRBOX Google Ads Controlled Import Dry Run</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2937; background: #f7f8fb; }
    header { background: #123047; color: white; padding: 32px; }
    main { max-width: 1180px; margin: 0 auto; padding: 24px; }
    h1, h2, h3 { margin-top: 0; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
    .metric, .card, .notice { background: white; border: 1px solid #dce3ec; border-radius: 8px; padding: 16px; }
    .metric strong { display: block; font-size: 22px; margin-top: 6px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .notice { border-left: 4px solid #f2b705; margin: 18px 0; }
    @media (max-width: 800px) { .summary, .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>CRBOX Google Ads Controlled Import Apply Plan / Dry Run</h1>
    <p>Phase ${escapeHtml(report.phase)} · ${escapeHtml(report.overallStatus)}</p>
  </header>
  <main>
    <section class="summary">
      <div class="metric">Reuse/map<strong>${report.actionSummary.reuseMapCount}</strong></div>
      <div class="metric">Future create/import<strong>${report.actionSummary.futureCreateImportCount}</strong></div>
      <div class="metric">Blocked<strong>${report.actionSummary.blockedCount}</strong></div>
      <div class="metric">Manual blockers<strong>${report.actionSummary.manualBlockersRemaining}</strong></div>
    </section>
    <div class="notice">Dry-run only: applyAllowed=${report.applyAllowed}, executeNow=${report.executeNow}, Phase 3H executed=${report.phase3HExecuted}. No Google Ads writes were made.</div>
    ${renderActionCards('Actions To Reuse / Map', report.actionsToReuseOrMap)}
    ${renderActionCards('Actions To Create / Import In A Future Apply', report.actionsToCreateOrImportInFutureApply)}
    ${renderActionCards('Actions Blocked', report.actionsBlocked)}
    <div class="notice">Recommended next phase: ${escapeHtml(report.recommendedNextPhase)}</div>
  </main>
</body>
</html>
`;
}

function writeArtifacts(root, report) {
  const jsonPath = path.join(root, 'docs/marketing-ops-google-ads-controlled-import-dry-run.json');
  const mdPath = path.join(root, 'docs/marketing-ops-google-ads-controlled-import-dry-run.md');
  const htmlPath = path.join(root, 'docs/marketing-ops-google-ads-controlled-import-dry-run.html');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  fs.writeFileSync(htmlPath, renderHtml(report));
  return { jsonPath, mdPath, htmlPath };
}

function runGoogleAdsControlledImportDryRun(root) {
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
    `actions to reuse/map: ${report.actionSummary.reuseMapCount}`,
    `actions to create/import in future apply: ${report.actionSummary.futureCreateImportCount}`,
    `actions blocked: ${report.actionSummary.blockedCount}`,
    `manual blockers remaining: ${report.actionSummary.manualBlockersRemaining}`,
    `JSON: ${paths.jsonPath}`,
    `Markdown: ${paths.mdPath}`,
    `HTML: ${paths.htmlPath}`,
    'Mutation statement: no GA4, GTM, Google Ads, Meta, or runtime platform writes were performed.'
  ];
}

module.exports = {
  runGoogleAdsControlledImportDryRun,
  summaryLines
};

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  for (const line of summaryLines(runGoogleAdsControlledImportDryRun(root))) {
    console.log(line);
  }
}
