'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-ga4-event-tags-create-result.json',
  'docs/marketing-ops-ga4-event-tags-payload-review.json',
  'docs/marketing-ops-gtm-preview-qa.json'
]);

const EXPECTED_TAGS = Object.freeze([
  {
    tagName: 'GA4 - quote_request_start',
    tagId: '112'
  },
  {
    tagName: 'GA4 - quote_request_submit_success',
    tagId: '113'
  },
  {
    tagName: 'GA4 - contact_form_submit_success',
    tagId: '114'
  }
]);

function readJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required Phase 2O source artifact is missing: ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validatePrerequisites(root) {
  const phase2N = readJson(root, SOURCE_ARTIFACTS[0]);
  const payloadReview = readJson(root, SOURCE_ARTIFACTS[1]);
  const phase2K = readJson(root, SOURCE_ARTIFACTS[2]);
  const errors = [];

  if (phase2N.phase !== '2N') errors.push('GA4 Event Tags create result phase must be 2N.');
  if (phase2N.status !== 'executed') errors.push('Phase 2N create result status must be executed.');
  if (phase2N.mutationPerformed !== true) errors.push('Phase 2N must record mutationPerformed true.');
  if (phase2N.gtmPublished !== false) errors.push('Phase 2N must confirm GTM was not published.');
  if (phase2N.gtmVersionCreated !== false) errors.push('Phase 2N must confirm no GTM version was created.');
  if (phase2N.postCreateVerification?.finalVerificationStatus !== 'pass') {
    errors.push('Phase 2N final verification must pass.');
  }

  const createdTags = phase2N.createdTags || [];
  if (createdTags.length !== EXPECTED_TAGS.length) {
    errors.push('Phase 2N must record exactly 3 created GA4 Event tags.');
  }
  for (const expected of EXPECTED_TAGS) {
    const tag = createdTags.find((item) =>
      item.tagName === expected.tagName && String(item.tagId) === expected.tagId
    );
    if (!tag) errors.push(`Phase 2N is missing the expected created tag: ${expected.tagName} (${expected.tagId}).`);
  }

  if (payloadReview.phase !== '2M') errors.push('GA4 Event Tags payload review phase must be 2M.');
  if (payloadReview.recommendation?.publishApproved !== false) {
    errors.push('The payload review must keep publishApproved false.');
  }
  if (phase2K.phase !== '2K') errors.push('GTM Preview QA source artifact phase must be 2K.');
  if (phase2K.recommendation?.publishApproved !== false) {
    errors.push('Phase 2K must keep publishApproved false.');
  }

  if (errors.length) {
    throw new Error(`Phase 2O report generation refused: ${errors.join(' ')}`);
  }

  return { phase2N, payloadReview, phase2K };
}

function eventResult(tagName) {
  return {
    eventObserved: true,
    dataLayerPushObserved: true,
    tagFired: true,
    tagName,
    tagStatus: 'completed',
    status: 'pass'
  };
}

function buildReport(root) {
  validatePrerequisites(root);

  return {
    generatedAt: new Date().toISOString(),
    phase: '2O',
    mode: 'manual_preview_qa',
    mutationPerformed: false,
    gtmWriteCallsMade: false,
    gtmVersionCreated: false,
    gtmPublished: false,
    sourceArtifacts: [...SOURCE_ARTIFACTS],
    prerequisites: {
      phase2NConfirmed: true,
      createdTagsExist: true,
      gtmPublished: false
    },
    manualEvidence: {
      tagAssistantConnected: true,
      gtmContainerDetected: 'GTM-5WD8N53F',
      ga4MeasurementDetected: 'G-B5BPHFRR18',
      freshPreviewSessionUsed: true,
      stalePreviewSessionObservedBeforeRefresh: true
    },
    qaResults: {
      contact_form_submit_success: {
        pageTested: 'https://crbox.cr/contacto.html',
        ...eventResult('GA4 - contact_form_submit_success')
      },
      quote_request_submit_success: {
        pageTested: 'https://crbox.cr/calculadora.html',
        ...eventResult('GA4 - quote_request_submit_success')
      },
      quote_request_start: {
        pageTested: 'https://crbox.cr/calculadora.html',
        ...eventResult('GA4 - quote_request_start')
      }
    },
    overallStatus: 'pass',
    blockersBeforePublish: [
      'No functional blocker found for the 3 newly created GA4 Event Tags in GTM Preview.',
      'GTM publish still requires a separately approved version/publish phase.'
    ],
    recommendation: {
      previewQaPassed: true,
      publishApproved: false,
      nextPhase: 'Prepare controlled GTM version/publish review, if business owner approves.'
    },
    safety: {
      noGtmWrites: true,
      noGtmVersionCreated: true,
      noGtmPublish: true,
      googleAdsTouched: false,
      metaTouched: false,
      runtimeFilesTouched: false,
      secretsPrinted: false
    }
  };
}

function resultRow(eventName, result) {
  return `| \`${eventName}\` | \`${result.pageTested}\` | ${result.eventObserved} | ${result.tagFired} | ${result.tagName} | ${result.tagStatus} | **${result.status}** |`;
}

