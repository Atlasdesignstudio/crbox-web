'use strict';

const { EXPECTED, FUTURE_CHECKS, REQUIRED_ENV } = require('../config');
const { envValue, makeCheck, makeSkipped, missingEnv } = require('../utils');
const { getGoogleAccessToken, googleApiGet, readableGoogleError } = require('../google-auth');

const REQUIRED_DLVS = Object.freeze([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid_present',
  'fbclid_present',
  'attribution_touch'
]);

const REQUIRED_TRIGGERS = Object.freeze([
  'signup_success',
  'quote_request_submit_success',
  'contact_form_submit_success',
  'calculator_result',
  'whatsapp_click',
  'quote_request_start'
]);

const GTM_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

function resultStatus(checks, missing) {
  if (missing.length > 0) return 'skipped';
  if (checks.some((check) => check.status === 'warn')) return 'warn';
  if (checks.some((check) => check.status === 'skipped')) return 'warn';
  return 'pass';
}

function accountPath(accountId) {
  return `accounts/${String(accountId || '').trim()}`;
}

function parameterValues(entity) {
  const values = [];
  const walk = (value) => {
    if (value == null) return;
    if (typeof value === 'string') {
      values.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === 'object') {
      for (const item of Object.values(value)) {
        walk(item);
      }
    }
  };
  walk(entity.parameter || []);
  return values;
}

function lowerText(entity) {
  return [
    entity.name || '',
    entity.type || '',
    ...parameterValues(entity)
  ].join(' ').toLowerCase();
}

function variableMatchesDataLayerKey(variable, key) {
  const values = parameterValues(variable);
  return values.includes(key) || String(variable.name || '').toLowerCase().includes(key.toLowerCase());
}

function triggerMatchesEvent(trigger, eventName) {
  const values = parameterValues(trigger);
  return values.includes(eventName) || String(trigger.name || '').toLowerCase().includes(eventName.toLowerCase());
}

function chooseWorkspace(workspaces) {
  return workspaces.find((workspace) => /default/i.test(workspace.name || '')) || workspaces[0] || null;
}

async function resolveContainer(accessToken, account, configuredContainerId) {
  const accountContainers = await googleApiGet(`${GTM_BASE}/${account.path}/containers`, accessToken);
  const containers = accountContainers.container || [];
  const configured = String(configuredContainerId || '').trim();
  const container = containers.find((candidate) =>
    candidate.containerId === configured ||
    candidate.publicId === configured ||
    candidate.name === configured
  );
  return {
    containers,
    container
  };
}

