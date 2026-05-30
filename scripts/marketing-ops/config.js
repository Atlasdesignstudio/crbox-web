'use strict';

const path = require('path');

const EXPECTED = Object.freeze({
  ga4MeasurementId: 'G-B5BPHFRR18',
  gtmContainerId: 'GTM-5WD8N53F',
  domain: 'https://crbox.cr',
  mode: 'read_only'
});

const REPO_CHECK_FILES = Object.freeze([
  'docs/paid-media-launch-gate-phase-1.md',
  'docs/tracking-plan.md',
  'docs/analytics-taxonomy.md',
  'docs/measurement-guide.md',
  'docs/measurement-map-v1.md',
  'docs/gtm-container-export.json',
  'gtm.config.json',
  'js/analytics.js'
]);

const REQUIRED_ENV = Object.freeze({
  ga4: [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GA4_PROPERTY_ID',
    'GA4_MEASUREMENT_ID'
  ],
  gtm: [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GTM_ACCOUNT_ID',
    'GTM_CONTAINER_ID'
  ],
  googleAds: [
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
    'GOOGLE_ADS_LOGIN_CUSTOMER_ID'
  ],
  meta: [
    'META_APP_ID',
    'META_APP_SECRET',
    'META_ACCESS_TOKEN',
    'META_BUSINESS_ID',
    'META_AD_ACCOUNT_ID',
    'META_PIXEL_ID'
  ],
  shared: [
    'CRBOX_DOMAIN',
    'MARKETING_AGENT_MODE'
  ]
});

const EXPECTED_EVENTS = Object.freeze([
  'signup_success',
  'quote_request_submit_success',
  'contact_form_submit_success',
  'calculator_result',
  'whatsapp_click',
  'quote_request_start',
  'invoice_upload_success'
]);

const FUTURE_CHECKS = Object.freeze({
  ga4: [
    'Property exists and is accessible',
    'Web stream exists',
    'Measurement ID matches G-B5BPHFRR18',
    'Required custom dimensions exist',
    'Key events are marked as conversions/key events',
    'Event names align with the tracking taxonomy'
  ],
  gtm: [
    'Account exists',
    'Container exists',
    'Workspace exists or can be created later',
    'GA4 configuration tag exists',
    'Data Layer Variables exist for approved event parameters',
    'Triggers exist for approved CRBOX events',
    'Meta Pixel base/event tags exist or are planned',
    'Raw gclid/fbclid is not exposed through GTM variables unless explicitly approved'
  ],
  googleAds: [
    'Customer ID is accessible',
    'GA4 imported conversions exist',
    'Conversion action names match planned CRBOX events',
    'Auto-tagging status can be read',
    'No campaign changes are made by this agent'
  ],
  meta: [
    'Business is accessible',
    'Ad account is accessible',
    'Pixel exists',
    'Domain verification status can be read',
    'AEM/event priority can be reviewed manually or through the API if available',
    'No audience/customer data is uploaded by this agent'
  ]
});

function repoRoot() {
  return path.resolve(__dirname, '..', '..');
}

module.exports = {
  EXPECTED,
  REPO_CHECK_FILES,
  REQUIRED_ENV,
  EXPECTED_EVENTS,
  FUTURE_CHECKS,
  repoRoot
};
