'use strict';

function summarizeApply(validation, policy, previews = {}) {
  return {
    dryRunPlanValid: Boolean(validation.ok),
    controlledApplyExecutionEnabled: Boolean(policy.executionEnabled),
    controlledApplyReason: policy.executionDisabledReason,
    mode: policy.mode,
    writesFlagEnabled: policy.writesFlagEnabled,
    eligibleGa4Actions: policy.eligibleGa4Actions.length,
    eligibleGtmActions: policy.eligibleGtmActions.length,
    blockedActions: policy.blockedActions.length,
    validationErrors: validation.errors || [],
    validationWarnings: validation.warnings || [],
    futureExecutionPreviews: [
      ...(previews.ga4 || []),
      ...(previews.gtm || [])
    ],
    mutationStatement: 'No controlled apply mutations were performed. Phase 2C-Prep validates apply readiness only.'
  };
}

module.exports = {
  summarizeApply
};
