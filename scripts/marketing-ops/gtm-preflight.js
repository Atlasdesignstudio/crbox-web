'use strict';

const fs = require('fs');
const path = require('path');
const { EXPECTED } = require('./config');
const { envValue, maskSecretsInText } = require('./utils');
const {
  getGoogleAccessToken,
  getGoogleTokenInfo,
  googleApiGet,
  readableGoogleError
} = require('./google-auth');
const { actionId, validateDryRunPlan } = require('./apply/apply-validator');

const GTM_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/tagmanager.edit.containers';
const RELEVANT_GTM_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/tagmanager.readonly',
  REQUIRED_SCOPE
]);
const ALLOWED_ACTIONS = Object.freeze(new Set([
  'create_data_layer_variable',
  'create_custom_event_trigger'
]));
const RAW_CLICK_IDS = Object.freeze(new Set(['gclid', 'fbclid']));

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
      Object.values(value).forEach(walk);
    }
  };
  walk(entity.parameter || []);
  walk(entity.customEventFilter || []);
  return values;
}

function resourceIdentity(entity) {
  return entity.path || entity.variableId || entity.triggerId || entity.name || '';
}

function summarizeMatches(matches) {
  return matches.map((item) => ({
    name: item.name || '',
    resource: resourceIdentity(item)
  }));
}

function chooseWorkspace(workspaces, plannedWorkspacePath) {
  return workspaces.find((workspace) => workspace.path === plannedWorkspacePath)
    || workspaces.find((workspace) => /default/i.test(workspace.name || ''))
    || workspaces[0]
    || null;
}

function plannedWorkspacePath(validation) {
  const action = validation.gtmActions.find((item) => item.workspacePath);
  return action ? action.workspacePath : '';
}

function classifyVariable(action, index, variables, readable) {
  const id = actionId(action, index);
  const key = String(action.dataLayerVariableName || '');
  const nameMatches = readable
    ? variables.filter((variable) => variable.name === action.variableName)
    : [];
  const keyMatches = readable
    ? variables.filter((variable) => parameterValues(variable).includes(key))
    : [];
  const sharedResources = new Set(nameMatches.map(resourceIdentity));
  const exactMatches = keyMatches.filter((item) => sharedResources.has(resourceIdentity(item)));
  const unsafe = RAW_CLICK_IDS.has(key.toLowerCase());
  let status = 'would_create';
  let notes = 'No existing GTM variable matched the intended name or Data Layer Variable key.';

  if (unsafe) {
    status = 'blocked';
    notes = `Raw ${key} variables are prohibited. Only boolean presence flags are approved.`;
  } else if (!readable) {
    status = 'unknown_due_to_read_error';
    notes = 'Current GTM variables could not be read, so duplicate state is unknown.';
  } else if (
    nameMatches.length > 1
    || keyMatches.length > 1
    || (nameMatches.length > 0 && exactMatches.length === 0)
  ) {
    status = 'duplicate_risk';
    notes = 'Existing GTM variables conflict by intended name or Data Layer Variable key and require human review.';
  } else if (exactMatches.length > 0) {
    status = 'already_exists';
    notes = 'An existing GTM variable matches both the intended name and Data Layer Variable key.';
  } else if (keyMatches.length === 1) {
    status = 'already_exists';
    notes = 'The Data Layer Variable key already exists under a different GTM variable name.';
  }

  return {
    actionId: id,
    action: action.action,
    platform: action.platform,
    intendedName: action.variableName || '',
    dataLayerVariableName: key,
    status,
    duplicateMatches: {
      byName: summarizeMatches(nameMatches),
      byDataLayerKey: summarizeMatches(keyMatches),
      byEventName: []
    },
    riskLevel: action.riskLevel || 'unknown',
    notes
  };
}