function eventDetails(eventName, result) {
  return [
    `### ${eventName}`,
    '',
    `- Page tested: \`${result.pageTested}\``,
    `- Event observed: ${result.eventObserved}`,
    `- dataLayer push observed: ${result.dataLayerPushObserved}`,
    `- Tag fired: ${result.tagFired}`,
    `- Tag name: \`${result.tagName}\``,
    `- Tag status: \`${result.tagStatus}\``,
    `- QA status: **${result.status}**`,
    ''
  ];
}

function buildMarkdown(report) {
  const contact = report.qaResults.contact_form_submit_success;
  const quoteSubmit = report.qaResults.quote_request_submit_success;
  const quoteStart = report.qaResults.quote_request_start;

  return [
    '# CRBOX Marketing Ops GA4 Event Tags Preview QA',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Phase: **2O**',
    '',
    'Mode: **manual_preview_qa**',
    '',
    '## Summary',
    '',
    'Phase 2O validates that the 3 newly created GA4 Event Tags fire correctly in GTM Preview.',
    '',
    '- All three expected runtime events were observed in Tag Assistant.',
    '- All three corresponding GA4 Event tags fired and completed.',
    '- A fresh GTM Preview session was required to load the newly created workspace tags.',
    '- No GTM version was created and GTM was not published.',
    `- Overall status: **${report.overallStatus}**`,
    '',
    '## Context',
    '',
    '- Phase 2N created exactly three reviewed GA4 Event tags in the GTM workspace.',
    '- Phase 2N created no GTM version and did not publish GTM.',
    '- This artifact records manual QA evidence supplied after refreshing Preview from GTM.',
    '',
    '## Manual QA Evidence',
    '',
    `- Tag Assistant connected: ${report.manualEvidence.tagAssistantConnected}`,
    `- GTM container detected: \`${report.manualEvidence.gtmContainerDetected}\``,
    `- GA4 measurement detected: \`${report.manualEvidence.ga4MeasurementDetected}\``,
    `- Fresh Preview session used: ${report.manualEvidence.freshPreviewSessionUsed}`,
    `- Stale Preview session observed before refresh: ${report.manualEvidence.stalePreviewSessionObservedBeforeRefresh}`,
    '',
    '## Results',
    '',
    '| Event | Page tested | Event observed | Tag fired | Tag | Tag status | QA status |',
    '|---|---|---:|---:|---|---|---|',
    resultRow('contact_form_submit_success', contact),
    resultRow('quote_request_submit_success', quoteSubmit),
    resultRow('quote_request_start', quoteStart),
    '',
    '## Individual Event Findings',
    '',
    ...eventDetails('contact_form_submit_success', contact),
    ...eventDetails('quote_request_submit_success', quoteSubmit),
    ...eventDetails('quote_request_start', quoteStart),
    '## Stale Preview Session Note',
    '',
    'Before GTM Preview was refreshed, the runtime events appeared in Tag Assistant but the newly created tags did not fire. After starting a fresh Preview session from GTM, all three new tags fired correctly and completed. This was a stale Preview session observation, not a runtime or GTM configuration failure.',
    '',
    '## Remaining Publish Boundary',
    '',
    ...report.blockersBeforePublish.map((item) => `- ${item}`),
    '',
    'GTM publish is still not approved by this phase.',
    '',
    '## Recommendation',
    '',
    `- Preview QA passed: **${report.recommendation.previewQaPassed}**`,
    `- Publish approved: **${report.recommendation.publishApproved}**`,
    `- Next phase: ${report.recommendation.nextPhase}`,
    '',
    '## Safety Statement',
    '',
    ...Object.entries(report.safety).map(([key, value]) => `- ${key}: ${value}`),
    '',
    'No GTM writes, versions, or publications were performed while generating this QA documentation.'
  ].join('\n') + '\n';
}

function writeReport(root, report) {
  const jsonPath = path.join(root, 'docs', 'marketing-ops-ga4-event-tags-preview-qa.json');
  const markdownPath = path.join(root, 'docs', 'marketing-ops-ga4-event-tags-preview-qa.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(markdownPath, buildMarkdown(report), 'utf8');
  return { jsonPath, markdownPath };
}

function runGtmGa4TagsPreviewQa(root) {
  const report = buildReport(root);
  const paths = writeReport(root, report);
  return { report, paths };
}

function printSummary(report, paths) {
  return [
    'GTM GA4 Event Tags Preview QA report: COMPLETE',
    `- Mode: ${report.mode}`,
    `- contact_form_submit_success: ${report.qaResults.contact_form_submit_success.status}`,
    `- quote_request_submit_success: ${report.qaResults.quote_request_submit_success.status}`,
    `- quote_request_start: ${report.qaResults.quote_request_start.status}`,
    `- Overall status: ${report.overallStatus}`,
    `- Publish approved: ${report.recommendation.publishApproved}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    'No platform API calls or mutations were performed. GTM publish remains blocked.'
  ];
}

module.exports = {
  buildMarkdown,
  buildReport,
  printSummary,
  runGtmGa4TagsPreviewQa,
  validatePrerequisites
};
