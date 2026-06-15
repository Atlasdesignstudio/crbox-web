'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-ga4-monitoring-readiness.json',
  'docs/marketing-ops-ga4-monitoring-readiness.md',
  'docs/marketing-ops-ga4-event-processing-validation.json',
  'docs/marketing-ops-ga4-event-processing-validation.md',
  'docs/marketing-ops-gtm-publish-result.json',
  'docs/marketing-ops-gtm-post-publish-smoke-test.json',
  'docs/measurement-map-v1.md',
  'docs/analytics-taxonomy.md'
]);

const CORE_EVENTS = Object.freeze([
  {
    eventName: 'quote_request_start',
    label: 'Quote request start',
    keyEvent: 'optional',
    paidMediaRelevance: 'Funnel start / micro-conversion'
  },
  {
    eventName: 'quote_request_submit_success',
    label: 'Quote request submit success',
    keyEvent: 'yes',
    paidMediaRelevance: 'Primary conversion'
  },
  {
    eventName: 'contact_form_submit_success',
    label: 'Contact form submit success',
    keyEvent: 'optional',
    paidMediaRelevance: 'Secondary lead-intent conversion'
  },
  {
    eventName: 'signup_success',
    label: 'Signup success',
    keyEvent: 'yes',
    paidMediaRelevance: 'Primary conversion'
  }
]);

const STATUS_LABELS = Object.freeze({
  pass: 'PASS',
  ready: 'READY',
  ready_with_limitations: 'READY WITH LIMITATIONS',
  partial: 'PARTIAL',
  warning: 'WARNING',
  blocked: 'BLOCKED',
  pass_with_limitations: 'READY WITH LIMITATIONS',
  low: 'LOW',
  ready_for_planning_only: 'READY FOR PLANNING ONLY',
  pass_with_notes: 'PASS WITH NOTES',
  pass_with_context: 'PASS WITH CONTEXT',
  healthy_recent_volume: 'HEALTHY RECENT VOLUME',
  low_volume_expected: 'LOW VOLUME EXPECTED',
  expected_page: 'EXPECTED PAGE',
  missing: 'MISSING',
  not_available: 'NOT AVAILABLE'
});

function readJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, `${content.replace(/\s+$/u, '')}\n`);
}

function statusLabel(status) {
  return STATUS_LABELS[status] || String(status || 'not_available').replace(/_/g, ' ').toUpperCase();
}

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('blocked') || value.includes('fail') || value.includes('high')) return 'bad';
  if (value.includes('warning') || value.includes('partial') || value.includes('limitation') || value.includes('medium')) return 'warn';
  if (value.includes('ready') || value.includes('pass') || value.includes('healthy') || value === 'low') return 'good';
  return 'neutral';
}

function availability(root) {
  return SOURCE_ARTIFACTS.map((relativePath) => ({
    path: relativePath,
    available: fs.existsSync(path.join(root, relativePath))
  }));
}

function eventVolume(processing, eventName) {
  return (processing?.eventVolumeValidation || []).find((event) => event.eventName === eventName) || null;
}

function pageFlow(processing, eventName) {
  return (processing?.pageFlowValidation?.results || []).find((event) => event.eventName === eventName) || null;
}

function keyEventStatus(readiness, eventName) {
  const item = (readiness?.expectedKeyEvents || []).find((event) => event.eventName === eventName);
  return item?.status || 'not_available';
}

