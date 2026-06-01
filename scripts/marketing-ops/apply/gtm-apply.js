'use strict';

const { actionId } = require('./apply-validator');

function previewGtmAction(action, index) {
  if (action.action === 'create_data_layer_variable') {
    return {
      actionId: actionId(action, index),
      platform: 'gtm',
      action: action.action,
      accountId: action.gtmAccountId,
      containerId: action.gtmContainerId,
      workspacePath: action.workspacePath,
      variableName: action.variableName,
      dataLayerVariableName: action.dataLayerVariableName,
      defaultValue: action.defaultValue,
      riskLevel: action.riskLevel,
      wouldCall: 'tagmanager.accounts.containers.workspaces.variables.create',
      executed: false
    };
  }

  if (action.action === 'create_custom_event_trigger') {
    return {
      actionId: actionId(action, index),
      platform: 'gtm',
      action: action.action,
      accountId: action.gtmAccountId,
      containerId: action.gtmContainerId,
      workspacePath: action.workspacePath,
      triggerName: action.triggerName,
      eventName: action.eventName,
      riskLevel: action.riskLevel,
      wouldCall: 'tagmanager.accounts.containers.workspaces.triggers.create',
      executed: false
    };
  }

  return {
    actionId: actionId(action, index),
    platform: 'gtm',
    action: action.action,
    wouldCall: 'unsupported',
    executed: false
  };
}

function buildGtmExecutionPreviews(actions) {
  return actions.map(previewGtmAction);
}

module.exports = {
  buildGtmExecutionPreviews
};
