'use strict';

const fs = require('fs');
const path = require('path');
const { EXPECTED, REQUIRED_ENV } = require('./config');
const {
  getGoogleAccessToken,
  getGoogleTokenInfo,
  googleApiGet,
  googleApiPost,
  readableGoogleError
} = require('./google-auth');
const { envValue, missingEnv } = require('./utils');

const ADMIN_BASE = 'https://analyticsadmin.googleapis.com/v1beta';
const DATA_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const ANALYTICS_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-ga4-monitoring-readiness.json',
  'docs/marketing-ops-ga4-monitoring-readiness.md',
  'docs/marketing-ops-gtm-publish-result.json',
  'docs/marketing-ops-gtm-post-publish-smoke-test.json',
  'docs/measurement-map-v1.md',
  'docs/analytics-taxonomy.md'
]);

const EXPECTED_EVENTS = Object.freeze([
  'quote_request_start',
  'quote_request_submit_success',
  'contact_form_submit_success',
  'signup_success',
  'signup_start',
  'signup_step',
  'signup_error',
  'calculator_start',
  'calculator_query',
  'calculator_result',
  'calculator_tab_switch',
  'whatsapp_click',
  'phone_click',
  'email_click',
  'nav_click',
  'cta_click',
  'scroll_depth',
  'section_visible',
  'form_start',
  'form_abandon',
  'faq_engage',
  'service_card_click',
  'portal_section_view',
  'package_search',
  'package_detail_view',
  'invoice_upload_start',
  'invoice_upload_success',
  'invoice_upload_error',
  'login_start',
  'login_success',
  'login_error',
  'chat_open',
  'chat_message_sent'
]);

const VALIDATION_EVENTS = Object.freeze([
  'quote_request_start',
  'quote_request_submit_success',
  'contact_form_submit_success',
  'signup_success',
  'calculator_start',
  'calculator_query',
  'calculator_result',
  'whatsapp_click',
  'nav_click',
  'cta_click',
  'scroll_depth',
  'section_visible',
  'form_start',
  'portal_section_view'
]);

const CORE_CONVERSION_EVENTS = Object.freeze([
  'quote_request_start',
  'quote_request_submit_success',
  'contact_form_submit_success',
  'signup_success'
]);

const ATTRIBUTION_EVENTS = Object.freeze([
  'quote_request_submit_success',
  'contact_form_submit_success',
  'signup_success'
]);

const LEGACY_ALIASES = Object.freeze([
  'quote_start',
  'quote_submit',
  'quote_request_submit',
  'quote_success',
  'quote_request_success',
  'contact_success',
  'form_submit'
]);

const COMMON_GA4_EVENTS = Object.freeze(new Set([
  'page_view',
  'session_start',
  'first_visit',
  'user_engagement',
  'scroll',
  'click',
  'file_download',
  'view_search_results'
]));

const EXPECTED_PAGE_MAP = Object.freeze({
  quote_request_start: ['/calculadora.html', '/cotizar.html'],
  quote_request_submit_success: ['/calculadora.html', '/cotizar.html'],
  contact_form_submit_success: ['/contacto.html'],
  signup_success: ['/afiliate.html'],
  calculator_start: ['/calculadora.html'],
  calculator_query: ['/calculadora.html'],
  calculator_result: ['/calculadora.html'],
  whatsapp_click: ['public/global'],
  nav_click: ['public/global'],
  cta_click: ['public/global'],
  scroll_depth: ['public/global'],
  section_visible: ['public/global']
});

function propertyResourceName(propertyId) {
  const value = String(propertyId || '').trim();
  return value.startsWith('properties/') ? value : `properties/${value}`;
}

function propertyPath(propertyId) {
  return encodeURI(propertyResourceName(propertyId));
}

function conciseGoogleError(error) {
  return readableGoogleError(error).replace(/\s+Details:.*$/s, '');
}

function readJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function sourceArtifactAvailability(root) {
  return SOURCE_ARTIFACTS.map((relativePath) => ({
    path: relativePath,
    available: fs.existsSync(path.join(root, relativePath))
  }));
}

function inListFilter(fieldName, values) {
  return {
    filter: {
      fieldName,
      inListFilter: {
        values,
        caseSensitive: true
      }
    }
  };
}

function andFilter(expressions) {
  return { andGroup: { expressions } };
}

async function runDataReport(accessToken, propertyId, request) {
  return googleApiPost(
    `${DATA_BASE}/${propertyPath(propertyId)}:runReport`,
    accessToken,
    request
  );
}

function metricValue(row, index = 0) {
  return Number(row.metricValues?.[index]?.value || 0);
}

