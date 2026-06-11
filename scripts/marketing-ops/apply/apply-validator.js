'use strict';

const fs = require('fs');
const path = require('path');

const ALLOWED_ACTIONS = Object.freeze({
  ga4: new Set(['create_custom_dimension', 'mark_key_event']),
  gtm: new Set(['create_data_layer_variable', 'create_custom_event_trigger'])
});

const BLOCKED_ACTION_TYPES = Object.freeze(new Set([
  'publish_gtm_container',
  'create_gtm_version',
  'create_gtm_tag',
  'create_google_ads_conversion',
  'create_meta_pixel',
  'create_meta_event_tag',
  'upload_customer_data',
  'create_raw_click_id_variable'
]));

const SUSPICIOUS_KEY_PATTERN = /(secret|token|password|credential|private_key|refresh|access_token|client_secret)/i;
const SUSPICIOUS_VALUE_PATTERN = /(Bearer\s+[A-Za-z0-9._~+/-]+=*|ya29\.|AIza[0-9A-Za-z_-]+|gh[opsu]_[0-9A-Za-z_]+|xox[baprs]-[0-9A-Za-z-]+)/;
const GA4_DISPLAY_NAME_PATTERN = /^[A-Za-z0-9_ ]+$/;

function actionSubject(action) {
  return action.parameterName
    || action.eventName
    || action.variableName
    || action.triggerName
    || action.dataLayerVariableName
    || action.action
    || 'unknown';
}

function actionId(action, index) {
  const subject = String(actionSubject(action)).replace(/[^a-z0-9_:-]+/gi, '_').replace(/^_+|_+$/g, '');
  return `${action.platform || 'unknown'}:${action.action || 'unknown'}:${subject || index}`;
}

function collectProposedActions(plan) {
  return [
    ...(((plan.ga4 || {}).proposedActions) || []),
    ...(((plan.gtm || {}).proposedActions) || [])
  ];
}

function hasSuspiciousCredentialValue(value, keyPath) {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'string') return false;
  if (!value) return false;
  const joinedPath = keyPath.join('.');
  return SUSPICIOUS_KEY_PATTERN.test(joinedPath) || SUSPICIOUS_VALUE_PATTERN.test(value);
}

function scanForSecrets(value, keyPath = [], findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForSecrets(item, keyPath.concat(String(index)), findings));
    return findings;
  }
  if (value && typeof value === 'object') {
    for (const [key, nestedValue] of Object.entries(value)) {
      scanForSecrets(nestedValue, keyPath.concat(key), findings);
    }
    return findings;
  }
  if (hasSuspiciousCredentialValue(value, keyPath)) {
    findings.push(keyPath.join('.') || '(root)');
  }
  return findings;
}

