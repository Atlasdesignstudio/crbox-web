'use strict';

const { FUTURE_CHECKS, REQUIRED_ENV } = require('../config');
const { makeSkipped, missingEnv } = require('../utils');

function runMetaCheck() {
  const required = REQUIRED_ENV.meta;
  const missing = missingEnv(required);
  const checks = [];

  if (missing.length > 0) {
    checks.push(makeSkipped(
      'meta-platform-read',
      'Meta Marketing API read-only checks',
      `Not checked — credentials missing: ${missing.join(', ')}`,
      FUTURE_CHECKS.meta
    ));
  } else {
    checks.push(makeSkipped(
      'meta-platform-read',
      'Meta Marketing API read-only checks',
      'Credentials appear present, but this first version intentionally does not call Meta APIs. Future task can add read-only business/ad account/pixel validation here.',
      FUTURE_CHECKS.meta
    ));
  }

  return {
    name: 'Meta checks',
    status: missing.length > 0 ? 'skipped' : 'warn',
    checks,
    missingEnv: missing,
    futureChecks: FUTURE_CHECKS.meta,
    notes: [
      'No Meta pixels, events, campaigns, ad sets, ads, audiences, domains, or CAPI integrations are created.',
      'No audience or customer data is uploaded.'
    ]
  };
}

module.exports = {
  runMetaCheck
};
