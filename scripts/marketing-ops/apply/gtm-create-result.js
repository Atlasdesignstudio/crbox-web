'use strict';

const fs = require('fs');
const path = require('path');

function resultPaths(root) {
  return {
    markdownPath: path.join(root, 'docs', 'marketing-ops-gtm-create-result.md'),
    jsonPath: path.join(root, 'docs', 'marketing-ops-gtm-create-result.json')
  };
}

function actionLines(actions) {
  if (!actions || actions.length === 0) return '- None.';
  return actions.map((action) => {
    const subject = action.variableName || action.triggerName || action.dataLayerVariableName || action.eventName || action.actionId || action.action || 'unknown';
    return `- ${subject} (${action.action || 'unknown'}): ${action.status || 'unknown'}`;
  }).join('\n');
}

function actionsByType(actions, actionType) {
  return (actions || []).filter((action) => action.action === actionType);
}

function buildGtmCreateResultMarkdown(result) {
  return [
    '# CRBOX Marketing Ops GTM Create Result',
    '',
    `Generated: ${result.generatedAt}`,
    '',
    `Phase: **${result.phase || '2J'}**`,
    '',
    `Mode: **${result.mode}**`,
    '',
    `Status: **${result.status}**`,
    '',
    `Platform: ${result.platform}`,
    `Mutation performed: ${result.mutationPerformed}`,
    `GTM write calls made: ${result.gtmWriteCallsMade}`,
    `GTM published: ${result.gtmPublished}`,
    `GTM version created: ${result.gtmVersionsCreated || result.gtmVersionCreated}`,
    `GTM variables created: ${result.createdVariables || 0}`,
    `GTM triggers created: ${result.createdTriggers || 0}`,
    `GTM tags created: ${result.createdTags || 0}`,
    `Stopped on error: ${result.stoppedOnError}`,
    `Selected actions: ${result.selectedActionCount}`,
    '',
    '## Execution Command',
    '',
    `\`${result.executionCommand || 'Not recorded.'}\``,
    '',
    '## Pre-execution Verification',
    '',
    `- Passed: ${result.preExecutionVerification ? result.preExecutionVerification.passed : 'not recorded'}`,
    `- Approved actions: ${result.preExecutionVerification ? result.preExecutionVerification.approvedActions : 'not recorded'}`,
    '',
    '## Created Variables',
    '',
    actionLines(actionsByType(result.createdActions, 'create_data_layer_variable')),
    '',
    '## Created Triggers',
    '',
    actionLines(actionsByType(result.createdActions, 'create_custom_event_trigger')),
    '',
    '## Skipped Existing Actions',
    '',
    actionLines(result.skippedExistingActions),
    '',
    '## Unsupported Actions',
    '',
    actionLines(result.unsupportedActions),
    '',
    '## Failed Actions',
    '',
    actionLines(result.failedActions),
    '',
    '## Final Verification',
    '',
    `Status: ${result.finalVerificationStatus}`,
    '',
    '## Post-execution Verification',
    '',
    result.postExecutionVerification
      ? [
        `- Already existing: ${result.postExecutionVerification.alreadyExists}`,
        `- Would create: ${result.postExecutionVerification.wouldCreate}`,
        `- Duplicate risk: ${result.postExecutionVerification.duplicateRisk}`,
        `- Blocked: ${result.postExecutionVerification.blocked}`,
        `- Required scope status: ${result.postExecutionVerification.requiredScopeStatus}`,
        `- Workspace readable: ${result.postExecutionVerification.workspaceReadable}`,
        `- Variables readable: ${result.postExecutionVerification.variablesReadable}`,
        `- Triggers readable: ${result.postExecutionVerification.triggersReadable}`
      ].join('\n')
      : '- Not run.',
    '',
    '## Safety Statement',
    '',
    `- GTM tags created: ${result.gtmTagsCreated}`,
    `- GTM versions created: ${result.gtmVersionsCreated}`,
    `- GTM published: ${result.gtmPublished}`,
    `- Google Ads touched: ${result.googleAdsTouched}`,
    `- Meta touched: ${result.metaTouched}`,
    `- Website runtime files touched: ${result.websiteRuntimeFilesTouched}`,
    `- Secrets printed: ${result.secretsPrinted}`,
    '',
    'GTM variables and triggers may have been created in the workspace, but GTM was not published.',
    '',
    '## Mutation Statement',
    '',
    result.mutationStatement
  ].join('\n') + '\n';
}

function writeGtmCreateResult(root, result) {
  const paths = resultPaths(root);
  fs.writeFileSync(paths.jsonPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  fs.writeFileSync(paths.markdownPath, buildGtmCreateResultMarkdown(result), 'utf8');
  return paths;
}

function readGtmCreateResult(root) {
  const { jsonPath } = resultPaths(root);
  if (!fs.existsSync(jsonPath)) {
    return {
      exists: false,
      status: 'not_executed',
      mutationPerformed: false
    };
  }
  try {
    const result = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return {
      exists: true,
      status: result.status || 'unknown',
      mutationPerformed: Boolean(result.mutationPerformed),
      result
    };
  } catch (_error) {
    return {
      exists: true,
      status: 'unreadable',
      mutationPerformed: false
    };
  }
}

function buildNotExecutedResult(policy, reason) {
  return {
    generatedAt: new Date().toISOString(),
    phase: '2J',
    mode: policy.mode,
    mutationPerformed: false,
    gtmWriteCallsMade: false,
    platform: 'gtm',
    status: 'not_executed',
    selectedActionCount: policy.eligibleGtmActions.length,
    attemptedActions: [],
    createdActions: [],
    skippedExistingActions: [],
    failedActions: [],
    unsupportedActions: [],
    stoppedOnError: false,
    createdVariables: 0,
    createdTriggers: 0,
    createdTags: 0,
    createdVersions: 0,
    published: false,
    gtmVariablesCreated: false,
    gtmTriggersCreated: false,
    gtmTagsCreated: false,
    gtmVersionsCreated: false,
    finalVerificationStatus: 'not_run',
    postExecutionVerification: null,
    gtmPublished: false,
    gtmVersionCreated: false,
    googleAdsTouched: false,
    metaTouched: false,
    websiteRuntimeFilesTouched: false,
    secretsPrinted: false,
    disabledReason: reason || policy.executionDisabledReason,
    mutationStatement: 'No GTM mutations were performed. GTM controlled create was not executed.'
  };
}

module.exports = {
  buildGtmCreateResultMarkdown,
  buildNotExecutedResult,
  readGtmCreateResult,
  writeGtmCreateResult
};