function buildSystemHealth(readiness, processing, publish, smoke) {
  const checks = [
    {
      label: 'GA4 Data API available',
      status: readiness?.readinessStatus === 'pass' ? 'pass' : 'not_available',
      detail: readiness?.readinessStatus || 'not_available'
    },
    {
      label: 'GA4 property reachable',
      status: readiness?.property?.reachable ? 'pass' : 'blocked',
      detail: readiness?.property?.propertyId || 'not_available'
    },
    {
      label: 'Measurement ID confirmed',
      status: readiness?.property?.measurementIdConfirmed ? 'pass' : 'blocked',
      detail: readiness?.property?.measurementId || 'not_available'
    },
    {
      label: 'GTM Version 4 published',
      status: publish?.publishedVersion?.versionId === '4' ? 'pass' : 'not_available',
      detail: publish?.publishedVersion?.versionId || 'not_available'
    },
    {
      label: 'Previous GTM version 3 captured',
      status: publish?.publishedVersion?.previousLiveVersionId === '3' ? 'pass' : 'not_available',
      detail: publish?.publishedVersion?.previousLiveVersionId || 'not_available'
    },
    {
      label: 'Rollback available',
      status: smoke?.publishedVersion?.rollbackAvailable ? 'pass' : 'warning',
      detail: smoke?.publishedVersion?.rollbackAvailable ? 'yes' : 'not_available'
    },
    {
      label: 'Phase 2R smoke test',
      status: smoke?.finalStatus || smoke?.status || 'not_available',
      detail: smoke?.phase || 'not_available'
    },
    {
      label: 'Phase 3A-1 readiness',
      status: readiness?.readinessStatus || 'not_available',
      detail: readiness?.phase || 'not_available'
    },
    {
      label: 'Phase 3A-2 validation',
      status: processing?.validationStatus || 'not_available',
      detail: processing?.phase || 'not_available'
    }
  ];

  return {
    status: checks.some((check) => statusClass(check.status) === 'bad')
      ? 'blocked'
      : checks.some((check) => statusClass(check.status) === 'warn')
        ? 'ready_with_limitations'
        : 'ready',
    checks
  };
}

function buildCoreConversionHealth(readiness, processing) {
  return {
    status: processing?.validationStatus === 'pass' ? 'ready' : 'ready_with_limitations',
    events: CORE_EVENTS.map((definition) => {
      const volume = eventVolume(processing, definition.eventName);
      const flow = pageFlow(processing, definition.eventName);
      const configuredKeyEvent = keyEventStatus(readiness, definition.eventName);
      const observedRecently = (volume?.last7DaysCount || 0) > 0;
      return {
        eventName: definition.eventName,
        label: definition.label,
        observedRecently,
        keyEvent: definition.keyEvent,
        keyEventConfigured: configuredKeyEvent,
        recentVolumeStatus: volume?.status || 'not_available',
        todayCount: volume?.todayCount ?? 'not_available',
        last7DaysCount: volume?.last7DaysCount ?? 'not_available',
        pageFlowStatus: flow?.status || 'not_available',
        paidMediaRelevance: definition.paidMediaRelevance,
        notes: observedRecently
          ? 'Observed in the recent GA4 validation window.'
          : 'Not observed in the recent validation window; interpret with low-volume context.'
      };
    })
  };
}

function buildFunnelHealth(processing) {
  const funnel = processing?.funnelValidation || {};
  return {
    status: funnel.status || 'not_available',
    quoteFunnel: {
      ...funnel.quoteFunnel,
      interpretation: 'Quote submit/start ratio is useful directionally, but volume is still low.'
    },
    calculatorFunnel: {
      ...funnel.calculatorFunnel,
      interpretation: 'Calculator ratios are directional; multiple queries/results per calculator start can be normal.'
    },
    contactFunnel: {
      ...funnel.contactFunnel,
      interpretation: 'Contact ratio is directional because form_start is global and may include non-contact forms.'
    }
  };
}

function buildAttributionQuality(readiness, processing) {
  const observed = new Set(
    (readiness?.attributionObservability?.checkedDimensions || [])
      .filter((dimension) => dimension.status === 'observed')
      .map((dimension) => dimension.dimension)
  );
  const processingAttribution = processing?.attributionQuality || {};
  return {
    status: processingAttribution.status || readiness?.attributionObservability?.status || 'not_available',
    fields: [
      { field: 'source', observed: observed.has('source'), note: 'Native GA4 source is available.' },
      { field: 'medium', observed: observed.has('medium'), note: 'Native GA4 medium is available.' },
      { field: 'campaign', observed: observed.has('campaign'), note: 'Native GA4 campaign is available.' },
      { field: 'utm_content', observed: observed.has('utm_content'), note: 'Registered event-scoped custom dimension.' },
      { field: 'utm_term', observed: observed.has('utm_term'), note: 'Registered event-scoped custom dimension.' },
      { field: 'gclid_present', observed: observed.has('gclid_present'), note: 'Boolean click-ID presence only; raw ID is excluded.' },
      { field: 'fbclid_present', observed: observed.has('fbclid_present'), note: 'Boolean click-ID presence only; raw ID is excluded.' },
      { field: 'attribution_touch', observed: observed.has('attribution_touch'), note: 'Registered attribution touch custom dimension.' }
    ],
    sourceMediumCoverage: processingAttribution.sourceMediumCoverage || 'not_available',
    campaignCoverage: processingAttribution.campaignCoverage || 'not_available',
    utmContentCoverage: processingAttribution.utmContentCoverage || 'not_available',
    utmTermCoverage: processingAttribution.utmTermCoverage || 'not_available',
    gclidPresentCount: processingAttribution.gclidPresentCount ?? 'not_available',
    fbclidPresentCount: processingAttribution.fbclidPresentCount ?? 'not_available',
    attributionTouchDistribution: processingAttribution.attributionTouchDistribution || [],
    limitations: [
      '`utm_source`, `utm_medium`, and `utm_campaign` are not currently registered as GA4 event-scoped custom dimensions.',
      'Native GA4 source, medium, and campaign are available.',
      'Attribution is usable but not fully enriched yet.'
    ]
  };
}

