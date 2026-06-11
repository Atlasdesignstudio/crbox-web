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

function buildGtmCreateResultMarkdown(result) {
  return [
    '# CRBOX Marketing Ops GTM Create Result',
    '',
    `Generated: ${result.generatedAt}`,
    '',
    `Mode: **${result.mode}**`,
    '',
    `Status: **${result.status}**`,
    '',
    `Platform: ${result.platform}`,
    `Mutation performed: ${result.mutationPerformed}`,
    `GTM published: ${result.gtmPublished}`,
    `GTM version created: ${result.gtmVersionCreated}`,
    `Selected actions: ${result.selectedActionCount}`,
    '',
    '## Created Actions',
    '',
    actionLines(result.createdActions),
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
    mode: policy.mode,
    mutationPerformed: false,
    platform: 'gtm',
    status: 'not_executed',
    selectedActionCount: policy.eligibleGtmActions.length,
    createdActions: [],
    skippedExistingActions: [],
    failedActions: [],
    unsupportedActions: [],
    finalVerificationStatus: 'not_run',
    gtmPublished: false,
    gtmVersionCreated: false,
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
