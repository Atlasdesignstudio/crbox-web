'use strict';

const { actionId } = require('./apply-validator');

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

module.exports = {
  buildGa4ExecutionPreviews
};