function percentage(numerator, denominator) {
  if (!denominator) return null;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function ratio(numerator, denominator) {
  if (!denominator) return null;
  return Number((numerator / denominator).toFixed(4));
}

function isMeaningfulValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized)
    && normalized !== '(not set)'
    && normalized !== '(not provided)'
    && normalized !== 'unknown';
}

function statusForEvent(eventName, last7DaysCount, keyEvents) {
  if (last7DaysCount > 10) return 'healthy_recent_volume';
  if (last7DaysCount > 0) return 'low_volume_expected';
  if (keyEvents.has(eventName) || CORE_CONVERSION_EVENTS.includes(eventName)) return 'zero_volume_warning';
  return 'not_observed';
}

function countMapFromRows(response) {
  const counts = new Map();
  for (const row of response.rows || []) {
    const key = row.dimensionValues?.[0]?.value || '';
    if (key) counts.set(key, metricValue(row));
  }
  return counts;
}

async function readCountsByEvent(accessToken, propertyId, dateRange, events) {
  const response = await runDataReport(accessToken, propertyId, {
    dateRanges: [dateRange],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: inListFilter('eventName', [...events]),
    limit: '250',
    keepEmptyRows: false,
    returnPropertyQuota: false
  });
  return countMapFromRows(response);
}

async function readAllObservedEvents(accessToken, propertyId) {
  const response = await runDataReport(accessToken, propertyId, {
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today', name: 'last_7_days' }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    limit: '250',
    keepEmptyRows: false,
    returnPropertyQuota: false
  });
  return (response.rows || []).map((row) => ({
    eventName: row.dimensionValues?.[0]?.value || '',
    count: metricValue(row)
  })).filter((row) => row.eventName);
}

