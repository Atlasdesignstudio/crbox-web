'use strict';

const { EXPECTED } = require('../config');

const DLV_CONFIG = Object.freeze({
  utm_source: { variableName: 'DLV - utm_source', defaultValue: '(not set)', riskLevel: 'low' },
  utm_medium: { variableName: 'DLV - utm_medium', defaultValue: '(not set)', riskLevel: 'low' },
  utm_campaign: { variableName: 'DLV - utm_campaign', defaultValue: '(not set)', riskLevel: 'low' },
  utm_content: { variableName: 'DLV - utm_content', defaultValue: '(not set)', riskLevel: 'low' },
  utm_term: { variableName: 'DLV - utm_term', defaultValue: '(not set)', riskLevel: 'low' },
  gclid_present: { variableName: 'DLV - gclid_present', defaultValue: false, riskLevel: 'low' },
  fbclid_present: { variableName: 'DLV - fbclid_present', defaultValue: false, riskLevel: 'low' },
  attribution_touch: { variableName: 'DLV - attribution_touch', defaultValue: 'none', riskLevel: 'low' }
});

const TRIGGER_CONFIG = Object.freeze({
  quote_request_submit_success: {
    triggerName: 'CE - quote_request_submit_success',
    riskLevel: 'low/medium',
    reason: 'Custom Event trigger is required so GTM can route confirmed quote request success events to GA4 and later paid-media tags.'
  },
  contact_form_submit_success: {
    triggerName: 'CE - contact_form_submit_success',
    riskLevel: 'low',
    reason: 'Custom Event trigger is required for the confirmed contact form success event.'
  },
  quote_request_start: {
    triggerName: 'CE - quote_request_start',
    riskLevel: 'low',
    reason: 'Custom Event trigger is required for quote funnel entry/audience analysis.'
  }
});

function workspacePath(gtmResult) {
  return gtmResult.workspace && gtmResult.workspace.path ? gtmResult.workspace.path : '';
}

function workspaceId(gtmResult) {
  return gtmResult.workspace && gtmResult.workspace.workspaceId ? gtmResult.workspace.workspaceId : '';
}

function buildGtmPlan(gtmResult, options = {}) {
  const liveVerified = Boolean(gtmResult.liveApiChecked);
  const accountId = gtmResult.accountId || process.env.GTM_ACCOUNT_ID || '';
  const containerId = gtmResult.containerId || process.env.GTM_CONTAINER_ID || '';
  const publicContainerId = gtmResult.publicContainerId || EXPECTED.gtmContainerId;
  const missingDlvs = (gtmResult.missingDlvs && gtmResult.missingDlvs.length)
    ? gtmResult.missingDlvs
    : (liveVerified ? [] : Object.keys(DLV_CONFIG));
  const missingTriggers = (gtmResult.missingTriggers && gtmResult.missingTriggers.length)
    ? gtmResult.missingTriggers
    : (liveVerified ? [] : Object.keys(TRIGGER_CONFIG));
  const proposedActions = [];
  const warnings = [];
  const blockedActions = [];
  const rawClickIdSafetyWarning = (gtmResult.checks || []).some((check) =>
    check.id === 'gtm-raw-click-id-safety' && check.status === 'warn'
  );

  if (!liveVerified) {
    warnings.push('GTM live state was not verified; proposed GTM actions are expected from the tracking plan, not live-verified.');
  }

  for (const rawName of ['gclid', 'fbclid']) {
    blockedActions.push({
      platform: 'gtm',
      action: 'create_data_layer_variable',
      mode: 'blocked',
      dataLayerVariableName: rawName,
      reason: `Raw ${rawName} must remain private in sessionStorage and must not be exposed through GTM variables.`,
      wouldMutate: true,
      executed: false
    });
  }

  if (rawClickIdSafetyWarning) {
    warnings.push('GTM raw click ID exposure was detected; GTM dry-run proposals are blocked until raw gclid/fbclid variables are removed or explicitly reviewed.');
    return {
      accountId,
      containerId,
      publicContainerId,
      workspace: gtmResult.workspace || null,
      liveVerified,
      proposedActions,
      blockedActions,
      notes: [
        'GTM dry-run proposals were blocked because raw click ID exposure may exist.',
        'No variables, triggers, tags, versions, or publications are created by this dry-run planner.'
      ],
      warnings
    };
  }

  if (options.include !== 'triggers') {
    for (const dataLayerVariableName of missingDlvs) {
      const config = DLV_CONFIG[dataLayerVariableName];
      if (!config) continue;
      proposedActions.push({
        platform: 'gtm',
        action: 'create_data_layer_variable',
        mode: 'dry_run',
        variableName: config.variableName,
        dataLayerVariableName,
        defaultValue: config.defaultValue,
        gtmAccountId: accountId,
        gtmContainerId: containerId,
        publicContainerId,
        workspaceId: workspaceId(gtmResult),
        workspacePath: workspacePath(gtmResult),
        apiEndpointOrResourceType: 'tagmanager.accounts.containers.workspaces.variables',
        riskLevel: config.riskLevel,
        reason: 'Low-risk GTM variable reads an existing approved dataLayer parameter; it does not collect new data or expose raw click IDs.',
        humanApprovalRequired: true,
        wouldMutate: true,
        executed: false,
        liveVerified
      });
    }
  }

  if (options.include !== 'dlvs') {
    for (const eventName of missingTriggers) {
      const config = TRIGGER_CONFIG[eventName];
      if (!config) continue;
      proposedActions.push({
        platform: 'gtm',
        action: 'create_custom_event_trigger',
        mode: 'dry_run',
        triggerName: config.triggerName,
        eventName,
        gtmAccountId: accountId,
        gtmContainerId: containerId,
        publicContainerId,
        workspaceId: workspaceId(gtmResult),
        workspacePath: workspacePath(gtmResult),
        apiEndpointOrResourceType: 'tagmanager.accounts.containers.workspaces.triggers',
        riskLevel: config.riskLevel,
        reason: config.reason,
        humanApprovalRequired: true,
        wouldMutate: true,
        executed: false,
        liveVerified
      });
    }
  }

  return {
    accountId,
    containerId,
    publicContainerId,
    workspace: gtmResult.workspace || null,
    liveVerified,
    proposedActions,
    blockedActions,
    notes: [
      'No variables, triggers, tags, versions, or publications are created by this dry-run planner.',
      'No variables are proposed for raw gclid or raw fbclid.',
      'Existing triggers for signup_success, calculator_result, and whatsapp_click are not duplicated.',
      'Meta Pixel tags remain a later phase and are not proposed here.'
    ],
    warnings
  };
}

module.exports = {
  buildGtmPlan
};