function buildPaidMediaReadiness(processing) {
  const readiness = processing?.paidMediaReadiness || {};
  return {
    ga4Reporting: {
      status: readiness.ga4Reporting || 'not_available',
      available: 'Core conversion events, event volume, funnels, attribution, and taxonomy coverage are readable.',
      remains: 'Continue monitoring low-volume conversion events as paid traffic scales.'
    },
    googleAdsImportPlanning: {
      status: readiness.googleAdsImportPlanning || 'not_available',
      available: 'Primary conversion candidates are visible and key-event configuration exists for quote_request_submit_success and signup_success.',
      remains: 'Finalize the conversion map before importing or optimizing against ad-platform conversions.'
    },
    lookerStudioDashboardPlanning: {
      status: readiness.lookerStudioDashboardPlanning || 'not_available',
      available: 'Dashboard-ready aggregate fields exist for health, funnels, attribution, and data quality.',
      remains: 'Define audience-specific views and reporting cadence.'
    },
    metaPixelPlanning: {
      status: readiness.metaPixelPlanning || 'not_available',
      available: 'Meta planning can use the validated event taxonomy and conversion priority map.',
      remains: 'Do not implement Meta events until a separate approved planning/execution phase.'
    }
  };
}

function buildEventTaxonomyCoverage(processing) {
  const taxonomy = processing?.unexpectedEventValidation || {};
  return {
    status: taxonomy.status || 'not_available',
    expectedObserved: taxonomy.expectedObserved || [],
    expectedNotObserved: taxonomy.expectedNotObserved || [],
    unexpectedObserved: taxonomy.unexpectedObserved || [],
    legacyAliasesObserved: taxonomy.legacyAliasesObserved || [],
    interpretation: {
      phone_click: 'Not critical unless phone CTA becomes a paid-media KPI.',
      invoice_upload_error: 'Expected to be absent during healthy operation because it is an error event.'
    }
  };
}

function buildDuplicateAndDataQuality(processing) {
  const duplicate = processing?.duplicateRiskValidation || {};
  return {
    duplicateRisk: duplicate.riskLevel || 'not_available',
    signals: duplicate.signals || [],
    limitations: [
      ...(duplicate.limitations || []),
      'Low conversion volume limits statistical confidence.',
      'Duplicate-risk analysis is conservative and privacy-safe.'
    ],
    privacy: [
      'No raw gclid/fbclid queried or printed.',
      'No PII queried or printed.',
      'No user, client, or session identifiers are included in the dashboard artifact.'
    ]
  };
}

function buildRecommendedNextActions() {
  return {
    immediateMonitoring: [
      'Monitor GA4 Realtime.',
      'Monitor GA4 DebugView.',
      'Monitor key events.',
      'Monitor unexpected spikes or drops.',
      'Monitor duplicate behavior.'
    ],
    nextTechnicalPhaseOptions: [
      'Phase 3A-4: Looker Studio / Dashboard Planning Spec',
      'Phase 3B: Paid Media Conversion Map',
      'Phase 3C: Google Ads Linking / Import Planning'
    ],
    recommendedNextPhase: 'Phase 3B - Paid Media Conversion Map',
    rationale: [
      'Define primary conversions.',
      'Define secondary conversions.',
      'Define diagnostic events.',
      'Define optimization rules.',
      'Decide what should and should not be imported into ad platforms before connecting Google Ads.'
    ]
  };
}

