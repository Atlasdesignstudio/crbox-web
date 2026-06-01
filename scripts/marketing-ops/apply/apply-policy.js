'use strict';

const EXECUTION_DISABLED_MESSAGE = 'Controlled create execution is disabled for this command. No platform mutations were performed.';
const GA4_EXECUTION_READY_MESSAGE = 'GA4 controlled create execution is enabled for explicitly selected approved actions.';
const ALLOWED_GA4_CREATE_ACTIONS = Object.freeze(new Set(['create_custom_dimension', 'mark_key_event']));

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

function rejectionReasonsForAction(action) {
  const reasons = [];
  if (action.platform !== 'ga4') reasons.push('Only GA4 actions may be executed in Phase 2D.');
  if (!ALLOWED_GA4_CREATE_ACTIONS.has(action.action)) reasons.push('Action is not in the GA4 controlled-create allowlist.');
  if (['gclid', 'fbclid'].includes(String(action.dataLayerVariableName || '').toLowerCase())) reasons.push('Raw click ID variables are blocked.');
  if (/publish|version|tag|customer_data|upload|google_ads|meta/i.test(String(action.action || ''))) {
    reasons.push('Action is an out-of-scope publish, version, tag, customer-data, Google Ads, or Meta operation.');
  }
  return reasons;
}

function evaluateApplyPolicy({ validation, scope = 'all', argv = [], env = process.env, requestedMode = 'preview' }) {
  const options = parseApplyArgs(argv);
  const mode = env.MARKETING_AGENT_MODE || 'read_only';
  const writesFlagEnabled = env.MARKETING_AGENT_ENABLE_WRITES === 'true';
  const selectedActions = validation.ok ? selectActions(validation, scope, options) : [];
  const eligibleGa4Actions = selectedActions.filter((action) => action.platform === 'ga4');
  const eligibleGtmActions = selectedActions.filter((action) => action.platform === 'gtm');
  const isGa4CreateMode = requestedMode === 'ga4_controlled_create';
  const rejectedActions = selectedActions
    .map((action) => ({ action, reasons: rejectionReasonsForAction(action) }))
    .filter((item) => item.reasons.length > 0);
  const controlledCreateRequested = mode === 'controlled_create';
  const platformProvided = options.platform === 'ga4';
  const actionSelectionProvided = options.all || options.actionIds.length > 0;
  const gateFailures = [];

  if (isGa4CreateMode) {
    if (!validation.ok) gateFailures.push('Dry-run plan validation must pass.');
    if (!controlledCreateRequested) gateFailures.push('MARKETING_AGENT_MODE must be controlled_create.');
    if (!writesFlagEnabled) gateFailures.push('MARKETING_AGENT_ENABLE_WRITES must be true.');
    if (!platformProvided) gateFailures.push('CLI flag --platform ga4 is required.');
    if (!options.confirmHumanApproval) gateFailures.push('CLI flag --confirm-human-approval is required.');
    if (!actionSelectionProvided) gateFailures.push('CLI flag --all or at least one --action-id is required.');
    if (selectedActions.length === 0) gateFailures.push('At least one selected action must match the dry-run plan.');
    if (eligibleGtmActions.length > 0) gateFailures.push('GTM actions cannot be selected for GA4 controlled create.');
    if (selectedActions.some((action) => action.platform !== 'ga4')) gateFailures.push('Only GA4 actions may be selected.');
    if (rejectedActions.length > 0) gateFailures.push('One or more selected actions are rejected by policy.');
  }

  const executionEnabled = isGa4CreateMode && gateFailures.length === 0;

  return {
    mode,
    executionMode: isGa4CreateMode ? 'ga4_controlled_create' : (requestedMode === 'validation' ? 'validation' : 'preview'),
    writesFlagEnabled,
    controlledCreateRequested,
    executionEnabled,
    executionDisabledReason: executionEnabled ? '' : (gateFailures.length ? gateFailures.join(' ') : EXECUTION_DISABLED_MESSAGE),
    executionReadyMessage: executionEnabled ? GA4_EXECUTION_READY_MESSAGE : '',
    humanApprovalConfirmed: options.confirmHumanApproval,
    actionSelectionProvided,
    platformProvided,
    options,
    selectedActions,
    eligibleGa4Actions,
    eligibleGtmActions,
    rejectedActions: isGa4CreateMode ? rejectedActions : [],
    gateFailures,
    blockedActions: validation.blockedActions || []
  };
}

module.exports = {
  EXECUTION_DISABLED_MESSAGE,
  GA4_EXECUTION_READY_MESSAGE,
  parseApplyArgs,
  evaluateApplyPolicy
};
