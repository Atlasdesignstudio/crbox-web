'use strict';

const { actionId } = require('./apply-validator');
const { getGoogleAccessToken, googleApiGet, googleApiPost, readableGoogleError } = require('../google-auth');
const { runGa4Check } = require('../checks/ga4-check');
const { writeGa4CreateResult } = require('./ga4-create-result');

const ADMIN_BASE = 'https://analyticsadmin.googleapis.com/v1beta';

function propertyResourceName(propertyId) {
  const value = String(propertyId || '').trim();
  return value.startsWith('properties/') ? value : `properties/${value}`;
}

function propertyPath(propertyId) {
  return encodeURI(propertyResourceName(propertyId));
}

function previewGa4Action(action, index) {
  if (action.action === 'create_custom_dimension') {
    return {
      actionId: actionId(action, index),
      platform: 'ga4',
      action: action.action,
      apiResourceType: action.apiEndpointOrResourceType,
      propertyId: action.propertyId,
      parameterName: action.parameterName,
      displayName: action.displayName,
      scope: action.scope,
      description: action.description,
      riskLevel: action.riskLevel,
      wouldCall: `properties/${action.propertyId}/customDimensions:create`,
      executed: false
    };
  }

  if (action.action === 'mark_key_event') {
    return {
      actionId: actionId(action, index),
      platform: 'ga4',
      action: action.action,
      apiResourceType: action.apiEndpointOrResourceType,
      propertyId: action.propertyId,
      eventName: action.eventName,
      riskLevel: action.riskLevel,
      wouldCall: `properties/${action.propertyId}/keyEvents:create or conversionEvents:create`,
      executed: false
    };
  }

  return {
    actionId: actionId(action, index),
    platform: 'ga4',
    action: action.action,
    wouldCall: 'unsupported',
    executed: false
  };
}

function buildGa4ExecutionPreviews(actions) {
  return actions.map(previewGa4Action);
}

async function listCustomDimensions(accessToken, propertyId) {
  const data = await googleApiGet(`${ADMIN_BASE}/${propertyPath(propertyId)}/customDimensions?pageSize=200`, accessToken);
  return data.customDimensions || [];
}

async function listKeyEvents(accessToken, propertyId) {
  const data = await googleApiGet(`${ADMIN_BASE}/${propertyPath(propertyId)}/keyEvents?pageSize=200`, accessToken);
  return data.keyEvents || [];
}

async function createCustomDimension(accessToken, action) {
  return googleApiPost(`${ADMIN_BASE}/${propertyPath(action.propertyId)}/customDimensions`, accessToken, {
    parameterName: action.parameterName,
    displayName: action.displayName,
    description: action.description,
    scope: action.scope || 'EVENT'
  });
}

async function createKeyEvent(accessToken, action) {
  return googleApiPost(`${ADMIN_BASE}/${propertyPath(action.propertyId)}/keyEvents`, accessToken, {
    eventName: action.eventName
  });
}

async function runGa4ControlledCreate(root, actions, policy) {
  const result = {
    generatedAt: new Date().toISOString(),
    mode: policy.mode,
    mutationPerformed: false,
    platform: 'ga4',
    status: 'not_executed',
    selectedActionCount: actions.length,
    createdActions: [],
    skippedExistingActions: [],
    failedActions: [],
    unsupportedActions: [],
    finalVerificationStatus: 'not_run',
    mutationStatement: 'No GA4 mutations were performed.'
  };

  if (!policy.executionEnabled) {
    result.disabledReason = policy.executionDisabledReason;
    result.mutationStatement = 'No GA4 mutations were performed. GA4 controlled create was not executed.';
    writeGa4CreateResult(root, result);
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
    result.mutationStatement = 'No GA4 mutations were performed because OAuth token refresh failed before any create call.';
    writeGa4CreateResult(root, result);
    return result;
  }

  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index];
    const id = actionId(action, index);
    try {
      if (action.action === 'create_custom_dimension') {
        const existing = await listCustomDimensions(accessToken, action.propertyId);
        const match = existing.find((dimension) => dimension.parameterName === action.parameterName);
        if (match) {
          result.skippedExistingActions.push({
            actionId: id,
            action: action.action,
            parameterName: action.parameterName,
            status: 'skipped_existing',
            resourceName: match.name || ''
          });
          continue;
        }

        const created = await createCustomDimension(accessToken, action);
        result.createdActions.push({
          actionId: id,
          action: action.action,
          parameterName: action.parameterName,
          status: 'created',
          resourceName: created.name || ''
        });
        result.mutationPerformed = true;
        continue;
      }

      if (action.action === 'mark_key_event') {
        const existing = await listKeyEvents(accessToken, action.propertyId);
        const match = existing.find((event) => event.eventName === action.eventName);
        if (match) {
          result.skippedExistingActions.push({
            actionId: id,
            action: action.action,
            eventName: action.eventName,
            status: 'skipped_existing',
            resourceName: match.name || ''
          });
          continue;
        }

        const created = await createKeyEvent(accessToken, action);
        result.createdActions.push({
          actionId: id,
          action: action.action,
          eventName: action.eventName,
          status: 'created',
          resourceName: created.name || ''
        });
        result.mutationPerformed = true;
        continue;
      }

      result.unsupportedActions.push({
        actionId: id,
        action: action.action,
        status: 'blocked_unsupported',
        reason: 'Only create_custom_dimension and mark_key_event are implemented for GA4 Phase 2D.'
      });
    } catch (error) {
      result.failedActions.push({
        actionId: id,
        action: action.action,
        parameterName: action.parameterName,
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
    const verification = await runGa4Check();
    result.finalVerificationStatus = verification.liveApiChecked ? verification.status : 'not_verified';
  } catch (error) {
    result.finalVerificationStatus = `verification_failed: ${readableGoogleError(error)}`;
  }

  result.mutationStatement = result.mutationPerformed
    ? 'GA4 controlled create executed selected approved actions. No GTM, Google Ads, or Meta mutations were performed.'
    : 'No GA4 mutations were performed; selected actions were skipped, unsupported, or failed before create.';
  writeGa4CreateResult(root, result);
  return result;
}

module.exports = {
  buildGa4ExecutionPreviews,
  runGa4ControlledCreate
};
