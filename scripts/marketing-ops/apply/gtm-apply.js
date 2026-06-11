'use strict';

const { actionId } = require('./apply-validator');
const { getGoogleAccessToken, googleApiGet, googleApiPost, readableGoogleError } = require('../google-auth');
const { runGtmCheck } = require('../checks/gtm-check');
const { writeGtmCreateResult } = require('./gtm-create-result');

const RAW_CLICK_ID_KEYS = Object.freeze(new Set(['gclid', 'fbclid']));

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
      payloadPreview: buildDataLayerVariablePayload(action),
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
      payloadPreview: buildCustomEventTriggerPayload(action),
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

function parameterValues(entity) {
  const values = [];
  const walk = (value) => {
    if (value == null) return;
    if (typeof value === 'string') {
      values.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === 'object') {
      for (const item of Object.values(value)) {
        walk(item);
      }
    }
  };
  walk(entity.parameter || []);
  walk(entity.customEventFilter || []);
  return values;
}

function variableMatchesDataLayerName(variable, dataLayerVariableName) {
  return parameterValues(variable).includes(dataLayerVariableName);
}

function triggerMatchesEventName(trigger, eventName) {
  return parameterValues(trigger).includes(eventName);
}

function buildDataLayerVariablePayload(action) {
  const parameters = [
    {
      type: 'template',
      key: 'name',
      value: action.dataLayerVariableName
    }
  ];

  if (action.defaultValue !== undefined && action.defaultValue !== null && action.defaultValue !== '') {
    parameters.push(
      {
        type: 'boolean',
        key: 'setDefaultValue',
        value: 'true'
      },
      {
        type: 'template',
        key: 'defaultValue',
        value: String(action.defaultValue)
      }
    );
  }

  return {
    name: action.variableName,
    type: 'v',
    parameter: parameters
  };
}

function buildCustomEventTriggerPayload(action) {
  return {
    name: action.triggerName,
    type: 'customEvent',
    customEventFilter: [
      {
        type: 'equals',
        parameter: [
          {
            type: 'template',
            key: 'arg0',
            value: '{{_event}}'
          },
          {
            type: 'template',
            key: 'arg1',
            value: action.eventName
          }
        ]
      }
    ]
  };
}

async function listWorkspaceVariables(accessToken, workspacePath) {
  const data = await googleApiGet(`https://tagmanager.googleapis.com/tagmanager/v2/${workspacePath}/variables`, accessToken);
  return data.variable || [];
}

async function listWorkspaceTriggers(accessToken, workspacePath) {
  const data = await googleApiGet(`https://tagmanager.googleapis.com/tagmanager/v2/${workspacePath}/triggers`, accessToken);
  return data.trigger || [];
}

async function createWorkspaceVariable(accessToken, action) {
  return googleApiPost(
    `https://tagmanager.googleapis.com/tagmanager/v2/${action.workspacePath}/variables`,
    accessToken,
    buildDataLayerVariablePayload(action)
  );
}

async function createWorkspaceTrigger(accessToken, action) {
  return googleApiPost(
    `https://tagmanager.googleapis.com/tagmanager/v2/${action.workspacePath}/triggers`,
    accessToken,
    buildCustomEventTriggerPayload(action)
  );
}