function buildDashboard(root) {
  const readiness = readJson(root, 'docs/marketing-ops-ga4-monitoring-readiness.json');
  const processing = readJson(root, 'docs/marketing-ops-ga4-event-processing-validation.json');
  const publish = readJson(root, 'docs/marketing-ops-gtm-publish-result.json');
  const smoke = readJson(root, 'docs/marketing-ops-gtm-post-publish-smoke-test.json');
  const generatedAt = new Date().toISOString();
  const systemHealth = buildSystemHealth(readiness, processing, publish, smoke);
  const coreConversionHealth = buildCoreConversionHealth(readiness, processing);
  const funnelHealth = buildFunnelHealth(processing);
  const attributionQuality = buildAttributionQuality(readiness, processing);
  const paidMediaReadiness = buildPaidMediaReadiness(processing);
  const eventTaxonomyCoverage = buildEventTaxonomyCoverage(processing);
  const duplicateAndDataQuality = buildDuplicateAndDataQuality(processing);

  return {
    generatedAt,
    phase: '3A-3',
    mode: 'ga4_monitoring_dashboard_artifact',
    sourceArtifacts: SOURCE_ARTIFACTS,
    sourceArtifactAvailability: availability(root),
    project: 'CRBOX',
    dashboardType: 'GA4 Monitoring Dashboard Artifact',
    overallStatus: 'ready_with_limitations',
    summary: [
      'GA4 reporting and Looker Studio planning are ready.',
      'Google Ads import planning is ready with limitations and requires a conversion map before execution.',
      'Meta Pixel is ready for planning only.',
      'Attribution is usable but not fully enriched because some UTM fields are not registered as event-scoped GA4 custom dimensions.'
    ],
    systemHealth,
    coreConversionHealth,
    funnelHealth,
    attributionQuality,
    paidMediaReadiness,
    eventTaxonomyCoverage,
    duplicateAndDataQuality,
    limitations: [
      'The dashboard is generated from existing local read-only artifacts and does not independently re-query GA4.',
      'Some conversion events are low-volume before paid campaigns launch.',
      'Attribution is partially observable; utm_source, utm_medium, and utm_campaign are not directly queryable as event-scoped custom dimensions.',
      'Duplicate-risk checks are aggregate and privacy-safe, not user-level duplicate detection.'
    ],
    recommendedNextActions: buildRecommendedNextActions(),
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
      piiPrinted: false,
      rawClickIdsPrinted: false
    }
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' |')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');
}