async function runGtmCheck() {
  const required = REQUIRED_ENV.gtm;
  const missing = missingEnv(required);
  const containerId = envValue('GTM_CONTAINER_ID') || EXPECTED.gtmContainerId;
  const accountId = envValue('GTM_ACCOUNT_ID');
  const checks = [
    makeCheck(
      'gtm-env-container-id',
      'GTM container ID is configured',
      Boolean(containerId),
      /^\d+$/.test(containerId)
        ? 'Configured as numeric GTM API containerId; public ID will be verified after read-only container lookup.'
        : `Configured public ID: ${containerId || '(missing)'}`
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
    try {
      const accessToken = await getGoogleAccessToken();
      const account = await googleApiGet(`${GTM_BASE}/${accountPath(accountId)}`, accessToken);
      checks.push(makeCheck(
        'gtm-account-accessible',
        'GTM account is accessible',
        Boolean(account && account.path),
        `Read-only get succeeded for ${accountPath(accountId)}.`
      ));

      const { containers, container } = await resolveContainer(accessToken, account, containerId);
      checks.push(makeCheck(
        'gtm-container-accessible',
        'GTM container is accessible',
        Boolean(container && container.path),
        container
          ? `Found container by read-only list call using configured ID/public ID.`
          : `No listed container matched configured GTM_CONTAINER_ID. Containers visible: ${containers.length}.`
      ));
      if (container) {
        checks.push(makeCheck(
          'gtm-container-public-id',
          `GTM container public ID matches ${EXPECTED.gtmContainerId}`,
          container.publicId === EXPECTED.gtmContainerId,
          container.publicId === EXPECTED.gtmContainerId
            ? `Read-only container lookup confirmed public ID ${EXPECTED.gtmContainerId}.`
            : `Read-only container lookup returned a different public ID.`
        ));
      }

      if (!container) {
        return {
          name: 'GTM checks',
          status: 'warn',
          checks,
          missingEnv: missing,
          missingDlvs: REQUIRED_DLVS.slice(),
          missingTriggers: REQUIRED_TRIGGERS.slice(),
          liveApiChecked: checks.some((check) => check.id === 'gtm-account-accessible' && check.status === 'pass'),
          futureChecks: FUTURE_CHECKS.gtm,
          notes: [
            'GTM checks use read-only API get/list endpoints only.',
            'No GTM variables, triggers, tags, workspaces, versions, or publications are created.',
            'No raw gclid/fbclid Data Layer Variables are approved or created by this checker.'
          ]
        };
      }

      const workspacesData = await googleApiGet(`${GTM_BASE}/${container.path}/workspaces`, accessToken);
      const workspaces = workspacesData.workspace || [];
      const workspace = chooseWorkspace(workspaces);
      checks.push(makeCheck(
        'gtm-workspaces-readable',
        'GTM workspaces are readable',
        workspaces.length > 0,
        workspace
          ? `Listed ${workspaces.length} workspace(s); using "${workspace.name || workspace.workspaceId}" for variable/trigger/tag checks.`
          : 'No workspaces returned by read-only list call.'
      ));

      if (!workspace) {
        return {
          name: 'GTM checks',
          status: 'warn',
          checks,
          missingEnv: missing,
          missingDlvs: REQUIRED_DLVS.slice(),
          missingTriggers: REQUIRED_TRIGGERS.slice(),
          liveApiChecked: checks.some((check) => check.id === 'gtm-account-accessible' && check.status === 'pass'),
          futureChecks: FUTURE_CHECKS.gtm,
          notes: [
            'GTM checks use read-only API get/list endpoints only.',
            'No GTM variables, triggers, tags, workspaces, versions, or publications are created.',
            'No raw gclid/fbclid Data Layer Variables are approved or created by this checker.'
          ]
        };
      }

      const [variablesData, triggersData, tagsData] = await Promise.all([
        googleApiGet(`${GTM_BASE}/${workspace.path}/variables`, accessToken),
        googleApiGet(`${GTM_BASE}/${workspace.path}/triggers`, accessToken),
        googleApiGet(`${GTM_BASE}/${workspace.path}/tags`, accessToken)
      ]);

      const variables = variablesData.variable || [];
      const triggers = triggersData.trigger || [];
      const tags = tagsData.tag || [];

      for (const key of REQUIRED_DLVS) {
        checks.push(makeCheck(
          `gtm-dlv:${key}`,
          `GTM Data Layer Variable for ${key} exists`,
          variables.some((variable) => variableMatchesDataLayerKey(variable, key)),
          variables.some((variable) => variableMatchesDataLayerKey(variable, key))
            ? 'Found by GTM API read-only variables list.'
            : 'Missing from GTM API read-only variables list.'
        ));
      }

      for (const eventName of REQUIRED_TRIGGERS) {
        checks.push(makeCheck(
          `gtm-trigger:${eventName}`,
          `GTM Custom Event trigger for ${eventName} exists`,
          triggers.some((trigger) => triggerMatchesEvent(trigger, eventName)),
          triggers.some((trigger) => triggerMatchesEvent(trigger, eventName))
            ? 'Found by GTM API read-only triggers list.'
            : 'Missing from GTM API read-only triggers list.'
        ));
      }

      const tagTexts = tags.map(lowerText);
      const ga4TagPresent = tagTexts.some((text) =>
        text.includes('ga4') || text.includes('google analytics') || text.includes(EXPECTED.ga4MeasurementId.toLowerCase())
      );
      const metaTagPresent = tagTexts.some((text) =>
        text.includes('meta') || text.includes('facebook') || text.includes('fbq') || text.includes('connect.facebook.net')
      );
      checks.push(makeCheck(
        'gtm-ga4-tags-present',
        'GTM GA4-related tags appear present',
        ga4TagPresent,
        ga4TagPresent ? `Found GA4-related signal in ${tags.length} listed tag(s).` : `No GA4-related signal found in ${tags.length} listed tag(s).`
      ));
      checks.push(makeCheck(
        'gtm-meta-tags-present',
        'GTM Meta-related tags appear present or planned',
        metaTagPresent,
        metaTagPresent ? `Found Meta-related signal in ${tags.length} listed tag(s).` : `No Meta-related signal found in ${tags.length} listed tag(s).`,
        { status: 'warn' }
      ));

      const rawClickIdVariables = variables.filter((variable) => {
        const text = lowerText(variable);
        const hasRawGclid = /\bgclid\b/.test(text) && !text.includes('gclid_present');
        const hasRawFbclid = /\bfbclid\b/.test(text) && !text.includes('fbclid_present');
        return hasRawGclid || hasRawFbclid;
      });
      checks.push(makeCheck(
        'gtm-raw-click-id-safety',
        'No GTM variable appears to expose raw gclid/fbclid',
        rawClickIdVariables.length === 0,
        rawClickIdVariables.length === 0
          ? 'No raw click ID variables detected by read-only variables list.'
          : `Potential raw click ID variable(s) detected: ${rawClickIdVariables.map((variable) => variable.name || variable.variableId).join(', ')}`
      ));
    } catch (error) {
      checks.push(makeSkipped(
        'gtm-platform-read',
        'GTM API read-only checks',
        `Not checked — ${readableGoogleError(error)}`,
        FUTURE_CHECKS.gtm
      ));
    }
  }

  const missingDlvs = REQUIRED_DLVS.filter((item) => {
    const check = checks.find((candidate) => candidate.id === `gtm-dlv:${item}`);
    return check && check.status === 'warn';
  });
  const missingTriggers = REQUIRED_TRIGGERS.filter((item) => {
    const check = checks.find((candidate) => candidate.id === `gtm-trigger:${item}`);
    return check && check.status === 'warn';
  });

  return {
    name: 'GTM checks',
    status: resultStatus(checks, missing),
    checks,
    missingEnv: missing,
    missingDlvs,
    missingTriggers,
    liveApiChecked: checks.some((check) => check.id === 'gtm-account-accessible' && check.status === 'pass'),
    futureChecks: FUTURE_CHECKS.gtm,
    notes: [
      'GTM checks use read-only API get/list endpoints only.',
      'No GTM variables, triggers, tags, workspaces, versions, or publications are created.',
      'No raw gclid/fbclid Data Layer Variables are approved or created by this checker.'
    ]
  };
}

module.exports = {
  runGtmCheck
};