async function runGtmControlledCreate(root, actions, policy) {
  const result = {
    generatedAt: new Date().toISOString(),
    mode: policy.mode,
    mutationPerformed: false,
    platform: 'gtm',
    status: 'not_executed',
    selectedActionCount: actions.length,
    createdActions: [],
    skippedExistingActions: [],
    failedActions: [],
    unsupportedActions: [],
    finalVerificationStatus: 'not_run',
    gtmPublished: false,
    gtmVersionCreated: false,
    mutationStatement: 'No GTM mutations were performed.'
  };

  if (!policy.executionEnabled) {
    result.disabledReason = policy.executionDisabledReason;
    result.mutationStatement = 'No GTM mutations were performed. GTM controlled create was not executed.';
    writeGtmCreateResult(root, result);
    return result;
  }

  let accessToken;
  try {
    accessToken = await getGoogleAccessToken();
  } catch (error) {
    result.status = 'failed';
    result.failedActions.push({
      action: 'oauth_refresh',
      status: 'failed',
      error: readableGoogleError(error)
    });
    result.mutationStatement = 'No GTM mutations were performed because OAuth token refresh failed before any create call.';
    writeGtmCreateResult(root, result);
    return result;
  }

  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index];
    const id = actionId(action, index);
    try {
      if (action.action === 'create_data_layer_variable') {
        if (RAW_CLICK_ID_KEYS.has(String(action.dataLayerVariableName || '').toLowerCase())) {
          result.unsupportedActions.push({
            actionId: id,
            action: action.action,
            variableName: action.variableName,
            dataLayerVariableName: action.dataLayerVariableName,
            status: 'blocked_unsupported',
            reason: 'Raw gclid/fbclid variables are blocked.'
          });
          continue;
        }

        const variables = await listWorkspaceVariables(accessToken, action.workspacePath);
        const match = variables.find((variable) =>
          variable.name === action.variableName ||
          variableMatchesDataLayerName(variable, action.dataLayerVariableName)
        );
        if (match) {
          result.skippedExistingActions.push({
            actionId: id,
            action: action.action,
            variableName: action.variableName,
            dataLayerVariableName: action.dataLayerVariableName,
            status: 'skipped_existing',
            resourceName: match.path || match.variableId || ''
          });
          continue;
        }

        const created = await createWorkspaceVariable(accessToken, action);
        result.createdActions.push({
          actionId: id,
          action: action.action,
          variableName: action.variableName,
          dataLayerVariableName: action.dataLayerVariableName,
          status: 'created',
          resourceName: created.path || created.variableId || ''
        });
        result.mutationPerformed = true;
        continue;
      }

      if (action.action === 'create_custom_event_trigger') {
        const triggers = await listWorkspaceTriggers(accessToken, action.workspacePath);
        const match = triggers.find((trigger) =>
          trigger.name === action.triggerName ||
          triggerMatchesEventName(trigger, action.eventName)
        );
        if (match) {
          result.skippedExistingActions.push({
            actionId: id,
            action: action.action,
            triggerName: action.triggerName,
            eventName: action.eventName,
            status: 'skipped_existing',
            resourceName: match.path || match.triggerId || ''
          });
          continue;
        }

        const created = await createWorkspaceTrigger(accessToken, action);
        result.createdActions.push({
          actionId: id,
          action: action.action,
          triggerName: action.triggerName,
          eventName: action.eventName,
          status: 'created',
          resourceName: created.path || created.triggerId || ''
        });
        result.mutationPerformed = true;
        continue;
      }

      result.unsupportedActions.push({
        actionId: id,
        action: action.action,
        status: 'blocked_unsupported',
        reason: 'Only create_data_layer_variable and create_custom_event_trigger are implemented for GTM Phase 2F.'
      });
    } catch (error) {
      result.failedActions.push({
        actionId: id,
        action: action.action,
        variableName: action.variableName,
        triggerName: action.triggerName,
        dataLayerVariableName: action.dataLayerVariableName,
        eventName: action.eventName,
        status: 'failed',
        error: readableGoogleError(error)
      });
      break;
    }
  }

  if (result.failedActions.length) {
    result.status = result.createdActions.length || result.skippedExistingActions.length ? 'partial' : 'failed';
  } else if (result.createdActions.length || result.skippedExistingActions.length) {
    result.status = 'executed';
  }

  try {
    const verification = await runGtmCheck();
    result.finalVerificationStatus = verification.liveApiChecked ? verification.status : 'not_verified';
  } catch (error) {
    result.finalVerificationStatus = `verification_failed: ${readableGoogleError(error)}`;
  }

  result.mutationStatement = result.mutationPerformed
    ? 'GTM controlled create executed selected approved workspace actions. No GTM version was created, no GTM container was published, and no Google Ads or Meta mutations were performed.'
    : 'No GTM mutations were performed; selected actions were skipped, unsupported, or failed before create.';
  writeGtmCreateResult(root, result);
  return result;
}

module.exports = {
  buildGtmExecutionPreviews,
  runGtmControlledCreate
};
