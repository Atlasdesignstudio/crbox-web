'use strict';

const fs = require('fs');
const path = require('path');

function resultPaths(root) {
  return {
    jsonPath: path.join(root, 'docs', 'marketing-ops-ga4-event-tags-create-result.json'),
    markdownPath: path.join(root, 'docs', 'marketing-ops-ga4-event-tags-create-result.md')
  };
}

function listItems(items, formatter) {
  if (!items || items.length === 0) return ['- None.'];
  return items.map(formatter);
}

function parameterLines(parameters) {
  if (!parameters || parameters.length === 0) return ['- None.'];
  return parameters.map((parameter) =>
    `- \`${parameter.parameter}\` -> \`${parameter.variableReference}\``
  );
}

function buildMarkdown(result) {
  const createdSections = (result.createdTags || []).flatMap((tag) => [
    `### ${tag.tagName}`,
    '',
    `- Event name: \`${tag.eventName}\``,
    `- Trigger: ${tag.triggerName} (ID \`${tag.triggerId}\`)`,
    `- GTM tag ID: \`${tag.tagId}\``,
    `- Status: **${tag.status}**`,
    '',
    'Parameters:',
    ...parameterLines(tag.parameters),
    ''
  ]);

  return [
    '# CRBOX Marketing Ops GA4 Event Tags Create Result',
    '',
    `Generated: ${result.generatedAt}`,
    '',
    'Phase: **2N**',
    '',
    `Mode: **${result.mode}**`,
    '',
    `Status: **${result.status}**`,
    '',
    '## Summary',
    '',
    `- Mutation performed: ${result.mutationPerformed}`,
    `- GTM write calls made: ${result.gtmWriteCallsMade}`,
    `- Tags created: ${(result.createdTags || []).length}`,
    `- Skipped existing: ${(result.skippedExisting || []).length}`,
    `- Failed actions: ${(result.failedActions || []).length}`,
    `- Stopped on error: ${result.stoppedOnError}`,
    `- GTM version created: ${result.gtmVersionCreated}`,
    `- GTM published: ${result.gtmPublished}`,
    '',
    '## Execution Command',
    '',
    `\`${result.executionCommand}\``,
    '',
    '## Pre-execution Validation',
    '',
    ...Object.entries(result.preExecutionValidation || {}).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## What Was Created',
    '',
    ...(createdSections.length ? createdSections : ['- No tags were created.', '']),
    '## Skipped Existing Objects',
    '',
    ...listItems(result.skippedExisting, (tag) =>
      `- ${tag.tagName}: ${tag.status}${tag.existingTagId ? ` (tag ID \`${tag.existingTagId}\`)` : ''}`
    ),
    '',
    '## Failed Actions',
    '',
    ...listItems(result.failedActions, (action) =>
      `- ${action.tagName || action.actionId}: ${action.status}. ${action.error || ''}`.trim()
    ),
    '',
    '## Post-create Verification',
    '',
    `- Tags exist: ${result.postCreateVerification?.tagsExist}`,
    `- Duplicate risk: ${result.postCreateVerification?.duplicateRisk}`,
    `- Unexpected created objects: ${(result.postCreateVerification?.unexpectedCreatedObjects || []).length}`,
    `- Variables created: ${result.postCreateVerification?.variablesCreated}`,
    `- Triggers created: ${result.postCreateVerification?.triggersCreated}`,
    `- Tags created: ${result.postCreateVerification?.tagsCreated}`,
    `- Versions created: ${result.postCreateVerification?.versionsCreated}`,
    `- GTM published: ${result.postCreateVerification?.gtmPublished}`,
    `- Final verification status: ${result.postCreateVerification?.finalVerificationStatus}`,
    '',
    '## Safety Statement',
    '',
    ...Object.entries(result.safety || {}).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Remaining Blockers',
    '',
    '- Validate the three new GA4 Event tags in GTM Preview.',
    '- Confirm the expected GA4 events and safe parameters are received.',
    '- Keep GTM version creation and publishing blocked until separately approved.',
    '',
    'GTM publish is still not approved after Phase 2N.',
    '',
    '## Mutation Statement',
    '',
    result.mutationStatement
  ].join('\n') + '\n';
}

function writeGa4EventTagsCreateResult(root, result) {
  const paths = resultPaths(root);
  fs.writeFileSync(paths.jsonPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  fs.writeFileSync(paths.markdownPath, buildMarkdown(result), 'utf8');
  return paths;
}

function readGa4EventTagsCreateResult(root) {
  const paths = resultPaths(root);
  if (!fs.existsSync(paths.jsonPath)) {
    return {
      exists: false,
      status: 'not_executed',
      mutationPerformed: false,
      result: null
    };
  }

  try {
    const result = JSON.parse(fs.readFileSync(paths.jsonPath, 'utf8'));
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
      mutationPerformed: false,
      result: null
    };
  }
}

module.exports = {
  buildMarkdown,
  readGa4EventTagsCreateResult,
  writeGa4EventTagsCreateResult
};
