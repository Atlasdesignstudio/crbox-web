'use strict';

const { EXPECTED, EXPECTED_EVENTS, REPO_CHECK_FILES } = require('../config');
const { makeCheck, readTextIfExists, unique } = require('../utils');

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

function locationsFor(files, term) {
  return Object.entries(files)
    .filter(([, file]) => file.exists && file.content.includes(term))
    .map(([relativePath]) => relativePath);
}

function anyRegex(files, regex) {
  return Object.values(files).some((file) => file.exists && regex.test(file.content));
}

function runRepoCheck(root) {
  const files = {};
  for (const relativePath of REPO_CHECK_FILES) {
    files[relativePath] = readTextIfExists(root, relativePath);
  }

  const combined = Object.values(files)
    .filter((file) => file.exists)
    .map((file) => file.content)
    .join('\n');

  const analytics = files['js/analytics.js'];
  const paidMediaDoc = files['docs/paid-media-launch-gate-phase-1.md'];
  const runtimeFiles = {
    'js/analytics.js': files['js/analytics.js'],
    'gtm.config.json': files['gtm.config.json']
  };
  const checks = [];

  for (const relativePath of REPO_CHECK_FILES) {
    checks.push(makeCheck(
      `file:${relativePath}`,
      `${relativePath} exists`,
      files[relativePath].exists,
      files[relativePath].exists ? 'Found.' : 'Missing; static evidence from this file was not available.'
    ));
  }

  checks.push(makeCheck(
    'ga4-measurement-id',
    `GA4 Measurement ID ${EXPECTED.ga4MeasurementId} is referenced`,
    combined.includes(EXPECTED.ga4MeasurementId),
    `Found in: ${locationsFor(files, EXPECTED.ga4MeasurementId).join(', ') || 'none'}`
  ));

  checks.push(makeCheck(
    'gtm-container-id',
    `GTM Container ID ${EXPECTED.gtmContainerId} is referenced`,
    combined.includes(EXPECTED.gtmContainerId),
    `Found in: ${locationsFor(files, EXPECTED.gtmContainerId).join(', ') || 'none'}`
  ));

  for (const key of UTM_KEYS) {
    const found = locationsFor(files, key);
    checks.push(makeCheck(
      `utm:${key}`,
      `UTM parameter ${key} is referenced`,
      found.length > 0,
      `Found in: ${found.join(', ') || 'none'}`
    ));
  }

  for (const key of ['gclid', 'fbclid']) {
    const found = locationsFor(files, key);
    checks.push(makeCheck(
      `click-id:${key}`,
      `Click ID ${key} is referenced`,
      found.length > 0,
      `Found in: ${found.join(', ') || 'none'}`
    ));
  }

  checks.push(makeCheck(
    'crbox-track',
    'CRBOX.track references are present',
    combined.includes('CRBOX.track'),
    `Found in: ${locationsFor(files, 'CRBOX.track').join(', ') || 'none'}`
  ));

  checks.push(makeCheck(
    'data-layer',
    'dataLayer references are present',
    combined.includes('dataLayer'),
    `Found in: ${locationsFor(files, 'dataLayer').join(', ') || 'none'}`
  ));

  checks.push(makeCheck(
    'session-storage-attribution',
    'sessionStorage attribution persistence is referenced',
    combined.includes('sessionStorage') &&
      combined.includes('crbox_utm_first_touch') &&
      combined.includes('crbox_utm_last_touch'),
    'Looks for sessionStorage plus crbox_utm_first_touch and crbox_utm_last_touch.'
  ));

  const rawClickIdsStored = (
    (analytics.exists && analytics.content.includes("sessionStorage.setItem('crbox_' + k")) ||
    combined.includes('sessionStorage.crbox_gclid') ||
    combined.includes('sessionStorage.crbox_fbclid')
  );
  checks.push(makeCheck(
    'raw-click-ids-stored',
    'Raw gclid/fbclid storage is documented or implemented',
    rawClickIdsStored,
    'Static check only: looks for crbox_gclid/crbox_fbclid documentation or sessionStorage storage in js/analytics.js.'
  ));

  const rawNotPushedSignals = [
    'NEVER sent to GA4',
    'NEVER pushed to `dataLayer`',
    'never raw values',
    'never raw values.',
    'never raw values'
  ];
  const rawNotPushedDetected = rawNotPushedSignals.some((signal) => combined.includes(signal)) &&
    analytics.exists &&
    analytics.content.includes('gclid_present') &&
    analytics.content.includes('fbclid_present') &&
    !/payload\.gclid\s*=/.test(analytics.content) &&
    !/payload\.fbclid\s*=/.test(analytics.content);
  checks.push(makeCheck(
    'raw-click-ids-not-pushed',
    'Raw gclid/fbclid not pushed into dataLayer, if detectable',
    rawNotPushedDetected,
    'Conservative static check: requires documented safety wording, presence flags, and no direct payload.gclid/payload.fbclid assignment in js/analytics.js.'
  ));

  for (const eventName of EXPECTED_EVENTS) {
    const found = locationsFor(files, eventName);
    checks.push(makeCheck(
      `event:${eventName}`,
      `Paid-media event ${eventName} is referenced`,
      found.length > 0,
      `Found in: ${found.join(', ') || 'none'}`
    ));
  }

  checks.push(makeCheck(
    'no-direct-google-ads-conversion-static',
    'No direct Google Ads conversion call detected in runtime files',
    !anyRegex(runtimeFiles, /gtag\s*\(\s*['"]event['"]\s*,\s*['"]conversion['"]/),
    'Static repository check only; documentation examples are ignored and live GTM/Google Ads state is not checked.'
  ));

  checks.push(makeCheck(
    'no-meta-pixel-static',
    'No direct Meta Pixel call detected in runtime files',
    !anyRegex(runtimeFiles, /\bfbq\s*\(|connect\.facebook\.net/),
    'Static repository check only; documentation examples are ignored and live GTM/Meta state is not checked.'
  ));

  const missingFiles = Object.entries(files)
    .filter(([, file]) => !file.exists)
    .map(([relativePath]) => relativePath);

  return {
    name: 'Repository static checks',
    status: checks.some((check) => check.status === 'warn') ? 'warn' : 'pass',
    checks,
    missingFiles,
    inspectedFiles: unique(Object.keys(files)),
    notes: [
      'These checks inspect repository files only.',
      'They do not verify live GA4, GTM, Google Ads, or Meta platform state.',
      paidMediaDoc.exists
        ? 'Paid media Phase 1 document is available as the primary local launch-gate evidence.'
        : 'Paid media Phase 1 document was not found.'
    ]
  };
}

module.exports = {
  runRepoCheck
};