function classifyTrigger(action, index, triggers, readable) {
  const id = actionId(action, index);
  const eventName = String(action.eventName || '');
  const nameMatches = readable
    ? triggers.filter((trigger) => trigger.name === action.triggerName)
    : [];
  const eventMatches = readable
    ? triggers.filter((trigger) => parameterValues(trigger).includes(eventName))
    : [];
  const sharedResources = new Set(nameMatches.map(resourceIdentity));
  const exactMatches = eventMatches.filter((item) => sharedResources.has(resourceIdentity(item)));
  let status = 'would_create';
  let notes = 'No existing GTM trigger matched the intended name or Custom Event name.';

  if (!readable) {
    status = 'unknown_due_to_read_error';
    notes = 'Current GTM triggers could not be read, so duplicate state is unknown.';
  } else if (
    nameMatches.length > 1
    || eventMatches.length > 1
    || (nameMatches.length > 0 && exactMatches.length === 0)
  ) {
    status = 'duplicate_risk';
    notes = 'Existing GTM triggers conflict by intended name or Custom Event name and require human review.';
  } else if (exactMatches.length > 0) {
    status = 'already_exists';
    notes = 'An existing GTM trigger matches both the intended name and Custom Event name.';
  } else if (eventMatches.length === 1) {
    status = 'already_exists';
    notes = 'The Custom Event trigger already exists under a different GTM trigger name.';
  }

  return {
    actionId: id,
    action: action.action,
    platform: action.platform,
    intendedName: action.triggerName || '',
    eventName,
    status,
    duplicateMatches: {
      byName: summarizeMatches(nameMatches),
      byDataLayerKey: [],
      byEventName: summarizeMatches(eventMatches)
    },
    riskLevel: action.riskLevel || 'unknown',
    notes
  };
}

function classifyUnsafeAction(action, index) {
  return {
    actionId: actionId(action, index),
    action: action.action || 'unknown',
    platform: action.platform || 'unknown',
    intendedName: action.variableName || action.triggerName || '',
    dataLayerVariableName: action.dataLayerVariableName || '',
    eventName: action.eventName || '',
    status: 'blocked',
    duplicateMatches: {
      byName: [],
      byDataLayerKey: [],
      byEventName: []
    },
    riskLevel: action.riskLevel || 'unknown',
    notes: 'Action is not in the GTM preflight allowlist.'
  };
}

function buildCounts(items) {
  return {
    total: items.length,
    alreadyExists: items.filter((item) => item.status === 'already_exists').length,
    wouldCreate: items.filter((item) => item.status === 'would_create').length,
    duplicateRisk: items.filter((item) => item.status === 'duplicate_risk').length,
    blocked: items.filter((item) => item.status === 'blocked').length,
    unknown: items.filter((item) => item.status === 'unknown_due_to_read_error').length
  };
}

function buildRecommendation(report) {
  const reasons = [];
  if (report.oauth.requiredScopeStatus !== 'available') {
    reasons.push(`Required GTM edit scope status is ${report.oauth.requiredScopeStatus}.`);
  }
  if (!report.workspace.workspaceReadable) reasons.push('GTM workspace is not readable.');
  if (!report.workspace.variablesReadable) reasons.push('GTM variables are not readable.');
  if (!report.workspace.triggersReadable) reasons.push('GTM triggers are not readable.');
  if (!report.planValidation.ok) reasons.push('Dry-run plan validation failed.');
  if (report.futureActions.duplicateRisk > 0) reasons.push('Duplicate risks require human review.');
  if (report.futureActions.blocked > 0) reasons.push('Unsafe or non-allowlisted proposed actions are blocked.');
  if (!report.gtmCreateDefaultDisabled) reasons.push('MARKETING_AGENT_GTM_CREATE_ENABLED is not false by default.');

  if (reasons.length) {
    return {
      readyForFutureControlledCreate: false,
      reason: reasons.join(' ')
    };
  }

  return {
    readyForFutureControlledCreate: true,
    reason: 'Ready for human review before future controlled create. This is not approval for automatic execution or GTM publishing.'
  };
}

