'use strict';

const { EXPECTED, FUTURE_CHECKS, REQUIRED_ENV } = require('../config');
const { envValue, makeCheck, makeSkipped, missingEnv } = require('../utils');
const { getGoogleAccessToken, googleApiGet, readableGoogleError } = require('../google-auth');

const REQUIRED_CUSTOM_DIMENSIONS = Object.freeze([
  'gclid_present',
  'fbclid_present',
  'attribution_touch',
  'utm_content',
  'utm_term'
]);

const REQUIRED_KEY_EVENTS = Object.freeze([
  'signup_success',
  'quote_request_submit_success'
]);

const ADMIN_BASE = 'https://analyticsadmin.googleapis.com/v1beta';

function resultStatus(checks, missing) {
  if (missing.length > 0) return 'skipped';
  if (checks.some((check) => check.status === 'warn')) return 'warn';
  if (checks.some((check) => check.status === 'skipped')) return 'warn';
  return 'pass';
}

function propertyResourceName(propertyId) {
  const value = String(propertyId || '').trim();
  return value.startsWith('properties/') ? value : `properties/${value}`;
}

function propertyPath(propertyId) {
  return encodeURI(propertyResourceName(propertyId));
}

function checkCollection(labelPrefix, requiredItems, foundItems, checkIdPrefix) {
  return requiredItems.map((item) => makeCheck(
    `${checkIdPrefix}:${item}`,
    `${labelPrefix} ${item} exists`,
    foundItems.has(item),
    foundItems.has(item) ? 'Found by GA4 Admin API read-only list call.' : 'Missing from GA4 Admin API read-only list response.'
  ));
}

async function listKeyEvents(accessToken, propPath) {
  const attempts = [
    {
      label: 'keyEvents',
      url: `${ADMIN_BASE}/${propPath}/keyEvents?pageSize=200`,
      field: 'keyEvents'
    },
    {
      label: 'conversionEvents',
      url: `${ADMIN_BASE}/${propPath}/conversionEvents?pageSize=200`,
      field: 'conversionEvents'
    }
  ];

  const errors = [];
  for (const attempt of attempts) {
    try {
      const data = await googleApiGet(attempt.url, accessToken);
      return {
        endpoint: attempt.label,
        items: data[attempt.field] || [],
        errors
      };
    } catch (error) {
      errors.push(`${attempt.label}: ${readableGoogleError(error)}`);
    }
  }

  return {
    endpoint: '',
    items: [],
    errors
  };
}

async function runGa4Check() {
  const required = REQUIRED_ENV.ga4;
  const missing = missingEnv(required);
  const measurementId = envValue('GA4_MEASUREMENT_ID') || EXPECTED.ga4MeasurementId;
  const propertyId = envValue('GA4_PROPERTY_ID');
  const checks = [
    makeCheck(
      'ga4-env-measurement-id',
      'GA4 measurement ID matches expected CRBOX value',
      measurementId === EXPECTED.ga4MeasurementId,
      `Expected ${EXPECTED.ga4MeasurementId}; received ${measurementId || '(missing)'}`
    )
  ];

  if (missing.length > 0) {
    checks.push(makeSkipped(
      'ga4-platform-read',
      'GA4 Admin API read-only checks',
      `Not checked — credentials missing: ${missing.join(', ')}`,
      FUTURE_CHECKS.ga4
    ));
  } else {
    const propPath = propertyPath(propertyId);
    try {
      const accessToken = await getGoogleAccessToken();

      const property = await googleApiGet(`${ADMIN_BASE}/${propPath}`, accessToken);
      checks.push(makeCheck(
        'ga4-property-accessible',
        'GA4 property is accessible',
        Boolean(property && property.name),
        `Read-only get succeeded for ${propertyResourceName(propertyId)}.`
      ));

      const streamsData = await googleApiGet(`${ADMIN_BASE}/${propPath}/dataStreams?pageSize=200`, accessToken);
      const streams = streamsData.dataStreams || [];
      const matchingWebStream = streams.find((stream) =>
        stream.type === 'WEB_DATA_STREAM' &&
        stream.webStreamData &&
        stream.webStreamData.measurementId === measurementId
      );
      checks.push(makeCheck(
        'ga4-web-stream-measurement-id',
        `GA4 web stream exists for ${EXPECTED.ga4MeasurementId}`,
        Boolean(matchingWebStream),
        matchingWebStream
          ? 'Found matching web data stream by read-only list call.'
          : `No web data stream matched ${EXPECTED.ga4MeasurementId} in read-only list response.`
      ));

      const dimensionsData = await googleApiGet(`${ADMIN_BASE}/${propPath}/customDimensions?pageSize=200`, accessToken);
      const dimensions = dimensionsData.customDimensions || [];
      const foundDimensions = new Set(
        dimensions
          .filter((dimension) => !dimension.scope || dimension.scope === 'EVENT')
          .map((dimension) => dimension.parameterName)
          .filter(Boolean)
      );
      checks.push(...checkCollection(
        'GA4 event-scoped custom dimension',
        REQUIRED_CUSTOM_DIMENSIONS,
        foundDimensions,
        'ga4-custom-dimension'
      ));

      const keyEventsResult = await listKeyEvents(accessToken, propPath);
      if (keyEventsResult.endpoint) {
        const foundEvents = new Set(
          keyEventsResult.items
            .map((item) => item.eventName)
            .filter(Boolean)
        );
        checks.push(makeCheck(
          'ga4-key-events-endpoint',
          'GA4 key event/conversion endpoint is readable',
          true,
          `Used read-only ${keyEventsResult.endpoint} endpoint.`
        ));
        checks.push(...checkCollection(
          'GA4 key event/conversion',
          REQUIRED_KEY_EVENTS,
          foundEvents,
          'ga4-key-event'
        ));
      } else {
        checks.push(makeSkipped(
          'ga4-key-events-endpoint',
          'GA4 key event/conversion checks',
          `Not checked — keyEvents/conversionEvents endpoints unavailable or permission-limited. ${keyEventsResult.errors.join(' | ')}`,
          REQUIRED_KEY_EVENTS
        ));
      }
    } catch (error) {
      checks.push(makeSkipped(
        'ga4-platform-read',
        'GA4 Admin API read-only checks',
        `Not checked — ${readableGoogleError(error)}`,
        FUTURE_CHECKS.ga4
      ));
    }
  }

  const missingCustomDimensions = REQUIRED_CUSTOM_DIMENSIONS.filter((item) => {
    const check = checks.find((candidate) => candidate.id === `ga4-custom-dimension:${item}`);
    return check && check.status === 'warn';
  });
  const missingKeyEvents = REQUIRED_KEY_EVENTS.filter((item) => {
    const check = checks.find((candidate) => candidate.id === `ga4-key-event:${item}`);
    return check && check.status === 'warn';
  });

  return {
    name: 'GA4 checks',
    status: resultStatus(checks, missing),
    checks,
    missingEnv: missing,
    missingCustomDimensions,
    missingKeyEvents,
    liveApiChecked: checks.some((check) => check.id === 'ga4-property-accessible' && check.status === 'pass'),
    futureChecks: FUTURE_CHECKS.ga4,
    notes: [
      'GA4 checks use read-only Admin API get/list endpoints only.',
      'No GA4 write endpoints are called.',
      'No custom dimensions, key events, properties, or streams are created or changed.'
    ]
  };
}

module.exports = {
  runGa4Check
};
