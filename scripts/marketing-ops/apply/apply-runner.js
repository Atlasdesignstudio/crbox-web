'use strict';

const { validateDryRunPlan } = require('./apply-validator');
const { evaluateApplyPolicy, EXECUTION_DISABLED_MESSAGE } = require('./apply-policy');
const { buildGa4ExecutionPreviews, runGa4ControlledCreate } = require('./ga4-apply');
const { buildGtmExecutionPreviews } = require('./gtm-apply');
const { summarizeApply } = require('./apply-report');
const { buildNotExecutedResult, writeGa4CreateResult } = require('./ga4-create-result');

async function runApply(root, options = {}) {
  const scope = options.scope || 'all';
  const validateOnly = Boolean(options.validateOnly);
  const requestedMode = options.requestedMode || (validateOnly ? 'validation' : 'preview');
  const validation = validateDryRunPlan(root);
  const policy = evaluateApplyPolicy({
    validation,
    scope,
    argv: options.argv || [],
    env: process.env,
    requestedMode
  });

  const previews = {
    ga4: scope === 'gtm' ? [] : buildGa4ExecutionPreviews(policy.eligibleGa4Actions),
    gtm: scope === 'ga4' ? [] : buildGtmExecutionPreviews(policy.eligibleGtmActions)
  };
  const summary = summarizeApply(validation, policy, previews);

  const lines = [
    `Controlled apply validation: ${validation.ok ? 'PASS' : 'FAIL'}`,
    `- Dry-run plan: ${validation.planPath}`,
    `- Mode: ${policy.mode}`,
    `- Execution mode: ${policy.executionMode}`,
    `- Controlled apply execution enabled: ${policy.executionEnabled}`,
    `- Eligible GA4 actions: ${summary.eligibleGa4Actions}`,
    `- Eligible GTM actions: ${summary.eligibleGtmActions}`,
    `- Blocked actions: ${summary.blockedActions}`,
    `- Future execution previews: ${summary.futureExecutionPreviews.length}`
  ];

  if (!validation.ok) {
    lines.push('Validation issues:');
    for (const error of validation.errors) {
      lines.push(`- ${error}`);
    }
  }

  if (policy.gateFailures && policy.gateFailures.length) {
    lines.push('Safety gate failures:');
    for (const failure of policy.gateFailures) {
      lines.push(`- ${failure}`);
    }
  }

  if (policy.rejectedActions && policy.rejectedActions.length) {
    lines.push('Rejected selected actions:');
    for (const item of policy.rejectedActions) {
      lines.push(`- ${item.action.platform}:${item.action.action} — ${item.reasons.join('; ')}`);
    }
  }

  if (summary.futureExecutionPreviews.length) {
    lines.push('Future execution previews:');
    for (const preview of summary.futureExecutionPreviews) {
      const subject = preview.parameterName
        || preview.eventName
        || preview.variableName
        || preview.triggerName
        || preview.action;
      lines.push(`- ${preview.actionId}: ${subject} would call ${preview.wouldCall}; executed=false`);
    }
  }

  let ga4CreateResult = null;
  if (requestedMode === 'ga4_controlled_create') {
    if (policy.executionEnabled) {
      ga4CreateResult = await runGa4ControlledCreate(root, policy.eligibleGa4Actions, policy);
      lines.push(`GA4 create result status: ${ga4CreateResult.status}`);
      lines.push(`GA4 mutations performed: ${ga4CreateResult.mutationPerformed}`);
      summary.mutationStatement = ga4CreateResult.mutationStatement;
    } else {
      ga4CreateResult = buildNotExecutedResult(policy, policy.executionDisabledReason);
      writeGa4CreateResult(root, ga4CreateResult);
      lines.push(`Execution refused: ${policy.executionDisabledReason}`);
      lines.push('GA4 create result status: not_executed');
      summary.mutationStatement = ga4CreateResult.mutationStatement;
    }
  } else if (!validateOnly) {
    lines.push(`Execution refused: ${EXECUTION_DISABLED_MESSAGE}`);
  }

  return {
    validation,
    policy,
    previews,
    summary,
    ga4CreateResult,
    outputLines: lines,
    exitCode: validation.ok ? 0 : 1
  };
}

module.exports = {
  runApply
};
