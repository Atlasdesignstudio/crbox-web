'use strict';

const EXECUTION_DISABLED_MESSAGE = 'Controlled create execution is not enabled in Phase 2C-Prep. No platform mutations were performed.';

function parseApplyArgs(argv) {
  const options = {
    platform: null,
    actionIds: [],
    all: false,
    confirmHumanApproval: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--platform') {
      options.platform = argv[index + 1] || null;
      index += 1;
    } else if (arg === '--action-id') {
      if (argv[index + 1]) options.actionIds.push(argv[index + 1]);
      index += 1;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--confirm-human-approval') {
      options.confirmHumanApproval = true;
    }
  }

  return options;
}

function selectActions(validation, scope, options) {
  const platform = options.platform || (scope === 'all' ? null : scope);
  const selectedIds = new Set(options.actionIds || []);
  return validation.proposedActions
    .map((action, index) => ({ action, index }))
    .filter(({ action }) => !platform || action.platform === platform)
    .filter(({ action, index }) => {
      if (!selectedIds.size) return true;
      const { actionId } = require('./apply-validator');
      return selectedIds.has(actionId(action, index));
    })
    .map(({ action }) => action);
}

function evaluateApplyPolicy({ validation, scope = 'all', argv = [], env = process.env }) {
  const options = parseApplyArgs(argv);
  const mode = env.MARKETING_AGENT_MODE || 'read_only';
  const writesFlagEnabled = env.MARKETING_AGENT_ENABLE_WRITES === 'true';
  const selectedActions = validation.ok ? selectActions(validation, scope, options) : [];
  const eligibleGa4Actions = selectedActions.filter((action) => action.platform === 'ga4');
  const eligibleGtmActions = selectedActions.filter((action) => action.platform === 'gtm');

  return {
    mode,
    writesFlagEnabled,
    controlledCreateRequested: mode === 'controlled_create',
    executionEnabled: false,
    executionDisabledReason: EXECUTION_DISABLED_MESSAGE,
    humanApprovalConfirmed: options.confirmHumanApproval,
    actionSelectionProvided: options.all || options.actionIds.length > 0 || Boolean(options.platform),
    selectedActions,
    eligibleGa4Actions,
    eligibleGtmActions,
    blockedActions: validation.blockedActions || []
  };
}

module.exports = {
  EXECUTION_DISABLED_MESSAGE,
  parseApplyArgs,
  evaluateApplyPolicy
};
