'use strict';

const fs = require('fs');
const path = require('path');

function resultPaths(root) {
  return {
    markdownPath: path.join(root, 'docs', 'marketing-ops-ga4-create-result.md'),
    jsonPath: path.join(root, 'docs', 'marketing-ops-ga4-create-result.json')
  };
}

function actionLines(actions) {
  if (!actions || actions.length === 0) return '- None.';
  return actions.map((action) => {
    const subject = action.parameterName || action.eventName || action.actionId || action.action || 'unknown';
    return `- ${subject} (${action.action || 'unknown'}): ${action.status || 'unknown'}`;
  }).join('\n');
}

function buildGa4CreateResultMarkdown(result) {
  return [
    '# CRBOX Marketing Ops GA4 Create Result',
    '',
    `Generated: ${result.generatedAt}`,
    '',
    `Mode: **${result.mode}**`,
    '',
    `Status: **${result.status}**`,
    '',
    `Platform: ${result.platform}`,
    `Mutation performed: ${result.mutationPerformed}`,
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

function writeGa4CreateResult(root, result) {
  const paths = resultPaths(root);
  fs.writeFileSync(paths.jsonPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  fs.writeFileSync(paths.markdownPath, buildGa4CreateResultMarkdown(result), 'utf8');
  return paths;
}

function readGa4CreateResult(root) {
  const { jsonPath } = resultPaths(root);
  if (!fs.existsSync(jsonPath)) {
    return {
      exists: false,
      status: 'not_executed'
    };
  }
  try {
    const result = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return {
      exists: true,
      status: result.status || 'unknown',
      result
    };
  } catch (_error) {
    return {
      exists: true,
      status: 'unreadable'
    };
  }
}

function buildNotExecutedResult(policy, reason) {
  return {
    generatedAt: new Date().toISOString(),
    mode: policy.mode,
    mutationPerformed: false,
    platform: 'ga4',
    status: 'not_executed',
    selectedActionCount: policy.eligibleGa4Actions.length,
    createdActions: [],
    skippedExistingActions: [],
    failedActions: [],
    unsupportedActions: [],
    finalVerificationStatus: 'not_run',
    disabledReason: reason || policy.executionDisabledReason,
    mutationStatement: 'No GA4 mutations were performed. GA4 controlled create was not executed.'
  };
}

module.exports = {
  buildGa4CreateResultMarkdown,
  buildNotExecutedResult,
  readGa4CreateResult,
  writeGa4CreateResult
};
