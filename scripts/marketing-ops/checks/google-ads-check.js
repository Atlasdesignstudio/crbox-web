'use strict';

const { FUTURE_CHECKS, REQUIRED_ENV } = require('../config');
const { makeSkipped, missingEnv } = require('../utils');

function runGoogleAdsCheck() {
  const required = REQUIRED_ENV.googleAds;
  const missing = missingEnv(required);
  const checks = [];

  if (missing.length > 0) {
    checks.push(makeSkipped(
      'google-ads-platform-read',
      'Google Ads API read-only checks',
      `Not checked — credentials missing: ${missing.join(', ')}`,
      FUTURE_CHECKS.googleAds
    ));
  } else {
    checks.push(makeSkipped(
      'google-ads-platform-read',
      'Google Ads API read-only checks',
      'Credentials appear present, but this first version intentionally does not call Google Ads APIs. Future task can add read-only customer/conversion validation here.',
      FUTURE_CHECKS.googleAds
    ));
  }

  return {
    name: 'Google Ads checks',
    status: missing.length > 0 ? 'skipped' : 'warn',
    checks,
    missingEnv: missing,
    futureChecks: FUTURE_CHECKS.googleAds,
    notes: [
      'No Google Ads conversions, campaigns, budgets, bidding settings, audiences, or assets are created or changed.',
      'No customer data uploads are performed.'
    ]
  };
}

module.exports = {
  runGoogleAdsCheck
};