function markdownTable(items) {
  if (!items.length) return '- No GTM proposed actions were available for preflight.';
  const lines = [
    '| Action ID | Intended name | Key / event | Status | Risk | Notes |',
    '|---|---|---|---|---|---|'
  ];
  for (const item of items) {
    const subject = item.dataLayerVariableName || item.eventName || '';
    lines.push(`| \`${item.actionId}\` | ${item.intendedName} | \`${subject}\` | **${item.status}** | ${item.riskLevel} | ${item.notes.replace(/\|/g, '\\|')} |`);
  }
  return lines.join('\n');
}

function buildMarkdown(report) {
  return [
    '# CRBOX Marketing Ops GTM Pre-flight',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Phase: **2G**',
    '',
    'Mode: **read_only**',
    '',
    '## Summary',
    '',
    `- Plan validation passed: ${report.planValidation.ok}`,
    `- GTM workspace readable: ${report.workspace.workspaceReadable}`,
    `- GTM variables readable: ${report.workspace.variablesReadable}`,
    `- GTM triggers readable: ${report.workspace.triggersReadable}`,
    `- Required OAuth scope status: ${report.oauth.requiredScopeStatus}`,
    `- Future GTM actions checked: ${report.futureActions.total}`,
    `- Already existing: ${report.futureActions.alreadyExists}`,
    `- Would create later: ${report.futureActions.wouldCreate}`,
    `- Duplicate risk: ${report.futureActions.duplicateRisk}`,
    `- Blocked: ${report.futureActions.blocked}`,
    `- Unknown due to read error: ${report.futureActions.unknown}`,
    '',
    '## Workspace Read Status',
    '',
    `- Account ID present: ${report.workspace.accountIdPresent}`,
    `- Container ID present: ${report.workspace.containerIdPresent}`,
    `- Account readable: ${report.workspace.accountReadable}`,
    `- Container readable: ${report.workspace.containerReadable}`,
    `- Workspace path present: ${report.workspace.workspacePathPresent}`,
    `- Workspace readable: ${report.workspace.workspaceReadable}`,
    `- Variables readable: ${report.workspace.variablesReadable}`,
    `- Triggers readable: ${report.workspace.triggersReadable}`,
    `- Workspace: ${report.workspace.name || '(not available)'}`,
    '',
    '## OAuth Scope Status',
    '',
    `- Check method: \`${report.oauth.scopeCheckMethod}\``,
    `- Required scope: \`${report.oauth.requiredScope}\``,
    `- Status: **${report.oauth.requiredScopeStatus}**`,
    `- Available relevant scopes: ${report.oauth.availableRelevantScopes.length ? report.oauth.availableRelevantScopes.map((scope) => `\`${scope}\``).join(', ') : 'None detected.'}`,
    `- Missing relevant scopes: ${report.oauth.missingRelevantScopes.length ? report.oauth.missingRelevantScopes.map((scope) => `\`${scope}\``).join(', ') : 'None detected.'}`,
    `- Notes: ${report.oauth.notes}`,
    '',
    '## Future GTM Actions',
    '',
    markdownTable(report.futureActions.items),
    '',
    '## Duplicate Risk Summary',
    '',
    report.futureActions.duplicateRisk
      ? `- ${report.futureActions.duplicateRisk} action(s) require duplicate review. See matching resources in the JSON artifact.`
      : '- No duplicate risks detected.',
    '',
    '## Plan Safety',
    '',
    `- Plan blocked-action records: ${report.planValidation.blockedActionsCount}`,
    `- Unsafe proposed actions blocked by preflight: ${report.futureActions.blocked}`,
    '- GTM tag creation remains blocked.',
    '- GTM version creation remains blocked.',
    '- GTM publishing remains blocked.',
    '- Raw `gclid` and raw `fbclid` variables remain blocked.',
    '',
    '## Safety Assertions',
    '',
    ...Object.entries(report.safety).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Recommendation',
    '',
    `- Ready for future controlled create: **${report.recommendation.readyForFutureControlledCreate}**`,
    `- Reason: ${report.recommendation.reason}`,
    '',
    '## Mutation Statement',
    '',
    'No GTM write calls were made. No variables, triggers, tags, versions, or publishes were created in this phase.'
  ].join('\n') + '\n';
}

function writePreflight(root, report) {
  const jsonPath = path.join(root, 'docs', 'marketing-ops-gtm-preflight.json');
  const markdownPath = path.join(root, 'docs', 'marketing-ops-gtm-preflight.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(markdownPath, buildMarkdown(report), 'utf8');
  return { jsonPath, markdownPath };
}

function readPreflight(root) {
  const jsonPath = path.join(root, 'docs', 'marketing-ops-gtm-preflight.json');
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (_error) {
    return null;
  }
}

async function runGtmPreflight(root) {
  const validation = validateDryRunPlan(root);
  const accountId = envValue('GTM_ACCOUNT_ID');
  const containerId = envValue('GTM_CONTAINER_ID') || EXPECTED.gtmContainerId;
  const report = {
    generatedAt: new Date().toISOString(),
    phase: '2G',
    mode: 'read_only',
    mutationPerformed: false,
    gtmWriteCallsMade: false,
    gtmVersionsCreated: false,
    gtmPublished: false,
    gtmCreateDefaultDisabled: true,
    workspace: {
      accountIdPresent: Boolean(accountId),
      containerIdPresent: Boolean(containerId),
      accountReadable: false,
      containerReadable: false,
      workspacePathPresent: Boolean(plannedWorkspacePath(validation)),
      workspaceReadable: false,
      variablesReadable: false,
      triggersReadable: false,
      name: '',
      workspaceId: '',
      workspacePath: plannedWorkspacePath(validation)
    },
    oauth: {
      scopeCheckMethod: 'not_directly_available',
      requiredScope: REQUIRED_SCOPE,
      requiredScopeStatus: 'unknown',
      availableRelevantScopes: [],
      missingRelevantScopes: [],
      notes: 'Could not directly inspect OAuth scopes without exposing token details. Read-only GTM access was tested through list endpoints only.'
    },
    planValidation: {
      ok: validation.ok,
      errors: validation.errors || [],
      blockedActionsCount: validation.blockedActions.length
    },
    futureActions: {
      total: 0,
      alreadyExists: 0,
      wouldCreate: 0,
      duplicateRisk: 0,
      blocked: 0,
      unknown: 0,
      items: []
    },
    safety: {
      gtmWriteCallsMade: false,
      gtmVariablesCreated: false,
      gtmTriggersCreated: false,
      gtmTagsCreated: false,
      gtmVersionsCreated: false,
      gtmPublished: false,
      googleAdsTouched: false,
      metaTouched: false,
      websiteRuntimeFilesTouched: false,
      secretsPrinted: false
    },
    recommendation: {
      readyForFutureControlledCreate: false,
      reason: 'Preflight has not completed.'
    },
    errors: []
  };

  const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  report.gtmCreateDefaultDisabled = /^MARKETING_AGENT_GTM_CREATE_ENABLED=false$/m.test(envExample);

  let accessToken = '';
  let variables = [];
  let triggers = [];

  try {
    accessToken = await getGoogleAccessToken();
    try {
      const tokenInfo = await getGoogleTokenInfo(accessToken);
      const scopes = String(tokenInfo.scope || '').split(/\s+/).filter(Boolean);
      const availableRelevantScopes = RELEVANT_GTM_SCOPES.filter((scope) => scopes.includes(scope));
      const missingRelevantScopes = RELEVANT_GTM_SCOPES.filter((scope) => !scopes.includes(scope));
      report.oauth = {
        scopeCheckMethod: 'google_oauth_tokeninfo',
        requiredScope: REQUIRED_SCOPE,
        requiredScopeStatus: scopes.includes(REQUIRED_SCOPE) ? 'available' : 'missing',
        availableRelevantScopes,
        missingRelevantScopes,
        notes: scopes.includes(REQUIRED_SCOPE)
          ? 'Google token info confirmed the required GTM container edit scope. No token value was logged or written.'
          : 'Google token info was readable, but the required GTM container edit scope was not listed. No token value was logged or written.'
      };
    } catch (error) {
      report.oauth.notes = `Direct scope inspection was unavailable: ${readableGoogleError(error)} Read-only GTM access was tested through list endpoints only.`;
    }

    const account = await googleApiGet(`${GTM_BASE}/accounts/${accountId}`, accessToken);
    report.workspace.accountReadable = Boolean(account && account.path);
    const containersData = await googleApiGet(`${GTM_BASE}/${account.path}/containers`, accessToken);
    const containers = containersData.container || [];
    const container = containers.find((item) =>
      item.containerId === containerId
      || item.publicId === containerId
      || item.name === containerId
    );

    if (!container) {
      throw new Error('Configured GTM container was not found in the read-only container list.');
    }
    report.workspace.containerReadable = true;

    const workspacesData = await googleApiGet(`${GTM_BASE}/${container.path}/workspaces`, accessToken);
    const workspaces = workspacesData.workspace || [];
    const workspace = chooseWorkspace(workspaces, plannedWorkspacePath(validation));
    report.workspace.workspaceReadable = Boolean(workspace);
    if (workspace) {
      report.workspace.name = workspace.name || '';
      report.workspace.workspaceId = workspace.workspaceId || '';
      report.workspace.workspacePath = workspace.path || '';
      report.workspace.workspacePathPresent = Boolean(workspace.path);

      try {
        const variablesData = await googleApiGet(`${GTM_BASE}/${workspace.path}/variables`, accessToken);
        variables = variablesData.variable || [];
        report.workspace.variablesReadable = true;
      } catch (error) {
        report.errors.push(`GTM variables read failed: ${readableGoogleError(error)}`);
      }

      try {
        const triggersData = await googleApiGet(`${GTM_BASE}/${workspace.path}/triggers`, accessToken);
        triggers = triggersData.trigger || [];
        report.workspace.triggersReadable = true;
      } catch (error) {
        report.errors.push(`GTM triggers read failed: ${readableGoogleError(error)}`);
      }
    }
  } catch (error) {
    report.errors.push(`GTM workspace read failed: ${readableGoogleError(error)}`);
  }

  const actions = validation.gtmActions || [];
  const items = actions.map((action, index) => {
    if (action.platform !== 'gtm' || !ALLOWED_ACTIONS.has(action.action)) {
      return classifyUnsafeAction(action, index);
    }
    if (action.action === 'create_data_layer_variable') {
      return classifyVariable(action, index, variables, report.workspace.variablesReadable);
    }
    return classifyTrigger(action, index, triggers, report.workspace.triggersReadable);
  });
  report.futureActions = {
    ...buildCounts(items),
    items
  };
  report.recommendation = buildRecommendation(report);

  const paths = writePreflight(root, report);
  return { report, paths };
}

function printPreflightSummary(report, paths) {
  return [
    'GTM pre-flight: COMPLETE',
    `- Mode: ${report.mode}`,
    `- Plan validation: ${report.planValidation.ok ? 'PASS' : 'FAIL'}`,
    `- Workspace readable: ${report.workspace.workspaceReadable}`,
    `- Variables readable: ${report.workspace.variablesReadable}`,
    `- Triggers readable: ${report.workspace.triggersReadable}`,
    `- Required scope status: ${report.oauth.requiredScopeStatus}`,
    `- Future actions checked: ${report.futureActions.total}`,
    `- Already existing: ${report.futureActions.alreadyExists}`,
    `- Would create later: ${report.futureActions.wouldCreate}`,
    `- Duplicate risk: ${report.futureActions.duplicateRisk}`,
    `- Blocked: ${report.futureActions.blocked}`,
    `- Recommendation ready: ${report.recommendation.readyForFutureControlledCreate}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    'No GTM write calls were made. No variables, triggers, tags, versions, or publishes were created in this phase.'
  ].map(maskSecretsInText);
}

module.exports = {
  REQUIRED_SCOPE,
  buildMarkdown,
  readPreflight,
  runGtmPreflight,
  printPreflightSummary
};
