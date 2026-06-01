'use strict';

const { validateDryRunPlan } = require('./apply-validator');
const { evaluateApplyPolicy, EXECUTION_DISABLED_MESSAGE } = require('./apply-policy');
const { buildGa4ExecutionPreviews } = require('./ga4-apply');
const { buildGtmExecutionPreviews } = require('./gtm-apply');
const { summarizeApply } = require('./apply-report');

function runApply(root, options = {}) {
  const scope = options.scope || 'all';
  const validateOnly = Boolean(options.validateOnly);
  const validation = validateDryRunPlan(root);
  const policy = evaluateApplyPolicy({
    validation,
    scope,
    argv: options.argv || [],
    env: process.env
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

  if (!validateOnly) {
    lines.push(`Execution refused: ${EXECUTION_DISABLED_MESSAGE}`);
  }

  return {
    validation,
    policy,
    previews,
    summary,
    outputLines: lines,
    exitCode: validation.ok ? 0 : 1
  };
}

module.exports = {
  runApply
};
