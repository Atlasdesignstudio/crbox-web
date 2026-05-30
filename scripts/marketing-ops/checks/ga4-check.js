'use strict';

const { EXPECTED, FUTURE_CHECKS, REQUIRED_ENV } = require('../config');
const { envValue, makeCheck, makeSkipped, missingEnv } = require('../utils');

function runGa4Check() {
  const required = REQUIRED_ENV.ga4;
  const missing = missingEnv(required);
  const measurementId = envValue('GA4_MEASUREMENT_ID') || EXPECTED.ga4MeasurementId;
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
    checks.push(makeSkipped(
      'ga4-platform-read',
      'GA4 Admin API read-only checks',
      'Credentials appear present, but this first version intentionally does not call GA4 APIs. Future task can add read-only Admin API validation here.',
      FUTURE_CHECKS.ga4
    ));
  }

  return {
    name: 'GA4 checks',
    status: missing.length > 0 ? 'skipped' : 'warn',
    checks,
    missingEnv: missing,
    futureChecks: FUTURE_CHECKS.ga4,
    notes: [
      'No GA4 write endpoints are called.',
      'No custom dimensions, key events, properties, or streams are created or changed.'
    ]
  };
}

module.exports = {
  runGa4Check
};