async function readPageRows(accessToken, propertyId) {
  const response = await runDataReport(accessToken, propertyId, {
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today', name: 'last_7_days' }],
    dimensions: [{ name: 'eventName' }, { name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: inListFilter('eventName', [
      ...new Set(Object.keys(EXPECTED_PAGE_MAP).filter((eventName) =>
        !EXPECTED_PAGE_MAP[eventName].includes('public/global')
      ))
    ]),
    limit: '500',
    keepEmptyRows: false,
    returnPropertyQuota: false
  });
  return (response.rows || []).map((row) => ({
    eventName: row.dimensionValues?.[0]?.value || '',
    pagePath: row.dimensionValues?.[1]?.value || '',
    pageTitle: row.dimensionValues?.[2]?.value || '',
    eventCount: metricValue(row)
  })).filter((row) => row.eventName);
}

async function readAttributionRows(accessToken, propertyId, dimensionName, metricName = 'eventCount') {
  const response = await runDataReport(accessToken, propertyId, {
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today', name: 'last_7_days' }],
    dimensions: [{ name: 'eventName' }, { name: dimensionName }],
    metrics: [{ name: metricName }],
    dimensionFilter: inListFilter('eventName', [...ATTRIBUTION_EVENTS]),
    limit: '1000',
    keepEmptyRows: false,
    returnPropertyQuota: false
  });
  return (response.rows || []).map((row) => ({
    eventName: row.dimensionValues?.[0]?.value || '',
    value: row.dimensionValues?.[1]?.value || '',
    count: metricValue(row)
  }));
}

async function listKeyEvents(accessToken, propPath) {
  const attempts = [
    {
      endpoint: 'keyEvents',
      url: `${ADMIN_BASE}/${propPath}/keyEvents?pageSize=200`,
      field: 'keyEvents'
    },
    {
      endpoint: 'conversionEvents',
      url: `${ADMIN_BASE}/${propPath}/conversionEvents?pageSize=200`,
      field: 'conversionEvents'
    }
  ];

  for (const attempt of attempts) {
    try {
      const data = await googleApiGet(attempt.url, accessToken);
      return {
        endpoint: attempt.endpoint,
        items: data[attempt.field] || []
      };
    } catch (_error) {
      // Try the compatibility endpoint before reporting unavailable.
    }
  }
  return { endpoint: '', items: [] };
}

function summarizeCoverage(rows, total, metricName = 'eventCount') {
  const meaningful = rows.filter((row) => isMeaningfulValue(row.value));
  const countWithValue = meaningful.reduce((sum, row) => sum + row.count, 0);
  return {
    metricName,
    totalEvents: total,
    countWithValue,
    percentageWithValue: percentage(countWithValue, total),
    rowsWithValue: meaningful.length,
    status: countWithValue > 0 ? 'observed' : 'configured_but_no_recent_volume'
  };
}

function distribution(rows) {
  return rows
    .filter((row) => isMeaningfulValue(row.value))
    .sort((left, right) => right.count - left.count)
    .slice(0, 25)
    .map((row) => ({
      eventName: row.eventName,
      value: row.value,
      count: row.count
    }));
}

function booleanTrueCount(rows) {
  return rows
    .filter((row) => String(row.value).toLowerCase() === 'true')
    .reduce((sum, row) => sum + row.count, 0);
}

function validateFunnel(name, steps) {
  return {
    name,
    steps,
    warnings: [],
    status: 'pass'
  };
}

function buildFunnels(counts) {
  const quoteStarts = counts.quote_request_start || 0;
  const quoteSubmits = counts.quote_request_submit_success || 0;
  const calculatorStarts = counts.calculator_start || 0;
  const calculatorQueries = counts.calculator_query || 0;
  const calculatorResults = counts.calculator_result || 0;
  const formStarts = counts.form_start || 0;
  const contactSubmits = counts.contact_form_submit_success || 0;

  const quoteFunnel = validateFunnel('Quote funnel', {
    starts: quoteStarts,
    submits: quoteSubmits,
    submitStartRatio: ratio(quoteSubmits, quoteStarts)
  });
  if (quoteSubmits > quoteStarts * 1.25) {
    quoteFunnel.warnings.push('quote_request_submit_success is higher than quote_request_start by more than 25%.');
  }
  if (quoteStarts > 0 && quoteSubmits === 0) {
    quoteFunnel.warnings.push('quote_request_start has volume but quote_request_submit_success is zero.');
  }
  if (quoteFunnel.steps.submitStartRatio !== null && quoteFunnel.steps.submitStartRatio < 0.02) {
    quoteFunnel.warnings.push('Quote submit/start ratio is very low.');
  }
  if (quoteFunnel.steps.submitStartRatio !== null && quoteFunnel.steps.submitStartRatio > 1.25) {
    quoteFunnel.warnings.push('Quote submit/start ratio is unusually high.');
  }
  quoteFunnel.status = quoteFunnel.warnings.length ? 'warning' : 'pass';

  const calculatorFunnel = validateFunnel('Calculator funnel', {
    calculatorStart: calculatorStarts,
    calculatorQuery: calculatorQueries,
    calculatorResult: calculatorResults,
    quoteSubmit: quoteSubmits,
    calculatorResultStartRatio: ratio(calculatorResults, calculatorStarts),
    quoteSubmitCalculatorResultRatio: ratio(quoteSubmits, calculatorResults)
  });
  if (calculatorStarts > 0 && calculatorResults === 0) {
    calculatorFunnel.warnings.push('calculator_start has volume but calculator_result is zero.');
  }
  if (calculatorResults > calculatorStarts) {
    calculatorFunnel.warnings.push('calculator_result is higher than calculator_start; this may be normal if users run multiple calculations per start.');
  }
  calculatorFunnel.status = calculatorFunnel.warnings.length ? 'pass_with_notes' : 'pass';

  const contactFunnel = validateFunnel('Contact funnel', {
    formStart: formStarts,
    contactSubmitSuccess: contactSubmits,
    contactSuccessFormStartRatio: ratio(contactSubmits, formStarts)
  });
  contactFunnel.warnings.push('form_start is global and may include non-contact forms.');
  if (formStarts > 0 && contactSubmits === 0) {
    contactFunnel.warnings.push('form_start has volume but contact_form_submit_success is zero.');
  }
  contactFunnel.status = contactSubmits > 0 ? 'pass_with_context' : 'warning';

  return { quoteFunnel, calculatorFunnel, contactFunnel };
}

function buildPageFlowValidation(pageRows) {
  const byEvent = new Map();
  for (const row of pageRows) {
    if (!byEvent.has(row.eventName)) byEvent.set(row.eventName, []);
    byEvent.get(row.eventName).push(row);
  }

  return Object.entries(EXPECTED_PAGE_MAP).map(([eventName, expectedPages]) => {
    if (expectedPages.includes('public/global')) {
      return {
        eventName,
        expectedPages,
        observedPages: [],
        status: 'not_checked',
        notes: 'Global engagement events are not constrained to a single page.'
      };
    }
    const rows = byEvent.get(eventName) || [];
    const observedPages = rows.map((row) => ({
      pagePath: row.pagePath,
      pageTitle: row.pageTitle,
      eventCount: row.eventCount,
      classification: expectedPages.includes(row.pagePath) ? 'expected_page' : 'unexpected_page'
    }));
    const expectedFound = observedPages.some((row) => row.classification === 'expected_page');
    const unexpectedFound = observedPages.some((row) => row.classification === 'unexpected_page');
    return {
      eventName,
      expectedPages,
      observedPages,
      status: expectedFound && !unexpectedFound
        ? 'expected_page'
        : (expectedFound ? 'expected_page_with_additional_pages' : 'not_observed_on_expected_page'),
      notes: rows.length ? '' : 'No page rows were returned for this event in the analyzed range.'
    };
  });
}

function buildDuplicateRisk(funnels, counts) {
  const signals = [];
  let riskLevel = 'low';

  if ((funnels.quoteFunnel.steps.submitStartRatio || 0) > 1.25) {
    signals.push('Quote submit/start ratio is above 1.25.');
    riskLevel = 'medium';
  }
  if ((counts.quote_request_submit_success || 0) > 0 && (counts.quote_request_start || 0) === 0) {
    signals.push('Quote submits exist while starts are zero.');
    riskLevel = 'high';
  }
  if ((funnels.calculatorFunnel.steps.calculatorResultStartRatio || 0) > 5) {
    signals.push('Calculator result/start ratio is above 5.');
    if (riskLevel === 'low') riskLevel = 'medium';
  }
  if (!signals.length) signals.push('No aggregate duplicate-risk signal was detected.');

  return {
    riskLevel,
    signals,
    limitations: [
      'Exact duplicate detection is intentionally limited because this phase does not query user IDs, client IDs, session IDs, or PII.',
      'Multiple calculator_query or calculator_result events per calculator_start can be normal user behavior.'
    ]
  };
}

function buildUnexpectedEventValidation(observedRows) {
  const observedNames = new Set(observedRows.map((row) => row.eventName));
  const expectedSet = new Set(EXPECTED_EVENTS);
  const expectedObserved = EXPECTED_EVENTS.filter((eventName) => observedNames.has(eventName));
  const expectedNotObserved = EXPECTED_EVENTS.filter((eventName) => !observedNames.has(eventName));
  const unexpectedObserved = observedRows
    .filter((row) => !expectedSet.has(row.eventName) && !COMMON_GA4_EVENTS.has(row.eventName))
    .slice(0, 50);
  const legacyAliasesObserved = LEGACY_ALIASES
    .filter((eventName) => observedNames.has(eventName))
    .map((eventName) => ({
      eventName,
      count: observedRows.find((row) => row.eventName === eventName)?.count || 0,
      status: 'warning'
    }));

  return {
    expectedObserved,
    expectedNotObserved,
    unexpectedObserved,
    legacyAliasesObserved,
    status: legacyAliasesObserved.length ? 'warning' : 'pass'
  };
}

function paidMediaReadiness(report) {
  const coreObserved = CORE_CONVERSION_EVENTS.every((eventName) => {
    const item = report.eventVolumeValidation.find((candidate) => candidate.eventName === eventName);
    return item && item.last7DaysCount > 0;
  });
  const attributionObserved = report.attributionQuality.sourceMediumCoverage.status === 'observed'
    || report.attributionQuality.utmContentCoverage.status === 'observed'
    || report.attributionQuality.attributionTouchDistribution.length > 0;

  return {
    ga4Reporting: coreObserved ? 'ready' : 'ready_with_limitations',
    googleAdsImportPlanning: coreObserved && attributionObserved ? 'ready_with_limitations' : 'not_ready',
    lookerStudioDashboardPlanning: 'ready',
    metaPixelPlanning: 'ready_for_planning_only'
  };
}

function baseReport(root) {
  const propertyId = envValue('GA4_PROPERTY_ID');
  const measurementId = envValue('GA4_MEASUREMENT_ID') || EXPECTED.ga4MeasurementId;
  return {
    generatedAt: new Date().toISOString(),
    phase: '3A-2',
    mode: 'ga4_event_processing_validation_read_only',
    sourceArtifacts: [...SOURCE_ARTIFACTS],
    sourceArtifactAvailability: sourceArtifactAvailability(root),
    property: {
      propertyId: propertyId || '',
      measurementId,
      reachable: false,
      measurementIdConfirmed: false
    },
    dateRanges: {
      last24Hours: {
        startDate: 'today',
        endDate: 'today',
        limitation: 'GA4 Data API standard reports are date-based; today is used as the closest read-only proxy for last 24 hours.'
      },
      today: { startDate: 'today', endDate: 'today' },
      yesterday: { startDate: 'yesterday', endDate: 'yesterday' },
      last7Days: { startDate: '7daysAgo', endDate: 'today' }
    },
    eventVolumeValidation: [],
    funnelValidation: {
      quoteFunnel: null,
      calculatorFunnel: null,
      contactFunnel: null,
      status: 'not_checked'
    },
    pageFlowValidation: {
      status: 'not_checked',
      results: [],
      limitations: []
    },
    attributionQuality: {
      status: 'not_checked',
      sourceMediumCoverage: null,
      campaignCoverage: null,
      defaultChannelGroupDistribution: [],
      utmContentCoverage: null,
      utmTermCoverage: null,
      gclidPresentCount: 0,
      fbclidPresentCount: 0,
      attributionTouchDistribution: [],
      limitations: []
    },
    duplicateRiskValidation: {
      riskLevel: 'not_assessed_due_to_api_limitations',
      signals: [],
      limitations: []
    },
    unexpectedEventValidation: {
      expectedObserved: [],
      expectedNotObserved: [],
      unexpectedObserved: [],
      legacyAliasesObserved: [],
      status: 'not_checked'
    },
    paidMediaReadiness: {
      ga4Reporting: 'blocked',
      googleAdsImportPlanning: 'blocked',
      lookerStudioDashboardPlanning: 'blocked',
      metaPixelPlanning: 'blocked'
    },
    safety: {
      ga4WritesMade: false,
      gtmWritesMade: false,
      gtmPublished: false,
      googleAdsTouched: false,
      metaTouched: false,
      runtimeFilesTouched: false,
      websiteRuntimeFilesTouched: false,
      secretsPrinted: false,
      tokensPrinted: false,
      piiQueried: false,
      piiPrinted: false,
      rawClickIdsQueried: false,
      rawClickIdsPrinted: false
    },
    validationStatus: 'fail',
    limitations: [],
    recommendation: {
      nextPhase: 'Phase 3A-3 - Monitoring Dashboard Artifact'
    }
  };
}

function buildMarkdown(report) {
  return [
    '# CRBOX GA4 Event Processing Validation',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Phase: **3A-2**',
    '',
    'Mode: **ga4_event_processing_validation_read_only**',
    '',
    '## Executive Summary',
    '',
    `- Validation status: **${report.validationStatus}**`,
    `- GA4 property reachable: ${report.property.reachable}`,
    `- Measurement ID confirmed: ${report.property.measurementIdConfirmed}`,
    `- Funnel validation: ${report.funnelValidation.status}`,
    `- Page / flow validation: ${report.pageFlowValidation.status}`,
    `- Attribution quality: ${report.attributionQuality.status}`,
    `- Duplicate risk: ${report.duplicateRiskValidation.riskLevel}`,
    `- Unexpected / legacy event status: ${report.unexpectedEventValidation.status}`,
    '',
    '## Scope',
    '',
    '- Validate event volume and data quality after GTM version 4 publication.',
    '- Analyze aggregate funnel ratios and page/flow placement.',
    '- Analyze attribution quality through native GA4 dimensions and registered event-scoped custom dimensions.',
    '- Avoid user identifiers, session identifiers, PII, raw `gclid`, and raw `fbclid`.',
    '- Perform no GA4, GTM, Google Ads, Meta, or runtime writes.',
    '',
    '## Source Of Truth',
    '',
    ...report.sourceArtifactAvailability.map((item) => `- \`${item.path}\`: ${item.available ? 'available' : 'missing'}`),
    '',
    '## Date Ranges Analyzed',
    '',
    `- Last 24 hours proxy: ${report.dateRanges.last24Hours.startDate} to ${report.dateRanges.last24Hours.endDate}`,
    `- Today: ${report.dateRanges.today.startDate} to ${report.dateRanges.today.endDate}`,
    `- Yesterday: ${report.dateRanges.yesterday.startDate} to ${report.dateRanges.yesterday.endDate}`,
    `- Last 7 days: ${report.dateRanges.last7Days.startDate} to ${report.dateRanges.last7Days.endDate}`,
    `- Limitation: ${report.dateRanges.last24Hours.limitation}`,
    '',
    '## Event Volume Summary',
    '',
    '| Event | Today | Yesterday | Last 7 days | Status |',
    '|---|---:|---:|---:|---|',
    ...report.eventVolumeValidation.map((item) =>
      `| \`${item.eventName}\` | ${item.todayCount} | ${item.yesterdayCount} | ${item.last7DaysCount} | **${item.status}** |`
    ),
    '',
    '## Core Conversion Health',
    '',
    ...CORE_CONVERSION_EVENTS.map((eventName) => {
      const item = report.eventVolumeValidation.find((candidate) => candidate.eventName === eventName);
      return `- \`${eventName}\`: ${item ? item.status : 'not_checked'} (${item ? item.last7DaysCount : 0} in last 7 days)`;
    }),
    '',
    '## Funnel Validation',
    '',
    `- Overall status: ${report.funnelValidation.status}`,
    `- Quote funnel: ${report.funnelValidation.quoteFunnel?.status || 'not_checked'}`,
    `- Calculator funnel: ${report.funnelValidation.calculatorFunnel?.status || 'not_checked'}`,
    `- Contact funnel: ${report.funnelValidation.contactFunnel?.status || 'not_checked'}`,
    '',
    '### Funnel Details',
    '',
    '```json',
    JSON.stringify(report.funnelValidation, null, 2),
    '```',
    '',
    '## Page / Flow Validation',
    '',
    `Status: **${report.pageFlowValidation.status}**`,
    '',
    '| Event | Expected pages | Status |',
    '|---|---|---|',
    ...report.pageFlowValidation.results.map((item) =>
      `| \`${item.eventName}\` | ${item.expectedPages.map((page) => `\`${page}\``).join(', ')} | **${item.status}** |`
    ),
    '',
    '## Attribution Quality',
    '',
    `Status: **${report.attributionQuality.status}**`,
    '',
    `- Source/medium coverage: ${report.attributionQuality.sourceMediumCoverage?.percentageWithValue ?? 'not checked'}%`,
    `- Campaign coverage: ${report.attributionQuality.campaignCoverage?.percentageWithValue ?? 'not checked'}%`,
    `- UTM content coverage: ${report.attributionQuality.utmContentCoverage?.percentageWithValue ?? 'not checked'}%`,
    `- UTM term coverage: ${report.attributionQuality.utmTermCoverage?.percentageWithValue ?? 'not checked'}%`,
    `- gclid_present true count: ${report.attributionQuality.gclidPresentCount}`,
    `- fbclid_present true count: ${report.attributionQuality.fbclidPresentCount}`,
    '',
    'UTM source, medium, and campaign are represented through native GA4 acquisition dimensions because they are not currently registered as event-scoped custom dimensions.',
    '',
    '## Duplicate-risk Assessment',
    '',
    `Risk level: **${report.duplicateRiskValidation.riskLevel}**`,
    '',
    ...report.duplicateRiskValidation.signals.map((signal) => `- ${signal}`),
    '',
    '## Unexpected / Legacy Event Check',
    '',
    `Status: **${report.unexpectedEventValidation.status}**`,
    '',
    `- Expected observed: ${report.unexpectedEventValidation.expectedObserved.length}`,
    `- Expected not observed: ${report.unexpectedEventValidation.expectedNotObserved.length}`,
    `- Unexpected observed: ${report.unexpectedEventValidation.unexpectedObserved.length}`,
    `- Legacy aliases observed: ${report.unexpectedEventValidation.legacyAliasesObserved.length}`,
    '',
    '## Paid-media Readiness Interpretation',
    '',
    `- GA4 reporting: ${report.paidMediaReadiness.ga4Reporting}`,
    `- Google Ads import planning: ${report.paidMediaReadiness.googleAdsImportPlanning}`,
    `- Looker Studio dashboard planning: ${report.paidMediaReadiness.lookerStudioDashboardPlanning}`,
    `- Meta Pixel planning: ${report.paidMediaReadiness.metaPixelPlanning}`,
    '',
    '## Safety Confirmations',
    '',
    ...Object.entries(report.safety).map(([key, value]) => `- ${key}: ${value}`),
    '',
    'The GA4 Data API `runReport` method uses HTTP POST to execute read-only report queries. No GA4 configuration write endpoint is called.',
    '',
    '## Limitations',
    '',
    ...[...report.limitations, ...report.attributionQuality.limitations, ...report.duplicateRiskValidation.limitations].map((item) => `- ${item}`),
    '',
    '## Recommended Next Phase',
    '',
    report.recommendation.nextPhase
  ].join('\n') + '\n';
}

function writeArtifacts(root, report) {
  const jsonPath = path.join(root, 'docs', 'marketing-ops-ga4-event-processing-validation.json');
  const markdownPath = path.join(root, 'docs', 'marketing-ops-ga4-event-processing-validation.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(markdownPath, buildMarkdown(report), 'utf8');
  return { jsonPath, markdownPath };
}

function finalStatus(report) {
  if (!report.property.reachable || report.eventVolumeValidation.some((item) => item.status === 'api_unavailable')) {
    return 'fail';
  }
  const coreMissing = CORE_CONVERSION_EVENTS.some((eventName) => {
    const item = report.eventVolumeValidation.find((candidate) => candidate.eventName === eventName);
    return !item || item.last7DaysCount === 0;
  });
  if (coreMissing) return 'fail';
  if (report.duplicateRiskValidation.riskLevel === 'high') return 'partial';
  if (
    report.attributionQuality.status === 'partial'
    || report.duplicateRiskValidation.riskLevel === 'medium'
    || report.funnelValidation.status !== 'pass'
    || report.unexpectedEventValidation.status === 'warning'
  ) {
    return 'pass_with_limitations';
  }
  return 'pass';
}

async function runGa4EventProcessingValidation(root) {
  const report = baseReport(root);
  const missing = missingEnv(REQUIRED_ENV.ga4);
  const propertyId = envValue('GA4_PROPERTY_ID');
  const measurementId = envValue('GA4_MEASUREMENT_ID') || EXPECTED.ga4MeasurementId;

  const readiness = readJson(root, 'docs/marketing-ops-ga4-monitoring-readiness.json');
  if (!readiness || readiness.phase !== '3A-1' || readiness.readinessStatus !== 'pass') {
    report.limitations.push('Phase 3A-1 readiness artifact is missing or not passing.');
  }
  if (missing.length) {
    report.limitations.push(`Required environment variables are missing: ${missing.join(', ')}`);
    report.validationStatus = 'fail';
    return { report, paths: writeArtifacts(root, report) };
  }

  let accessToken;
  try {
    accessToken = await getGoogleAccessToken();
    const tokenInfo = await getGoogleTokenInfo(accessToken);
    const scopes = new Set(String(tokenInfo.scope || '').split(/\s+/).filter(Boolean));
    if (!scopes.has(ANALYTICS_READONLY_SCOPE)) {
      report.limitations.push(`Required OAuth scope is missing: ${ANALYTICS_READONLY_SCOPE}`);
      report.validationStatus = 'fail';
      return { report, paths: writeArtifacts(root, report) };
    }
  } catch (error) {
    report.limitations.push(conciseGoogleError(error));
    report.validationStatus = 'fail';
    return { report, paths: writeArtifacts(root, report) };
  }

  try {
    const propPath = propertyPath(propertyId);
    const [property, streamsData, keyEventsData] = await Promise.all([
      googleApiGet(`${ADMIN_BASE}/${propPath}`, accessToken),
      googleApiGet(`${ADMIN_BASE}/${propPath}/dataStreams?pageSize=200`, accessToken),
      listKeyEvents(accessToken, propPath)
    ]);
    const stream = (streamsData.dataStreams || []).find((item) =>
      item.type === 'WEB_DATA_STREAM'
      && item.webStreamData?.measurementId === measurementId
    );
    report.property = {
      propertyId,
      measurementId,
      reachable: Boolean(property?.name),
      measurementIdConfirmed: Boolean(stream) && measurementId === EXPECTED.ga4MeasurementId
    };
    const configuredKeyEvents = new Set(
      keyEventsData.items.map((item) => item.eventName).filter(Boolean)
    );

    const [todayCounts, yesterdayCounts, last7Counts, observedEvents, pageRows] = await Promise.all([
      readCountsByEvent(accessToken, propertyId, { startDate: 'today', endDate: 'today', name: 'today' }, VALIDATION_EVENTS),
      readCountsByEvent(accessToken, propertyId, { startDate: 'yesterday', endDate: 'yesterday', name: 'yesterday' }, VALIDATION_EVENTS),
      readCountsByEvent(accessToken, propertyId, { startDate: '7daysAgo', endDate: 'today', name: 'last_7_days' }, VALIDATION_EVENTS),
      readAllObservedEvents(accessToken, propertyId),
      readPageRows(accessToken, propertyId)
    ]);

    report.eventVolumeValidation = VALIDATION_EVENTS.map((eventName) => {
      const todayCount = todayCounts.get(eventName) || 0;
      const yesterdayCount = yesterdayCounts.get(eventName) || 0;
      const last7DaysCount = last7Counts.get(eventName) || 0;
      return {
        eventName,
        todayCount,
        yesterdayCount,
        last24HoursCount: todayCount,
        last7DaysCount,
        status: statusForEvent(eventName, last7DaysCount, configuredKeyEvents)
      };
    });

    const countObject = Object.fromEntries(
      report.eventVolumeValidation.map((item) => [item.eventName, item.last7DaysCount])
    );
    const funnels = buildFunnels(countObject);
    const funnelStatuses = Object.values(funnels).map((item) => item.status);
    report.funnelValidation = {
      ...funnels,
      status: funnelStatuses.every((status) => status === 'pass') ? 'pass' : 'pass_with_limitations'
    };
    report.pageFlowValidation.results = buildPageFlowValidation(pageRows);
    const pageStatuses = new Set(report.pageFlowValidation.results.map((item) => item.status));
    report.pageFlowValidation.status = pageStatuses.has('not_observed_on_expected_page')
      || pageStatuses.has('expected_page_with_additional_pages')
      ? 'pass_with_limitations'
      : 'pass';
    report.pageFlowValidation.limitations.push('Page checks use pagePath and pageTitle only; full URLs and query strings are not retained.');

    const totalCoreConversions = ATTRIBUTION_EVENTS.reduce(
      (sum, eventName) => sum + (last7Counts.get(eventName) || 0),
      0
    );
    const [
      sourceRows,
      mediumRows,
      campaignRows,
      channelRows,
      utmContentRows,
      utmTermRows,
      gclidPresentRows,
      fbclidPresentRows,
      attributionTouchRows
    ] = await Promise.all([
      readAttributionRows(accessToken, propertyId, 'source', 'keyEvents'),
      readAttributionRows(accessToken, propertyId, 'medium', 'keyEvents'),
      readAttributionRows(accessToken, propertyId, 'campaignName', 'keyEvents'),
      readAttributionRows(accessToken, propertyId, 'sessionDefaultChannelGroup', 'keyEvents'),
      readAttributionRows(accessToken, propertyId, 'customEvent:utm_content', 'eventCount'),
      readAttributionRows(accessToken, propertyId, 'customEvent:utm_term', 'eventCount'),
      readAttributionRows(accessToken, propertyId, 'customEvent:gclid_present', 'eventCount'),
      readAttributionRows(accessToken, propertyId, 'customEvent:fbclid_present', 'eventCount'),
      readAttributionRows(accessToken, propertyId, 'customEvent:attribution_touch', 'eventCount')
    ]);

    report.attributionQuality = {
      status: 'partial',
      sourceMediumCoverage: {
        source: summarizeCoverage(sourceRows, totalCoreConversions, 'keyEvents'),
        medium: summarizeCoverage(mediumRows, totalCoreConversions, 'keyEvents')
      },
      campaignCoverage: summarizeCoverage(campaignRows, totalCoreConversions, 'keyEvents'),
      defaultChannelGroupDistribution: distribution(channelRows),
      utmContentCoverage: summarizeCoverage(utmContentRows, totalCoreConversions, 'eventCount'),
      utmTermCoverage: summarizeCoverage(utmTermRows, totalCoreConversions, 'eventCount'),
      gclidPresentCount: booleanTrueCount(gclidPresentRows),
      fbclidPresentCount: booleanTrueCount(fbclidPresentRows),
      attributionTouchDistribution: distribution(attributionTouchRows),
      limitations: [
        '`utm_source`, `utm_medium`, and `utm_campaign` are not currently registered as event-scoped custom dimensions, so native GA4 source, medium, and campaign dimensions are used instead.',
        'Only aggregate attribution dimensions are queried; raw `gclid`, raw `fbclid`, user identifiers, session identifiers, and PII are not queried.'
      ]
    };
    const sourceObserved = report.attributionQuality.sourceMediumCoverage.source.status === 'observed'
      && report.attributionQuality.sourceMediumCoverage.medium.status === 'observed';
    const campaignObserved = report.attributionQuality.campaignCoverage.status === 'observed';
    const customAttributionObserved = report.attributionQuality.utmContentCoverage.status === 'observed'
      || report.attributionQuality.utmTermCoverage.status === 'observed'
      || report.attributionQuality.attributionTouchDistribution.length > 0;
    report.attributionQuality.status = sourceObserved && campaignObserved && customAttributionObserved
      ? 'pass_with_limitations'
      : 'partial';

    report.duplicateRiskValidation = buildDuplicateRisk(funnels, countObject);
    report.unexpectedEventValidation = buildUnexpectedEventValidation(observedEvents);
    report.paidMediaReadiness = paidMediaReadiness(report);
    report.validationStatus = finalStatus(report);
  } catch (error) {
    report.limitations.push(conciseGoogleError(error));
    report.eventVolumeValidation = VALIDATION_EVENTS.map((eventName) => ({
      eventName,
      todayCount: null,
      yesterdayCount: null,
      last24HoursCount: null,
      last7DaysCount: null,
      status: 'api_unavailable'
    }));
    report.validationStatus = 'fail';
  }

  return { report, paths: writeArtifacts(root, report) };
}

function summaryLines(run) {
  const { report, paths } = run;
  return [
    `GA4 event processing validation: ${String(report.validationStatus).toUpperCase()}`,
    `- Property reachable: ${report.property.reachable}`,
    `- Measurement ID confirmed: ${report.property.measurementIdConfirmed}`,
    `- Funnel validation: ${report.funnelValidation.status}`,
    `- Page/flow validation: ${report.pageFlowValidation.status}`,
    `- Attribution quality: ${report.attributionQuality.status}`,
    `- Duplicate risk: ${report.duplicateRiskValidation.riskLevel}`,
    `- Unexpected/legacy events: ${report.unexpectedEventValidation.status}`,
    `- GA4 reporting readiness: ${report.paidMediaReadiness.ga4Reporting}`,
    '- GA4 writes made: false',
    '- GTM writes made: false',
    '- GTM published: false',
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`
  ];
}

module.exports = {
  runGa4EventProcessingValidation,
  summaryLines
};