function validateProposedAction(action, index) {
  const errors = [];
  const id = actionId(action, index);

  if (action.mode !== 'dry_run') errors.push(`${id}: mode must be dry_run.`);
  if (action.executed !== false) errors.push(`${id}: executed must be false.`);
  if (action.humanApprovalRequired !== true) errors.push(`${id}: humanApprovalRequired must be true.`);
  if (action.wouldMutate !== true) errors.push(`${id}: wouldMutate must be true.`);
  if (!['ga4', 'gtm'].includes(action.platform)) errors.push(`${id}: platform must be ga4 or gtm.`);

  const platformActions = ALLOWED_ACTIONS[action.platform];
  if (!platformActions || !platformActions.has(action.action)) {
    errors.push(`${id}: action is not in the Phase 2C-Prep allowlist.`);
  }

  if (BLOCKED_ACTION_TYPES.has(action.action)) {
    errors.push(`${id}: action type is explicitly blocked.`);
  }

  if (action.platform === 'google_ads') errors.push(`${id}: Google Ads actions are out of scope.`);
  if (action.platform === 'meta') errors.push(`${id}: Meta actions are out of scope.`);

  if (
    action.platform === 'gtm'
    && action.action === 'create_data_layer_variable'
    && ['gclid', 'fbclid'].includes(String(action.dataLayerVariableName || '').toLowerCase())
  ) {
    errors.push(`${id}: raw ${action.dataLayerVariableName} must not be exposed as a GTM Data Layer Variable.`);
  }

  if (
    action.platform === 'gtm'
    && ['create_data_layer_variable', 'create_custom_event_trigger'].includes(action.action)
    && !action.workspacePath
  ) {
    errors.push(`${id}: GTM controlled create requires workspacePath from the dry-run plan.`);
  }

  if (
    action.platform === 'ga4'
    && ['mark_key_event', 'create_conversion_event'].includes(action.action)
    && ['calculator_result', 'whatsapp_click'].includes(String(action.eventName || ''))
  ) {
    errors.push(`${id}: ${action.eventName} must not be marked as a key event/conversion in this phase.`);
  }

  if (
    action.platform === 'ga4'
    && action.action === 'create_custom_dimension'
    && !GA4_DISPLAY_NAME_PATTERN.test(String(action.displayName || ''))
  ) {
    errors.push(`${id}: invalid GA4 custom dimension displayName "${action.displayName || ''}". Must match ${GA4_DISPLAY_NAME_PATTERN}.`);
  }

  if (/publish|version|tag|customer_data/i.test(String(action.action || ''))) {
    errors.push(`${id}: action attempts an out-of-scope publish, version, tag, or customer-data operation.`);
  }

  return errors;
}

function validateDryRunPlan(root) {
  const planPath = path.join(root, 'docs', 'marketing-ops-dry-run-plan.json');
  const errors = [];
  const warnings = [];
  let plan = null;

  if (!fs.existsSync(planPath)) {
    return {
      ok: false,
      plan: null,
      planPath,
      errors: [`Dry-run plan file is missing: ${planPath}`],
      warnings,
      ga4Actions: [],
      gtmActions: [],
      proposedActions: [],
      blockedActions: []
    };
  }

  try {
    plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  } catch (error) {
    return {
      ok: false,
      plan: null,
      planPath,
      errors: [`Dry-run plan JSON could not be parsed: ${error.message}`],
      warnings,
      ga4Actions: [],
      gtmActions: [],
      proposedActions: [],
      blockedActions: []
    };
  }

  if (plan.mode !== 'dry_run') errors.push('Plan mode must be dry_run.');
  if (plan.mutationPerformed !== false) errors.push('Plan mutationPerformed must be false.');
  if (plan.requiresHumanApproval !== true) errors.push('Plan requiresHumanApproval must be true.');
  if (!plan.ga4 || !Array.isArray(plan.ga4.proposedActions)) errors.push('Plan ga4.proposedActions must be an array.');
  if (!plan.gtm || !Array.isArray(plan.gtm.proposedActions)) errors.push('Plan gtm.proposedActions must be an array.');
  if (!Array.isArray(plan.blockedActions)) errors.push('Plan blockedActions must be an array.');

  const proposedActions = collectProposedActions(plan);
  proposedActions.forEach((action, index) => {
    errors.push(...validateProposedAction(action, index));
  });

  const secretFindings = scanForSecrets(plan);
  if (secretFindings.length) {
    errors.push(`Plan contains suspicious credential-like fields or values at: ${secretFindings.join(', ')}`);
  }

  return {
    ok: errors.length === 0,
    plan,
    planPath,
    errors,
    warnings,
    ga4Actions: ((plan.ga4 || {}).proposedActions) || [],
    gtmActions: ((plan.gtm || {}).proposedActions) || [],
    proposedActions,
    blockedActions: plan.blockedActions || [],
    actionIds: proposedActions.map(actionId)
  };
}

module.exports = {
  ALLOWED_ACTIONS,
  BLOCKED_ACTION_TYPES,
  GA4_DISPLAY_NAME_PATTERN,
  actionId,
  actionSubject,
  validateDryRunPlan
};
