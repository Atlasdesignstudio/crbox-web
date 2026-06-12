'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-gtm-create-result.json',
  'docs/marketing-ops-gtm-preflight.json',
  'docs/marketing-ops-gtm-payload-review.json'
]);

function readJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required Phase 2K source artifact is missing: ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validatePhase2J(root) {
  const result = readJson(root, SOURCE_ARTIFACTS[0]);
  const errors = [];

  if (result.phase !== '2J') errors.push('GTM create result phase must be 2J.');
  if (result.status !== 'executed') errors.push('GTM create result status must be executed.');
  if (result.createdVariables !== 8) errors.push('GTM create result must record 8 created variables.');
  if (result.createdTriggers !== 3) errors.push('GTM create result must record 3 created triggers.');
  if (result.gtmPublished !== false) errors.push('GTM create result must confirm the container was not published.');

  // Confirm the other declared sources are present and valid JSON.
  readJson(root, SOURCE_ARTIFACTS[1]);
  readJson(root, SOURCE_ARTIFACTS[2]);

  if (errors.length) {
    throw new Error(`Phase 2K report generation refused: ${errors.join(' ')}`);
  }

  return result;
}

function buildReport(root) {
  validatePhase2J(root);

  return {
    generatedAt: new Date().toISOString(),
    phase: '2K',
    mode: 'manual_qa_report',
    mutationPerformed: false,
    gtmWriteCallsMade: false,
    gtmPublished: false,
    sourceArtifacts: [...SOURCE_ARTIFACTS],
    manualEvidence: {
      tagAssistantConnected: true,
      gtmContainerDetected: 'GTM-5WD8N53F',
      ga4MeasurementDetected: 'G-B5BPHFRR18',
      previewModeActive: true,
      gtmPublishedDuringQa: false
    },
    qaResults: {
      quote_request_start: {
        eventObserved: true,
        dataLayerPushObserved: true,
        variablesReadable: true,
        variables: {
          attributionTouch: 'none',
          fbclidPresent: 'false',
          gclidPresent: 'false',
          utmCampaign: '(not set)',
          utmContent: '(not set)',
          utmMedium: '(not set)',
          utmSource: '(not set)',
          utmTerm: '(not set)'
        },
        tagsFired: [],
        status: 'pass_with_no_ga4_tag_firing'
      },
      utmVariables: {
        testUrlUsed: 'https://crbox.cr/cotizar.html?utm_source=test_source&utm_medium=test_medium&utm_campaign=test_campaign&utm_content=test_content&utm_term=test_term',
        observedEvents: [
          'portal_section_view',
          'gtm.load',
          'gtm.dom'
        ],
        pagePath: '/cotizar.html',
        pageName: 'cotizar',
        pageType: 'portal_quotes',
        utmSource: 'test_source',
        utmMedium: 'test_medium',
        utmCampaign: 'test_campaign',
        utmContent: 'test_content',
        utmTerm: 'test_term',
        attributionTouch: 'both_available',
        gclidPresent: 'false',
        fbclidPresent: 'false',
        rawClickIdsExposed: false,
        status: 'pass'
      },
      contact_form_submit_success: {
        eventObserved: true,
        dataLayerPushObserved: true,
        variablesReadable: true,
        variables: {
          attributionTouch: 'both_available',
          fbclidPresent: 'false',
          gclidPresent: 'false',
          utmCampaign: 'test_campaign',
          utmContent: 'test_content',
          utmMedium: 'test_medium',
          utmSource: 'test_source',
          utmTerm: 'test_term'
        },
        tagsFired: [],
        status: 'pass_with_no_ga4_tag_firing'
      },
      quote_request_submit_success: {
        quoteUiSuccessObserved: true,
        quoteUiMessageObserved: '¡Solicitud enviada!',
        exampleReferenceObserved: '#SCB-0026',
        eventObserved: false,
        status: 'fail_not_observed',
        notes: 'Successful quote UI was observed, but quote_request_submit_success was not observed in Tag Assistant.'
      },
      ga4Hits: {
        generalHitsObserved: true,
        generalEventsObserved: [
          'Desplazamiento',
          'portal_section_view',
          'Vista de una página',
          'nav_click',
          'Interacción del usuario',
          'section_visible'
        ],
        newConversionIntentHitsConfirmed: false,
        unconfirmedEvents: [
          'quote_request_start',
          'contact_form_submit_success',
          'quote_request_submit_success'
        ],
        status: 'partial'
      }
    },
    blockersBeforePublish: [
      'quote_request_submit_success was not observed after successful quote submission.',
      'No GA4 tags fired on quote_request_start or contact_form_submit_success.',
      'GA4 hits for the new conversion-intent events were not confirmed.'
    ],
    recommendation: {
      publishApproved: false,
      nextPhase: 'Plan GA4 event tags and/or verify runtime emission before publish.'
    },
    safety: {
      noGtmWrites: true,
      noGtmVersionCreated: true,
      noGtmPublish: true,
      googleAdsTouched: false,
      metaTouched: false,
      websiteRuntimeFilesTouched: false,
      secretsPrinted: false
    }
  };
}