function formatValue(value) {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  if (value === null || value === undefined || value === '') return 'not_available';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function buildMarkdown(report) {
  const systemRows = report.systemHealth.checks.map((check) => [
    check.label,
    statusLabel(check.status),
    formatValue(check.detail)
  ]);
  const conversionRows = report.coreConversionHealth.events.map((event) => [
    event.eventName,
    event.observedRecently ? 'yes' : 'no',
    event.keyEvent,
    statusLabel(event.recentVolumeStatus),
    statusLabel(event.pageFlowStatus),
    event.paidMediaRelevance
  ]);
  const attributionRows = report.attributionQuality.fields.map((field) => [
    field.field,
    field.observed ? 'yes' : 'no',
    field.note
  ]);
  const paidMediaRows = Object.entries(report.paidMediaReadiness).map(([channel, item]) => [
    channel,
    statusLabel(item.status),
    item.available,
    item.remains
  ]);

  return [
    '# CRBOX GA4 Monitoring Dashboard Artifact',
    '',
    '## Executive summary',
    '',
    `- Project: ${report.project}`,
    `- Phase: ${report.phase}`,
    `- Dashboard type: ${report.dashboardType}`,
    `- Generated: ${report.generatedAt}`,
    `- Overall status: ${statusLabel(report.overallStatus)}`,
    ...report.summary.map((item) => `- ${item}`),
    '',
    '## System health',
    '',
    markdownTable(['Check', 'Status', 'Detail'], systemRows),
    '',
    '## Conversion health',
    '',
    markdownTable(
      ['Event', 'Observed recently', 'Key event', 'Recent volume', 'Page/flow', 'Paid-media relevance'],
      conversionRows
    ),
    '',
    '## Funnel health',
    '',
    `- Overall funnel status: ${statusLabel(report.funnelHealth.status)}`,
    `- Quote funnel: ${statusLabel(report.funnelHealth.quoteFunnel?.status)}. ${report.funnelHealth.quoteFunnel?.interpretation}`,
    `- Calculator funnel: ${statusLabel(report.funnelHealth.calculatorFunnel?.status)}. ${report.funnelHealth.calculatorFunnel?.interpretation}`,
    `- Contact funnel: ${statusLabel(report.funnelHealth.contactFunnel?.status)}. ${report.funnelHealth.contactFunnel?.interpretation}`,
    '',
    '## Attribution quality',
    '',
    `- Status: ${statusLabel(report.attributionQuality.status)}`,
    markdownTable(['Field', 'Observed', 'Note'], attributionRows),
    '',
    'Limitations:',
    ...report.attributionQuality.limitations.map((item) => `- ${item}`),
    '',
    '## Paid-media readiness',
    '',
    markdownTable(['Area', 'Status', 'Available now', 'Remaining before execution'], paidMediaRows),
    '',
    '## Event taxonomy coverage',
    '',
    `- Status: ${statusLabel(report.eventTaxonomyCoverage.status)}`,
    `- Expected events observed: ${report.eventTaxonomyCoverage.expectedObserved.length}`,
    `- Expected events not observed: ${report.eventTaxonomyCoverage.expectedNotObserved.join(', ') || 'none'}`,
    `- Legacy aliases observed: ${report.eventTaxonomyCoverage.legacyAliasesObserved.length}`,
    `- Unexpected events observed: ${report.eventTaxonomyCoverage.unexpectedObserved.map((event) => event.eventName).join(', ') || 'none'}`,
    '',
    'Interpretation:',
    '- phone_click not observed is not critical unless phone CTA becomes a paid-media KPI.',
    '- invoice_upload_error not observed is expected during healthy operation because it is an error event.',
    '',
    '## Data quality',
    '',
    `- Duplicate risk: ${statusLabel(report.duplicateAndDataQuality.duplicateRisk)}`,
    ...report.duplicateAndDataQuality.signals.map((item) => `- ${item}`),
    ...report.duplicateAndDataQuality.privacy.map((item) => `- ${item}`),
    '',
    '## Limitations',
    '',
    ...report.limitations.map((item) => `- ${item}`),
    '',
    '## Recommended next actions',
    '',
    'Immediate monitoring:',
    ...report.recommendedNextActions.immediateMonitoring.map((item) => `- ${item}`),
    '',
    `Recommended next phase: ${report.recommendedNextActions.recommendedNextPhase}`,
    ...report.recommendedNextActions.rationale.map((item) => `- ${item}`),
    '',
    '## Safety confirmations',
    '',
    '- No GA4 writes made.',
    '- No GTM writes made.',
    '- GTM not published.',
    '- No Google Ads touched.',
    '- No Meta touched.',
    '- No Replit/runtime files touched.',
    '- No website runtime files touched.',
    '- No secrets printed.',
    '- No tokens printed.',
    '- No PII printed.',
    '- No raw click IDs printed.'
  ].join('\n');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function chip(status) {
  return `<span class="chip ${statusClass(status)}">${escapeHtml(statusLabel(status))}</span>`;
}

function htmlRows(rows) {
  return rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('\n');
}

function buildHtml(report) {
  const systemCards = report.systemHealth.checks.map((check) => `
      <article class="card">
        <div class="kicker">${escapeHtml(check.label)}</div>
        ${chip(check.status)}
        <p>${escapeHtml(formatValue(check.detail))}</p>
      </article>`).join('\n');
  const conversionRows = report.coreConversionHealth.events.map((event) => [
    `<strong>${escapeHtml(event.eventName)}</strong>`,
    escapeHtml(event.observedRecently ? 'yes' : 'no'),
    escapeHtml(event.keyEvent),
    chip(event.recentVolumeStatus),
    chip(event.pageFlowStatus),
    escapeHtml(event.paidMediaRelevance)
  ]);
  const attributionRows = report.attributionQuality.fields.map((field) => [
    escapeHtml(field.field),
    escapeHtml(field.observed ? 'yes' : 'no'),
    escapeHtml(field.note)
  ]);
  const paidCards = Object.entries(report.paidMediaReadiness).map(([key, item]) => `
      <article class="card">
        <div class="kicker">${escapeHtml(key.replace(/([A-Z])/g, ' $1'))}</div>
        ${chip(item.status)}
        <p><strong>Available:</strong> ${escapeHtml(item.available)}</p>
        <p><strong>Remaining:</strong> ${escapeHtml(item.remains)}</p>
      </article>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRBOX GA4 Monitoring Dashboard Artifact</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --text: #17202a;
      --muted: #5d6875;
      --line: #d9dee5;
      --good: #0f7a4f;
      --good-bg: #e8f6ef;
      --warn: #926200;
      --warn-bg: #fff4d8;
      --bad: #a33131;
      --bad-bg: #fde8e8;
      --neutral: #4b5563;
      --neutral-bg: #eef1f5;
      --accent: #275d8c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    header {
      background: #12344d;
      color: #fff;
      padding: 32px max(24px, calc((100vw - 1180px) / 2));
    }
    main {
      width: min(1180px, calc(100% - 32px));
      margin: 24px auto 40px;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 { font-size: clamp(1.8rem, 3vw, 3rem); margin-bottom: 8px; letter-spacing: 0; }
    h2 { margin: 28px 0 14px; font-size: 1.35rem; }
    h3 { margin-bottom: 8px; font-size: 1.05rem; }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 20px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .card, .table-wrap, .note {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }
    .card p { color: var(--muted); margin-bottom: 0; }
    .kicker {
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      white-space: normal;
    }
    .chip.good { color: var(--good); background: var(--good-bg); }
    .chip.warn { color: var(--warn); background: var(--warn-bg); }
    .chip.bad { color: var(--bad); background: var(--bad-bg); }
    .chip.neutral { color: var(--neutral); background: var(--neutral-bg); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }
    th, td {
      padding: 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th { color: var(--muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
    ul { margin: 0; padding-left: 20px; }
    footer {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto 32px;
      color: var(--muted);
      font-size: 0.86rem;
    }
    @media (max-width: 860px) {
      .summary, .grid, .grid.two { grid-template-columns: 1fr; }
      .table-wrap { overflow-x: auto; }
      th, td { min-width: 150px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="kicker">CRBOX · Phase ${escapeHtml(report.phase)}</div>
    <h1>GA4 Monitoring Dashboard Artifact</h1>
    <p>${escapeHtml(report.summary.join(' '))}</p>
    <div class="summary">
      <div>${chip(report.overallStatus)}<p>Overall status</p></div>
      <div>${chip(report.systemHealth.status)}<p>System health</p></div>
      <div>${chip(report.duplicateAndDataQuality.duplicateRisk)}<p>Duplicate risk</p></div>
      <div>${chip(report.paidMediaReadiness.googleAdsImportPlanning.status)}<p>Google Ads import planning</p></div>
    </div>
  </header>
  <main>
    <section>
      <h2>System health</h2>
      <div class="grid">${systemCards}</div>
    </section>
    <section>
      <h2>Core conversion health</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Observed</th><th>Key event</th><th>Volume</th><th>Page / flow</th><th>Paid-media relevance</th></tr></thead>
          <tbody>${htmlRows(conversionRows)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Funnel health</h2>
      <div class="grid">
        <article class="card"><h3>Quote funnel</h3>${chip(report.funnelHealth.quoteFunnel?.status)}<p>${escapeHtml(report.funnelHealth.quoteFunnel?.interpretation || '')}</p></article>
        <article class="card"><h3>Calculator funnel</h3>${chip(report.funnelHealth.calculatorFunnel?.status)}<p>${escapeHtml(report.funnelHealth.calculatorFunnel?.interpretation || '')}</p></article>
        <article class="card"><h3>Contact funnel</h3>${chip(report.funnelHealth.contactFunnel?.status)}<p>${escapeHtml(report.funnelHealth.contactFunnel?.interpretation || '')}</p></article>
      </div>
    </section>
    <section>
      <h2>Attribution quality</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Field</th><th>Observed</th><th>Note</th></tr></thead>
          <tbody>${htmlRows(attributionRows)}</tbody>
        </table>
      </div>
      <div class="note"><ul>${report.attributionQuality.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Paid-media readiness</h2>
      <div class="grid two">${paidCards}</div>
    </section>
    <section>
      <h2>Event taxonomy coverage</h2>
      <div class="grid two">
        <article class="card"><h3>Coverage</h3>${chip(report.eventTaxonomyCoverage.status)}<p>Observed ${report.eventTaxonomyCoverage.expectedObserved.length} expected events. Legacy aliases observed: ${report.eventTaxonomyCoverage.legacyAliasesObserved.length}.</p></article>
        <article class="card"><h3>Not observed</h3><p>${escapeHtml(report.eventTaxonomyCoverage.expectedNotObserved.join(', ') || 'none')}</p><p>phone_click is not critical unless phone CTA becomes a KPI; invoice_upload_error is expected to be absent during healthy operation.</p></article>
      </div>
    </section>
    <section>
      <h2>Data quality and duplicate risk</h2>
      <div class="note">
        <p>${chip(report.duplicateAndDataQuality.duplicateRisk)}</p>
        <ul>${[...report.duplicateAndDataQuality.signals, ...report.duplicateAndDataQuality.privacy].map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    </section>
    <section>
      <h2>Recommended next actions</h2>
      <div class="grid two">
        <article class="card"><h3>Immediate monitoring</h3><ul>${report.recommendedNextActions.immediateMonitoring.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>
        <article class="card"><h3>Next phase</h3><p><strong>${escapeHtml(report.recommendedNextActions.recommendedNextPhase)}</strong></p><ul>${report.recommendedNextActions.rationale.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>
      </div>
    </section>
    <section>
      <h2>Safety confirmations</h2>
      <div class="note">
        <ul>
          <li>No GA4 writes made.</li>
          <li>No GTM writes made.</li>
          <li>GTM not published.</li>
          <li>No Google Ads or Meta touched.</li>
          <li>No Replit/runtime or website runtime files touched.</li>
          <li>No secrets, tokens, PII, or raw click IDs printed.</li>
        </ul>
      </div>
    </section>
  </main>
  <footer>
    Generated ${escapeHtml(report.generatedAt)} from local source artifacts: ${escapeHtml(report.sourceArtifacts.join(', '))}.
  </footer>
</body>
</html>`;
}

function writeDashboard(root, report) {
  const paths = {
    jsonPath: path.join(root, 'docs/marketing-ops-ga4-monitoring-dashboard.json'),
    markdownPath: path.join(root, 'docs/marketing-ops-ga4-monitoring-dashboard.md'),
    htmlPath: path.join(root, 'docs/marketing-ops-ga4-monitoring-dashboard.html')
  };
  writeJson(paths.jsonPath, report);
  writeText(paths.markdownPath, buildMarkdown(report));
  writeText(paths.htmlPath, buildHtml(report));
  return paths;
}

function runGa4MonitoringDashboard(root) {
  const report = buildDashboard(root);
  const paths = writeDashboard(root, report);
  return { report, paths };
}

function summaryLines(result) {
  const { report, paths } = result;
  return [
    `GA4 monitoring dashboard: ${statusLabel(report.overallStatus)}`,
    `- System health: ${statusLabel(report.systemHealth.status)}`,
    `- Core conversion health: ${statusLabel(report.coreConversionHealth.status)}`,
    `- Funnel health: ${statusLabel(report.funnelHealth.status)}`,
    `- Attribution quality: ${statusLabel(report.attributionQuality.status)}`,
    `- Duplicate risk: ${statusLabel(report.duplicateAndDataQuality.duplicateRisk)}`,
    `- GA4 reporting readiness: ${statusLabel(report.paidMediaReadiness.ga4Reporting.status)}`,
    `- Google Ads import planning: ${statusLabel(report.paidMediaReadiness.googleAdsImportPlanning.status)}`,
    `- Looker Studio dashboard planning: ${statusLabel(report.paidMediaReadiness.lookerStudioDashboardPlanning.status)}`,
    `- Meta Pixel planning: ${statusLabel(report.paidMediaReadiness.metaPixelPlanning.status)}`,
    `- Recommended next phase: ${report.recommendedNextActions.recommendedNextPhase}`,
    `- GA4 writes made: ${report.safety.ga4WritesMade}`,
    `- GTM writes made: ${report.safety.gtmWritesMade}`,
    `- GTM published: ${report.safety.gtmPublished}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    `- HTML: ${paths.htmlPath}`
  ];
}

module.exports = {
  buildDashboard,
  runGa4MonitoringDashboard,
  summaryLines
};
