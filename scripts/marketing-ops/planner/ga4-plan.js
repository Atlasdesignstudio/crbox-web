'use strict';

const { EXPECTED } = require('../config');

const CUSTOM_DIMENSION_CONFIG = Object.freeze({
  gclid_present: {
    displayName: 'Click ID — Google present',
    description: 'Boolean flag indicating that a Google Ads click ID was present in the session. Raw gclid is not sent to GA4.',
    riskLevel: 'low'
  },
  fbclid_present: {
    displayName: 'Click ID — Meta present',
    description: 'Boolean flag indicating that a Meta click ID was present in the session. Raw fbclid is not sent to GA4.',
    riskLevel: 'low'
  },
  attribution_touch: {
    displayName: 'Attribution Touch',
    description: 'Indicates whether the event uses first-touch, last-touch, or both available session attribution.',
    riskLevel: 'low'
  },
  utm_content: {
    displayName: 'UTM Content',
    description: 'Campaign creative/content identifier captured from URL UTMs.',
    riskLevel: 'low'
  },
  utm_term: {
    displayName: 'UTM Term',
    description: 'Campaign keyword/search term identifier captured from URL UTMs.',
    riskLevel: 'low'
  }
});

const KEY_EVENT_CONFIG = Object.freeze({
  signup_success: {
    optimizationRole: 'primary_conversion',
    reason: 'Confirmed account registration success event; backend/API-gated and suitable for paid media optimization.',
    riskLevel: 'medium'
  },
  quote_request_submit_success: {
    optimizationRole: 'primary_conversion',
    reason: 'Confirmed quote request success event; suitable as a primary lead conversion.',
    riskLevel: 'medium'
  }
});

function propertyIdFromResult(ga4Result) {
  return ga4Result.propertyId || process.env.GA4_PROPERTY_ID || '';
}

function buildGa4Plan(ga4Result, options = {}) {
  const liveVerified = Boolean(ga4Result.liveApiChecked);
  const propertyId = propertyIdFromResult(ga4Result);
  const measurementId = ga4Result.measurementId || process.env.GA4_MEASUREMENT_ID || EXPECTED.ga4MeasurementId;
  const missingCustomDimensions = (ga4Result.missingCustomDimensions && ga4Result.missingCustomDimensions.length)
    ? ga4Result.missingCustomDimensions
    : (liveVerified ? [] : Object.keys(CUSTOM_DIMENSION_CONFIG));
  const missingKeyEvents = (ga4Result.missingKeyEvents && ga4Result.missingKeyEvents.length)
    ? ga4Result.missingKeyEvents
    : (liveVerified ? [] : Object.keys(KEY_EVENT_CONFIG));
  const proposedActions = [];
  const warnings = [];

  if (!liveVerified) {
    warnings.push('GA4 live state was not verified; proposed GA4 actions are expected from the tracking plan, not live-verified.');
  }

  if (options.include !== 'key_events') {
    for (const parameterName of missingCustomDimensions) {
      const config = CUSTOM_DIMENSION_CONFIG[parameterName];
      if (!config) continue;
      proposedActions.push({
        platform: 'ga4',
        action: 'create_custom_dimension',
        mode: 'dry_run',
        parameterName,
        displayName: config.displayName,
        scope: 'EVENT',
        description: config.description,
        propertyId,
        apiEndpointOrResourceType: `properties/${propertyId}/customDimensions`,
        riskLevel: config.riskLevel,
        reason: 'Parameter is present in CRBOX dataLayer attribution payloads but is not reportable until registered as an event-scoped custom dimension.',
        humanApprovalRequired: true,
        wouldMutate: true,
        executed: false,
        liveVerified
      });
    }
  }

  if (options.include !== 'custom_dimensions') {
    for (const eventName of missingKeyEvents) {
      const config = KEY_EVENT_CONFIG[eventName];
      if (!config) continue;
      proposedActions.push({
        platform: 'ga4',
        action: 'mark_key_event',
        mode: 'dry_run',
        eventName,
        propertyId,
        apiEndpointOrResourceType: `properties/${propertyId}/keyEvents`,
        riskLevel: config.riskLevel,
        reason: config.reason,
        optimizationRole: config.optimizationRole,
        humanApprovalRequired: true,
        wouldMutate: true,
        executed: false,
        liveVerified
      });
    }
  }

  return {
    propertyId,
    measurementId,
    liveVerified,
    proposedActions,
    notes: [
      'GA4 custom dimensions may take time to appear in reports.',
      'Registering event-scoped custom dimensions does not change event collection; it only makes parameters reportable.',
      'utm_source, utm_medium, and utm_campaign should not be created as custom dimensions because GA4 already has built-in acquisition dimensions.',
      'calculator_result and whatsapp_click are not proposed as primary conversion goals in this phase.',
      'No Google Ads conversions are created or imported in this phase.'
    ],
    warnings
  };
}

module.exports = {
  buildGa4Plan
};