function statusLabel(status) {
  return `\`${status}\``;
}

function buildMarkdown(report) {
  const quoteStart = report.qaResults.quote_request_start;
  const utm = report.qaResults.utmVariables;
  const contact = report.qaResults.contact_form_submit_success;
  const quoteSubmit = report.qaResults.quote_request_submit_success;
  const ga4 = report.qaResults.ga4Hits;

  return [
    '# CRBOX Marketing Ops GTM Preview QA Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Phase: **2K**',
    '',
    'Mode: **manual_qa_report**',
    '',
    '## Summary',
    '',
    '- Tag Assistant connected successfully and detected the expected GTM and GA4 identifiers.',
    '- The Phase 2J Data Layer Variables read default and UTM-attributed values correctly.',
    '- `quote_request_start` and `contact_form_submit_success` were observed with readable variables.',
    '- `quote_request_submit_success` was not observed after a successful quote UI state.',
    '- No GA4 tag firing was observed for the new conversion-intent events.',
    '- GTM was not published during QA.',
    '',
    '## Context',
    '',
    '- Phase 2J created 8 Data Layer Variables and 3 Custom Event triggers.',
    '- Phase 2J created no tags or versions and did not publish GTM.',
    '- This report records manual Tag Assistant evidence supplied after QA against `crbox.cr`.',
    '',
    '## Manual QA Evidence',
    '',
    `- Tag Assistant connected: ${report.manualEvidence.tagAssistantConnected}`,
    `- GTM container detected: \`${report.manualEvidence.gtmContainerDetected}\``,
    `- GA4 measurement detected: \`${report.manualEvidence.ga4MeasurementDetected}\``,
    `- Preview mode active: ${report.manualEvidence.previewModeActive}`,
    `- GTM published during QA: ${report.manualEvidence.gtmPublishedDuringQa}`,
    '',
    '## Results',
    '',
    '| Area | Status | Evidence |',
    '|---|---|---|',
    `| \`quote_request_start\` | ${statusLabel(quoteStart.status)} | Event and dataLayer push observed; variables readable; no tags fired. |`,
    `| UTM variables | ${statusLabel(utm.status)} | Test UTMs and \`attribution_touch=both_available\` were readable; no raw click IDs observed. |`,
    `| \`contact_form_submit_success\` | ${statusLabel(contact.status)} | Event and dataLayer push observed with UTM values; no tags fired. |`,
    `| \`quote_request_submit_success\` | ${statusLabel(quoteSubmit.status)} | Successful quote UI observed, but the expected event was not present in Tag Assistant. |`,
    `| GA4 hits | ${statusLabel(ga4.status)} | General GA4 hits observed; new conversion-intent hits were not confirmed. |`,
    '',
    '## Detailed Findings',
    '',
    '### quote_request_start',
    '',
    `- Event observed: ${quoteStart.eventObserved}`,
    `- dataLayer push observed: ${quoteStart.dataLayerPushObserved}`,
    `- Variables readable: ${quoteStart.variablesReadable}`,
    `- \`attribution_touch\`: \`${quoteStart.variables.attributionTouch}\``,
    `- \`gclid_present\`: \`${quoteStart.variables.gclidPresent}\``,
    `- \`fbclid_present\`: \`${quoteStart.variables.fbclidPresent}\``,
    '- UTM variables: `(not set)` without URL UTMs.',
    '- Tags fired: none observed.',
    '- GA4 event tag: not configured / not firing.',
    '',
    '### UTM Data Layer And Variables',
    '',
    `Test URL: \`${utm.testUrlUsed}\``,
    '',
    `- \`utm_source\`: \`${utm.utmSource}\``,
    `- \`utm_medium\`: \`${utm.utmMedium}\``,
    `- \`utm_campaign\`: \`${utm.utmCampaign}\``,
    `- \`utm_content\`: \`${utm.utmContent}\``,
    `- \`utm_term\`: \`${utm.utmTerm}\``,
    `- \`attribution_touch\`: \`${utm.attributionTouch}\``,
    `- \`gclid_present\`: \`${utm.gclidPresent}\``,
    `- \`fbclid_present\`: \`${utm.fbclidPresent}\``,
    `- Raw click IDs exposed: ${utm.rawClickIdsExposed}`,
    `- Page: \`${utm.pagePath}\` / \`${utm.pageName}\` / \`${utm.pageType}\``,
    '',
    '### contact_form_submit_success',
    '',
    `- Event observed: ${contact.eventObserved}`,
    `- dataLayer push observed: ${contact.dataLayerPushObserved}`,
    `- Variables readable: ${contact.variablesReadable}`,
    '- All five test UTM values and `attribution_touch=both_available` were available.',
    '- `gclid_present` and `fbclid_present` remained false.',
    '- Tags fired: none observed.',
    '- GA4 event tag: not configured / not firing.',
    '',
    '### quote_request_submit_success',
    '',
    `- Quote UI success observed: ${quoteSubmit.quoteUiSuccessObserved}`,
    `- Quote UI message observed: \`${quoteSubmit.quoteUiMessageObserved}\``,
    `- Example reference observed: \`${quoteSubmit.exampleReferenceObserved}\``,
    `- Event observed: ${quoteSubmit.eventObserved}`,
    `- Status: ${statusLabel(quoteSubmit.status)}`,
    `- Notes: ${quoteSubmit.notes}`,
    '',
    '### GA4 Hits',
    '',
    `- General hits observed: ${ga4.generalHitsObserved}`,
    `- New conversion-intent hits confirmed: ${ga4.newConversionIntentHitsConfirmed}`,
    `- Status: ${statusLabel(ga4.status)}`,
    `- General events included: ${ga4.generalEventsObserved.map((event) => `\`${event}\``).join(', ')}`,
    `- Unconfirmed new events: ${ga4.unconfirmedEvents.map((event) => `\`${event}\``).join(', ')}`,
    '',
    '## Blockers Before Publish',
    '',
    ...report.blockersBeforePublish.map((blocker) => `- ${blocker}`),
    '',
    '## Recommendation',
    '',
    `- Publish approved: **${report.recommendation.publishApproved}**`,
    `- Next phase: ${report.recommendation.nextPhase}`,
    '',
    '## Safety Statement',
    '',
    ...Object.entries(report.safety).map(([key, value]) => `- ${key}: ${value}`),
    '',
    'GTM publish is not approved after Phase 2K QA.'
  ].join('\n') + '\n';
}

function writeReport(root, report) {
  const jsonPath = path.join(root, 'docs', 'marketing-ops-gtm-preview-qa.json');
  const markdownPath = path.join(root, 'docs', 'marketing-ops-gtm-preview-qa.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(markdownPath, buildMarkdown(report), 'utf8');
  return { jsonPath, markdownPath };
}

function runGtmPreviewQaReport(root) {
  const report = buildReport(root);
  const paths = writeReport(root, report);
  return { report, paths };
}

function printSummary(report, paths) {
  return [
    'GTM Preview QA report: COMPLETE',
    `- Mode: ${report.mode}`,
    `- quote_request_start: ${report.qaResults.quote_request_start.status}`,
    `- UTM variables: ${report.qaResults.utmVariables.status}`,
    `- contact_form_submit_success: ${report.qaResults.contact_form_submit_success.status}`,
    `- quote_request_submit_success: ${report.qaResults.quote_request_submit_success.status}`,
    `- GA4 hits: ${report.qaResults.ga4Hits.status}`,
    `- Publish approved: ${report.recommendation.publishApproved}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    'No platform API calls or mutations were performed. GTM publish is not approved after Phase 2K QA.'
  ];
}

module.exports = {
  buildMarkdown,
  buildReport,
  printSummary,
  runGtmPreviewQaReport
};
