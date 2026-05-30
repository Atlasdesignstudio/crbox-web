'use strict';

const { EXPECTED, FUTURE_CHECKS, REQUIRED_ENV } = require('../config');
const { envValue, makeCheck, makeSkipped, missingEnv } = require('../utils');

function runGtmCheck() {
  const required = REQUIRED_ENV.gtm;
  const missing = missingEnv(required);
  const containerId = envValue('GTM_CONTAINER_ID') || EXPECTED.gtmContainerId;
  const checks = [
    makeCheck(
      'gtm-env-container-id',
      'GTM container ID matches expected CRBOX value',
      containerId === EXPECTED.gtmContainerId,
      `Expected ${EXPECTED.gtmContainerId}; received ${containerId || '(missing)'}`
    )
  ];

  if (missing.length > 0) {
    checks.push(makeSkipped(
      'gtm-platform-read',
      'GTM API read-only checks',
      `Not checked — credentials missing: ${missing.join(', ')}`,
      FUTURE_CHECKS.gtm
    ));
  } else {
    checks.push(makeSkipped(
      'gtm-platform-read',
      'GTM API read-only checks',
      'Credentials appear present, but this first version intentionally does not call GTM APIs. Future task can add read-only container/workspace validation here.',
      FUTURE_CHECKS.gtm
    ));
  }

  return {
    name: 'GTM checks',
    status: missing.length > 0 ? 'skipped' : 'warn',
    checks,
    missingEnv: missing,
    futureChecks: FUTURE_CHECKS.gtm,
    notes: [
      'No GTM variables, triggers, tags, workspaces, versions, or publications are created.',
      'No raw gclid/fbclid Data Layer Variables are approved or created by this checker.'
    ]
  };
}

module.exports = {
  runGtmCheck
};
