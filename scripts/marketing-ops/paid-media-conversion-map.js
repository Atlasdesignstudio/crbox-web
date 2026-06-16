'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ARTIFACTS = Object.freeze([
  'docs/marketing-ops-ga4-monitoring-readiness.json',
  'docs/marketing-ops-ga4-event-processing-validation.json',
  'docs/marketing-ops-ga4-monitoring-dashboard.json',
  'docs/marketing-ops-gtm-publish-result.json',
  'docs/marketing-ops-gtm-post-publish-smoke-test.json',
  'docs/measurement-map-v1.md',
  'docs/analytics-taxonomy.md',
  'docs/tracking-plan.md',
  'docs/paid-media-launch-gate-phase-1.md'
]);

const PRIMARY_CONVERSIONS = Object.freeze([
  {
    eventName: 'quote_request_submit_success',
    businessMeaning: 'A quote request was submitted and confirmed. This is the clearest current lead-intent event for service demand.',
    funnelRole: 'Main quote funnel outcome',
    paidMediaRelevance: 'Primary lead-generation optimization event',
    googleAdsImportCandidate: 'yes',
    metaOptimizationCandidate: 'yes_later',
    optimizationPriority: 'critical',
    caveats: [
      'Recent volume is still low before paid campaigns scale.',
      'Lead quality should be reviewed before aggressive automated bidding.'
    ],
    minimumRecommendedVolumeBeforeAggressiveOptimization: 'At least 30-50 qualified conversions in a 30-day window per platform/campaign family.'
  },
  {
    eventName: 'signup_success',
    businessMeaning: 'A user completed account registration successfully.',
    funnelRole: 'Account creation / acquisition outcome',
    paidMediaRelevance: 'Primary acquisition conversion with quality caveats',
    googleAdsImportCandidate: 'yes_with_quality_validation',
    metaOptimizationCandidate: 'yes_later',
    optimizationPriority: 'high',
    caveats: [
      'Signup quality can vary if some accounts do not become shipping customers.',
      'Should be interpreted with downstream activation data once available.'
    ],
    minimumRecommendedVolumeBeforeAggressiveOptimization: 'At least 30-50 qualified conversions in a 30-day window, plus review of activation quality.'
  }
]);

const SECONDARY_CONVERSIONS = Object.freeze([
  {
    eventName: 'contact_form_submit_success',
    businessMeaning: 'A contact form was submitted successfully.',
    whenUseful: 'Useful for measuring lead intent and support/commercial inquiry volume.',
    googleAdsImportRecommendation: 'yes_secondary_observation',
    metaPlanningRecommendation: 'secondary',
    secondaryOnly: true,
    risks: 'May include support or general inquiries unless form purpose is clearly commercial.'
  },
  {
    eventName: 'calculator_result',
    businessMeaning: 'A calculator result was generated after a shipping-cost query.',
    whenUseful: 'Useful for remarketing, funnel diagnosis, and assessing product/service interest.',
    googleAdsImportRecommendation: 'yes_secondary_observation',
    metaPlanningRecommendation: 'secondary',
    secondaryOnly: true,
    risks: 'Not a lead by itself; optimizing to it may favor price shoppers over qualified leads.'
  },
  {
    eventName: 'whatsapp_click',
    businessMeaning: 'A user clicked a WhatsApp contact CTA.',
    whenUseful: 'Useful as an intent signal and remarketing/audience signal.',
    googleAdsImportRecommendation: 'yes_secondary_observation',
    metaPlanningRecommendation: 'secondary',
    secondaryOnly: true,
    risks: 'Click does not confirm a conversation or qualified lead.'
  },
  {
    eventName: 'phone_click',
    businessMeaning: 'A user clicked a phone CTA.',
    whenUseful: 'Useful if phone calls become a campaign KPI.',
    googleAdsImportRecommendation: 'later_requires_call_tracking',
    metaPlanningRecommendation: 'later',
    secondaryOnly: true,
    risks: 'Click does not confirm a completed call; call tracking is needed before optimization.'
  },
  {
    eventName: 'email_click',
    businessMeaning: 'A user clicked an email CTA.',
    whenUseful: 'Useful for contact-intent reporting and UX analysis.',
    googleAdsImportRecommendation: 'yes_secondary_observation',
    metaPlanningRecommendation: 'secondary',
    secondaryOnly: true,
    risks: 'Weaker than a confirmed form submission and does not confirm that an email was sent.'
  }
]);

const MICRO_CONVERSIONS = Object.freeze([
  ['quote_request_start', 'The user entered the quote funnel.', 'funnel_entry'],
  ['calculator_start', 'The calculator became interactive.', 'early_product_interest'],
  ['calculator_query', 'The user submitted a calculator query.', 'active_product_interest'],
  ['signup_start', 'The user started registration.', 'account_intent'],
  ['signup_step', 'The user progressed through registration steps.', 'account_intent'],
  ['form_start', 'The user started a form.', 'form_intent'],
  ['faq_engage', 'The user engaged with FAQ content.', 'education'],
  ['service_card_click', 'The user clicked a service card.', 'service_interest'],
  ['cta_click', 'The user clicked a call-to-action.', 'engagement']
].map(([eventName, businessMeaning, funnelStage]) => ({
  eventName,
  businessMeaning,
  diagnosticValue: 'Useful for funnel analysis, audience building, traffic-quality diagnosis, and early campaign learning.',
  funnelStage,
  importRecommendation: 'no_primary_import',
  optimizationWarning: 'Do not use as a primary optimization goal; it can over-optimize toward shallow engagement.'
})));

const DIAGNOSTIC_ONLY_EVENTS = Object.freeze([
  ['scroll_depth', 'Engagement depth signal; can inflate performance if optimized.'],
  ['section_visible', 'Content visibility signal; useful for UX/CRO, not paid-media optimization.'],
  ['nav_click', 'Navigation behavior; too broad for conversion optimization.'],
  ['portal_section_view', 'Existing-client portal behavior; not new acquisition intent.'],
  ['login_start', 'Existing-user auth behavior; not acquisition conversion.'],
  ['login_success', 'Existing-user auth success; not acquisition conversion.'],
  ['login_error', 'Operational/auth issue signal; never an optimization target.'],
  ['package_search', 'Portal/internal package behavior; useful for product analytics.'],
  ['package_detail_view', 'Portal/internal package detail behavior; existing-client action.'],
  ['invoice_upload_start', 'Operational shipment workflow start; existing-client activation signal.'],
  ['invoice_upload_success', 'Operational activation event; future quality signal, not initial ad-platform import.'],
  ['invoice_upload_error', 'Error event; should not be optimized.'],
  ['chat_open', 'Support/chat engagement; diagnostic unless a future chat-lead strategy is approved.'],
  ['chat_message_sent', 'Support/chat engagement; diagnostic unless qualified lead capture is implemented.'],
  ['signup_error', 'Registration error; useful for diagnostics, never optimization.'],
  ['form_abandon', 'Funnel-friction signal; useful for CRO, not optimization.'],
  ['calculator_tab_switch', 'Calculator UI behavior; diagnostic only.'],
  ['package_search_result', 'Observed portal/internal event; diagnostic only.'],
  ['outbound_click', 'Observed external-click event; too broad for optimization.']
].map(([eventName, reason]) => ({
  eventName,
  reason,
  excludeFromPaidMediaOptimization: true,
  analyticsUse: 'Useful for UX, CRO, product analytics, or operational monitoring depending on context.'
})));

const DO_NOT_OPTIMIZE_EVENTS = Object.freeze([
  'scroll_depth',
  'section_visible',
  'nav_click',
  'portal_section_view',
  'login_success',
  'login_error',
  'invoice_upload_error',
  'package_search',
  'package_detail_view',
  'package_search_result',
  'outbound_click',
  'form_abandon',
  'signup_error'
]);

const GOOGLE_ADS_IMPORT_MAP = Object.freeze({
  quote_request_submit_success: {
    importToGoogleAds: 'yes_primary',
    includeInConversionsColumn: true,
    biddingUse: 'primary_bidding',
    recommendedInitialAction: 'Import as a primary conversion after Google Ads linking/import planning is approved.',
    caveats: 'Use as the main lead-generation optimization event; monitor quality and duplicate risk.'
  },
  signup_success: {
    importToGoogleAds: 'yes_primary',
    includeInConversionsColumn: 'later_quality_dependent',
    biddingUse: 'primary_bidding_or_secondary_observation',
    recommendedInitialAction: 'Import only after confirming signup quality or start as secondary observation if quality is uncertain.',
    caveats: 'Registration does not always equal qualified shipping customer.'
  },
  contact_form_submit_success: {
    importToGoogleAds: 'yes_secondary_observation',
    includeInConversionsColumn: false,
    biddingUse: 'secondary_observation',
    recommendedInitialAction: 'Import as secondary observation only unless commercial lead purpose is confirmed.',
    caveats: 'May include support/general inquiries.'
  },
  calculator_result: {
    importToGoogleAds: 'yes_secondary_observation',
    includeInConversionsColumn: false,
    biddingUse: 'remarketing_signal',
    recommendedInitialAction: 'Use for reporting, remarketing, and funnel diagnosis rather than primary bidding.',
    caveats: 'Can optimize toward calculators instead of leads if used as primary.'
  },
  whatsapp_click: {
    importToGoogleAds: 'yes_secondary_observation',
    includeInConversionsColumn: false,
    biddingUse: 'secondary_observation',
    recommendedInitialAction: 'Track as secondary/off-site intent until conversation quality is measurable.',
    caveats: 'Click does not confirm completed WhatsApp conversation.'
  },
  phone_click: {
    importToGoogleAds: 'later_requires_call_tracking',
    includeInConversionsColumn: false,
    biddingUse: 'no',
    recommendedInitialAction: 'Do not import for bidding until call tracking confirms completed and qualified calls.',
    caveats: 'Click is not a completed call.'
  },
  email_click: {
    importToGoogleAds: 'yes_secondary_observation',
    includeInConversionsColumn: false,
    biddingUse: 'secondary_observation',
    recommendedInitialAction: 'Track as a weak contact-intent signal only.',
    caveats: 'Click does not confirm message sent or lead quality.'
  },
  quote_request_start: {
    importToGoogleAds: 'no_micro_conversion',
    includeInConversionsColumn: false,
    biddingUse: 'diagnostic_only',
    recommendedInitialAction: 'Keep in GA4 reporting and funnel analysis; do not use for bidding.',
    caveats: 'Shallow funnel-start event.'
  },
  scroll_depth: {
    importToGoogleAds: 'no_diagnostic_only',
    includeInConversionsColumn: false,
    biddingUse: 'no',
    recommendedInitialAction: 'Do not import.',
    caveats: 'Optimizing to scroll can inflate engagement quality.'
  },
  nav_click: {
    importToGoogleAds: 'no_diagnostic_only',
    includeInConversionsColumn: false,
    biddingUse: 'no',
    recommendedInitialAction: 'Do not import.',
    caveats: 'Generic navigation signal.'
  },
  section_visible: {
    importToGoogleAds: 'no_diagnostic_only',
    includeInConversionsColumn: false,
    biddingUse: 'no',
    recommendedInitialAction: 'Do not import.',
    caveats: 'Passive visibility signal.'
  }
});

const META_PLANNING_MAP = Object.freeze({
  quote_request_submit_success: {
    metaEventCandidate: 'yes',
    suggestedMetaEventType: 'Lead',
    capiReadiness: ['later_requires_server_event_id', 'later_requires_consent_review', 'later_requires_event_match_quality_review'],
    caveats: 'Strong lead event, but Meta Pixel/CAPI must be designed separately with consent and deduplication.'
  },
  signup_success: {
    metaEventCandidate: 'yes',
    suggestedMetaEventType: 'CompleteRegistration',
    capiReadiness: ['later_requires_server_event_id', 'later_requires_consent_review', 'later_requires_event_match_quality_review'],
    caveats: 'Useful account-creation event; quality should be reviewed before optimization.'
  },
  contact_form_submit_success: {
    metaEventCandidate: 'secondary',
    suggestedMetaEventType: 'Contact_or_Lead',
    capiReadiness: ['later_requires_server_event_id', 'later_requires_consent_review'],
    caveats: 'Choose Contact or Lead based on confirmed commercial meaning.'
  },
  calculator_result: {
    metaEventCandidate: 'secondary',
    suggestedMetaEventType: 'CustomEvent_or_ViewContent',
    capiReadiness: ['planning_only'],
    caveats: 'Useful for remarketing and engagement quality, not primary optimization.'
  },
  whatsapp_click: {
    metaEventCandidate: 'secondary',
    suggestedMetaEventType: 'Contact',
    capiReadiness: ['planning_only'],
    caveats: 'Off-site click; quality is not confirmed.'
  },
  phone_click: {
    metaEventCandidate: 'later',
    suggestedMetaEventType: 'Contact',
    capiReadiness: ['later_requires_call_tracking', 'later_requires_consent_review'],
    caveats: 'Requires call tracking or qualified-call evidence.'
  },
  email_click: {
    metaEventCandidate: 'secondary',
    suggestedMetaEventType: 'Contact',
    capiReadiness: ['planning_only'],
    caveats: 'Weak contact-intent event.'
  },
  diagnostic_events: {
    metaEventCandidate: 'no',
    suggestedMetaEventType: 'no_mapping',
    capiReadiness: ['planning_only'],
    caveats: 'Diagnostic events should not be optimization events.'
  }
});

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

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, `${content.replace(/\s+$/u, '')}\n`);
}

function eventStatus(dashboard, eventName) {
  const dashboardEvent = (dashboard?.coreConversionHealth?.events || []).find((event) => event.eventName === eventName);
  if (dashboardEvent) {
    return {
      currentObservability: dashboardEvent.observedRecently ? 'observed_recently' : 'not_observed_recently',
      ga4KeyEvent: dashboardEvent.keyEventConfigured || dashboardEvent.keyEvent || 'not_available',
      recentVolumeStatus: dashboardEvent.recentVolumeStatus || 'not_available'
    };
  }
  const observed = new Set(dashboard?.eventTaxonomyCoverage?.expectedObserved || []);
  const notObserved = new Set(dashboard?.eventTaxonomyCoverage?.expectedNotObserved || []);
  if (observed.has(eventName)) {
    return {
      currentObservability: 'observed_recently',
      ga4KeyEvent: 'not_available',
      recentVolumeStatus: 'observed_recently'
    };
  }
  if (notObserved.has(eventName)) {
    return {
      currentObservability: 'not_observed_recently',
      ga4KeyEvent: 'not_available',
      recentVolumeStatus: 'not_observed'
    };
  }
  return {
    currentObservability: 'not_independently_assessed',
    ga4KeyEvent: 'not_available',
    recentVolumeStatus: 'not_checked'
  };
}

function googleAdsRecommendation(eventName) {
  return GOOGLE_ADS_IMPORT_MAP[eventName] || {
    importToGoogleAds: DO_NOT_OPTIMIZE_EVENTS.includes(eventName) ? 'no_diagnostic_only' : 'no_primary_import',
    includeInConversionsColumn: false,
    biddingUse: DO_NOT_OPTIMIZE_EVENTS.includes(eventName) ? 'no' : 'diagnostic_only',
    recommendedInitialAction: DO_NOT_OPTIMIZE_EVENTS.includes(eventName)
      ? 'Do not import into Google Ads.'
      : 'Keep in GA4 reporting unless a future approved phase defines a platform use.',
    caveats: DO_NOT_OPTIMIZE_EVENTS.includes(eventName)
      ? 'Can inflate performance or represent low-value/existing-client behavior.'
      : 'Not approved as an ad-platform optimization event.'
  };
}

function metaRecommendation(eventName) {
  if (META_PLANNING_MAP[eventName]) return META_PLANNING_MAP[eventName];
  if (DO_NOT_OPTIMIZE_EVENTS.includes(eventName) || DIAGNOSTIC_ONLY_EVENTS.some((event) => event.eventName === eventName)) {
    return META_PLANNING_MAP.diagnostic_events;
  }
  return {
    metaEventCandidate: 'no',
    suggestedMetaEventType: 'CustomEvent_or_no_mapping',
    capiReadiness: ['planning_only'],
    caveats: 'Not approved for Meta optimization in this conversion map.'
  };
}

function conversionValueStrategyFor(eventName, category) {
  if (eventName === 'quote_request_submit_success') {
    return {
      eventName,
      valueStrategy: 'offline_value_later',
      suggestedApproach: 'Start without fake values. Later, use qualified lead or shipment/revenue proxy from backend/admin data if available.'
    };
  }
  if (eventName === 'signup_success') {
    return {
      eventName,
      valueStrategy: 'offline_value_later',
      suggestedApproach: 'Start without fake values. Later, weight signups by activation, shipment, or customer-quality outcomes.'
    };
  }
  if (category === 'secondary') {
    return {
      eventName,
      valueStrategy: 'static_value_later',
      suggestedApproach: 'Do not assign values initially. A small static value may be considered later only for reporting, not primary bidding.'
    };
  }
  return {
    eventName,
    valueStrategy: 'no_value_initially',
    suggestedApproach: 'No conversion value recommended for planning/diagnostic events.'
  };
}

function buildDecisionMatrix(dashboard) {
  const rows = [];
  const pushRow = (eventName, category, businessValue, funnelStage, priority, riskLevel, notes) => {
    const status = eventStatus(dashboard, eventName);
    const google = googleAdsRecommendation(eventName);
    const meta = metaRecommendation(eventName);
    rows.push({
      eventName,
      category,
      businessValue,
      funnelStage,
      currentObservability: status.currentObservability,
      ga4KeyEvent: status.ga4KeyEvent,
      googleAdsImportRecommendation: google.importToGoogleAds,
      includeInConversionsColumn: google.includeInConversionsColumn,
      metaPlanningRecommendation: meta.metaEventCandidate,
      optimizationPriority: priority,
      riskLevel,
      notes
    });
  };

  for (const event of PRIMARY_CONVERSIONS) {
    pushRow(
      event.eventName,
      'primary_conversion',
      event.businessMeaning,
      event.funnelRole,
      event.optimizationPriority,
      event.eventName === 'signup_success' ? 'medium' : 'low',
      event.caveats.join(' ')
    );
  }
  for (const event of SECONDARY_CONVERSIONS) {
    pushRow(
      event.eventName,
      'secondary_conversion',
      event.businessMeaning,
      'commercial_intent',
      'medium',
      event.eventName === 'phone_click' ? 'medium' : 'low',
      event.risks
    );
  }
  for (const event of MICRO_CONVERSIONS) {
    pushRow(
      event.eventName,
      'micro_conversion',
      event.businessMeaning,
      event.funnelStage,
      'low',
      'medium',
      event.optimizationWarning
    );
  }
  for (const event of DIAGNOSTIC_ONLY_EVENTS) {
    pushRow(
      event.eventName,
      'diagnostic_only',
      event.reason,
      'diagnostic_or_operational',
      'none',
      'high_if_optimized',
      'Exclude from paid-media optimization.'
    );
  }
  return rows;
}

function buildReport(root) {
  const readiness = readJson(root, 'docs/marketing-ops-ga4-monitoring-readiness.json');
  const processing = readJson(root, 'docs/marketing-ops-ga4-event-processing-validation.json');
  const dashboard = readJson(root, 'docs/marketing-ops-ga4-monitoring-dashboard.json');
  const publish = readJson(root, 'docs/marketing-ops-gtm-publish-result.json');
  const smoke = readJson(root, 'docs/marketing-ops-gtm-post-publish-smoke-test.json');
  const sourceAvailability = sourceArtifactAvailability(root);
  const decisionMatrix = buildDecisionMatrix(dashboard);
  const conversionValueStrategy = decisionMatrix.map((row) =>
    conversionValueStrategyFor(row.eventName, row.category.replace('_conversion', ''))
  );

  return {
    generatedAt: new Date().toISOString(),
    phase: '3B',
    mode: 'paid_media_conversion_map_planning_only',
    sourceArtifacts: SOURCE_ARTIFACTS,
    sourceArtifactAvailability: sourceAvailability,
    overallStatus: 'ready_for_import_planning_with_limitations',
    sourceStatus: {
      phase3A1Readiness: readiness?.readinessStatus || 'not_available',
      phase3A2Validation: processing?.validationStatus || 'not_available',
      phase3A3Dashboard: dashboard?.overallStatus || 'not_available',
      gtmPublishedVersion: publish?.publishedVersion?.versionId || 'not_available',
      postPublishSmokeTest: smoke?.finalStatus || smoke?.status || 'not_available'
    },
    primaryConversions: PRIMARY_CONVERSIONS.map((event) => ({
      ...event,
      ...eventStatus(dashboard, event.eventName)
    })),
    secondaryConversions: SECONDARY_CONVERSIONS.map((event) => ({
      ...event,
      ...eventStatus(dashboard, event.eventName)
    })),
    microConversions: MICRO_CONVERSIONS.map((event) => ({
      ...event,
      ...eventStatus(dashboard, event.eventName)
    })),
    diagnosticOnlyEvents: DIAGNOSTIC_ONLY_EVENTS.map((event) => ({
      ...event,
      ...eventStatus(dashboard, event.eventName)
    })),
    doNotOptimizeEvents: DO_NOT_OPTIMIZE_EVENTS.map((eventName) => ({
      eventName,
      reason: googleAdsRecommendation(eventName).caveats,
      googleAdsPrimaryConversion: false,
      metaOptimizationEvent: false
    })),
    googleAdsImportMap: Object.fromEntries(
      decisionMatrix.map((row) => [row.eventName, googleAdsRecommendation(row.eventName)])
    ),
    metaPlanningMap: Object.fromEntries(
      decisionMatrix.map((row) => [row.eventName, metaRecommendation(row.eventName)])
    ),
    conversionValueStrategy,
    leadQualityLoopRecommendation: {
      status: 'future_phase_only',
      whyRawLeadsAreNotEnough: 'Raw leads can include curiosity, duplicates, support requests, spam, or low-quality registrations. Paid media should eventually optimize toward qualified and activated customers.',
      futureStatuses: [
        'quote_submitted',
        'contacted',
        'quoted',
        'converted',
        'delivered',
        'high_value_customer',
        'spam',
        'duplicate',
        'unqualified'
      ],
      requirements: [
        'Backend/admin source of truth.',
        'Conversion upload or offline conversion API design.',
        'Consent/privacy review.',
        'Stable IDs or platform click IDs handled without exposing PII in analytics artifacts.'
      ]
    },
    privacyAndConsentConsiderations: [
      'No PII should be sent to GA4, GTM, Google Ads, or Meta analytics payloads.',
      'Raw gclid/fbclid should not be exposed in client-side analytics payloads.',
      'Only boolean flags such as gclid_present and fbclid_present are currently used.',
      'Meta CAPI or offline conversion upload requires a separate privacy-safe design.',
      'Consent Mode and Meta consent handling should be reviewed before implementation.'
    ],
    decisionMatrix,
    recommendedNextPhase: 'Phase 3C - Google Ads Import Planning',
    finalRecommendation: [
      'Use this conversion map as the approval artifact before connecting Google Ads.',
      'Do not import all events.',
      'Do not optimize toward diagnostic events.',
      'Start with the smallest safe conversion set.',
      'Keep secondary events as observation/reporting first.'
    ],
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

function statusLabel(value) {
  return String(value || 'not_available').replace(/_/g, ' ').toUpperCase();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? 'not_available').replace(/\|/g, '/')).join(' | ')} |`)
  ].join('\n');
}

function buildMarkdown(report) {
  const primaryRows = report.primaryConversions.map((event) => [
    event.eventName,
    event.ga4KeyEvent,
    event.googleAdsImportCandidate,
    event.metaOptimizationCandidate,
    event.optimizationPriority,
    event.minimumRecommendedVolumeBeforeAggressiveOptimization
  ]);
  const secondaryRows = report.secondaryConversions.map((event) => [
    event.eventName,
    event.googleAdsImportRecommendation,
    event.metaPlanningRecommendation,
    event.secondaryOnly ? 'yes' : 'no',
    event.risks
  ]);
  const matrixRows = report.decisionMatrix.map((row) => [
    row.eventName,
    row.category,
    row.currentObservability,
    row.ga4KeyEvent,
    row.googleAdsImportRecommendation,
    row.includeInConversionsColumn,
    row.metaPlanningRecommendation,
    row.optimizationPriority,
    row.riskLevel
  ]);

  return [
    '# CRBOX Paid Media Conversion Map',
    '',
    '## Executive summary',
    '',
    `- Phase: ${report.phase}`,
    `- Mode: ${report.mode}`,
    `- Generated: ${report.generatedAt}`,
    `- Overall status: ${report.overallStatus}`,
    '- This is the planning source of truth before connecting Google Ads, Meta, or any optimization platform.',
    '- Google Ads is ready for import planning, not full execution.',
    '- Meta is planning-only; no Pixel or CAPI implementation is approved here.',
    '',
    '## Scope',
    '',
    '- Define primary, secondary, micro-conversion, diagnostic-only, and do-not-optimize event groups.',
    '- Define Google Ads import recommendations and Meta Pixel/CAPI planning recommendations.',
    '- Define conservative conversion value, lead quality, privacy, and consent guidance.',
    '- No GA4, GTM, Google Ads, Meta, or runtime writes are performed.',
    '',
    '## Source artifacts',
    '',
    ...report.sourceArtifactAvailability.map((artifact) => `- ${artifact.path}: ${artifact.available ? 'available' : 'source_artifact_missing'}`),
    '',
    '## Primary conversions',
    '',
    markdownTable(
      ['Event', 'GA4 key event', 'Google Ads candidate', 'Meta candidate', 'Priority', 'Minimum volume guidance'],
      primaryRows
    ),
    '',
    '## Secondary conversions',
    '',
    markdownTable(
      ['Event', 'Google Ads recommendation', 'Meta recommendation', 'Secondary only', 'Risk'],
      secondaryRows
    ),
    '',
    '## Micro-conversions',
    '',
    ...report.microConversions.map((event) => `- ${event.eventName}: ${event.businessMeaning} ${event.optimizationWarning}`),
    '',
    '## Diagnostic-only events',
    '',
    ...report.diagnosticOnlyEvents.map((event) => `- ${event.eventName}: ${event.reason}`),
    '',
    '## Do-not-optimize list',
    '',
    ...report.doNotOptimizeEvents.map((event) => `- ${event.eventName}: ${event.reason}`),
    '',
    '## Google Ads import recommendation',
    '',
    '- Start with the smallest safe conversion set.',
    '- Do not import all events.',
    '- Do not include secondary events in the conversions column initially unless business quality is confirmed.',
    '- Do not optimize toward diagnostic events.',
    '',
    '## Meta Pixel / CAPI planning recommendation',
    '',
    '- Meta remains planning-only.',
    '- `quote_request_submit_success` maps best to Lead in a future Meta plan.',
    '- `signup_success` maps best to CompleteRegistration in a future Meta plan.',
    '- CAPI requires event IDs, consent review, and event match quality review before implementation.',
    '',
    '## Conversion value strategy',
    '',
    '- Do not assign fake revenue values.',
    '- Start without conversion values.',
    '- Later, use lead quality, activation, shipment, or revenue proxy values from backend/admin data if available.',
    '- Dynamic or offline values require a separate discovery phase.',
    '',
    '## Lead quality loop recommendation',
    '',
    `- Status: ${report.leadQualityLoopRecommendation.status}`,
    `- Why: ${report.leadQualityLoopRecommendation.whyRawLeadsAreNotEnough}`,
    '- Future statuses:',
    ...report.leadQualityLoopRecommendation.futureStatuses.map((status) => `  - ${status}`),
    '- Requirements:',
    ...report.leadQualityLoopRecommendation.requirements.map((requirement) => `  - ${requirement}`),
    '',
    '## Privacy and consent considerations',
    '',
    ...report.privacyAndConsentConsiderations.map((item) => `- ${item}`),
    '',
    '## Decision matrix',
    '',
    markdownTable(
      ['Event', 'Category', 'Observability', 'GA4 key event', 'Google Ads import', 'Conversions column', 'Meta planning', 'Priority', 'Risk'],
      matrixRows
    ),
    '',
    '## Recommended next phase',
    '',
    `Recommended next phase: ${report.recommendedNextPhase}`,
    ...report.finalRecommendation.map((item) => `- ${item}`),
    '',
    '## Safety confirmations',
    '',
    '- GA4 writes made: false',
    '- GTM writes made: false',
    '- GTM published: false',
    '- Google Ads touched: false',
    '- Meta touched: false',
    '- Runtime files touched: false',
    '- Secrets printed: false',
    '- Tokens printed: false',
    '- PII printed: false',
    '- Raw click IDs printed: false'
  ].join('\n');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusClass(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('no') || text.includes('diagnostic') || text.includes('excluded')) return 'bad';
  if (text === 'critical' || text.includes('yes_primary') || text.includes('primary_bidding') || text.includes('primary_approved') || text === 'ready') return 'good';
  if (text === 'high') return 'warn';
  if (text.includes('secondary') || text.includes('later') || text.includes('limitation') || text.includes('planning')) return 'warn';
  if (text === 'medium' || text === 'low') return 'neutral';
  if (text.includes('high')) return 'bad';
  return 'neutral';
}

function chip(value) {
  return `<span class="chip ${statusClass(value)}">${escapeHtml(statusLabel(value))}</span>`;
}

function cardList(items, className = '') {
  return items.map((item) => `
    <article class="card ${className}">
      <h3>${escapeHtml(item.eventName)}</h3>
      <p>${escapeHtml(item.businessMeaning || item.reason)}</p>
      ${item.optimizationPriority ? chip(item.optimizationPriority) : ''}
      ${item.googleAdsImportCandidate ? `<p><strong>Google Ads:</strong> ${escapeHtml(item.googleAdsImportCandidate)}</p>` : ''}
      ${item.googleAdsImportRecommendation ? `<p><strong>Google Ads:</strong> ${escapeHtml(item.googleAdsImportRecommendation)}</p>` : ''}
      ${item.metaOptimizationCandidate ? `<p><strong>Meta:</strong> ${escapeHtml(item.metaOptimizationCandidate)}</p>` : ''}
      ${item.metaPlanningRecommendation ? `<p><strong>Meta:</strong> ${escapeHtml(item.metaPlanningRecommendation)}</p>` : ''}
    </article>`).join('\n');
}

function tableRows(rows) {
  return rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('\n');
}

function buildHtml(report) {
  const googleRows = Object.entries(report.googleAdsImportMap).map(([eventName, item]) => [
    `<strong>${escapeHtml(eventName)}</strong>`,
    chip(item.importToGoogleAds),
    escapeHtml(String(item.includeInConversionsColumn)),
    escapeHtml(item.biddingUse),
    escapeHtml(item.recommendedInitialAction)
  ]);
  const metaRows = Object.entries(report.metaPlanningMap).map(([eventName, item]) => [
    `<strong>${escapeHtml(eventName)}</strong>`,
    chip(item.metaEventCandidate),
    escapeHtml(item.suggestedMetaEventType),
    escapeHtml(Array.isArray(item.capiReadiness) ? item.capiReadiness.join(', ') : item.capiReadiness),
    escapeHtml(item.caveats)
  ]);
  const matrixRows = report.decisionMatrix.map((row) => [
    escapeHtml(row.eventName),
    escapeHtml(row.category),
    escapeHtml(row.currentObservability),
    chip(row.googleAdsImportRecommendation),
    escapeHtml(String(row.includeInConversionsColumn)),
    chip(row.metaPlanningRecommendation),
    escapeHtml(row.riskLevel)
  ]);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRBOX Paid Media Conversion Map</title>
  <style>
    :root {
      --bg: #f5f7fa;
      --panel: #ffffff;
      --ink: #17202a;
      --muted: #627083;
      --line: #d9dee6;
      --good: #0f7a4f;
      --good-bg: #e8f6ef;
      --warn: #8a5a00;
      --warn-bg: #fff2d1;
      --bad: #9b2f2f;
      --bad-bg: #fde7e7;
      --neutral: #4b5563;
      --neutral-bg: #eef1f5;
      --header: #14324a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    header {
      background: var(--header);
      color: #fff;
      padding: 32px max(24px, calc((100vw - 1180px) / 2));
    }
    main {
      width: min(1180px, calc(100% - 32px));
      margin: 24px auto 44px;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 { font-size: clamp(1.8rem, 3vw, 3rem); margin-bottom: 8px; letter-spacing: 0; }
    h2 { margin: 30px 0 14px; font-size: 1.35rem; }
    h3 { font-size: 1.02rem; }
    .summary, .grid {
      display: grid;
      gap: 14px;
    }
    .summary { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 20px; }
    .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .card, .table-wrap, .note {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }
    .card p { color: var(--muted); }
    .kicker {
      color: var(--muted);
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    header .kicker { color: #b7c7d8; }
    .chip {
      display: inline-flex;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      margin: 2px 0 8px;
    }
    .chip.good { color: var(--good); background: var(--good-bg); }
    .chip.warn { color: var(--warn); background: var(--warn-bg); }
    .chip.bad { color: var(--bad); background: var(--bad-bg); }
    .chip.neutral { color: var(--neutral); background: var(--neutral-bg); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th, td {
      padding: 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    ul { margin: 0; padding-left: 20px; }
    footer {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto 32px;
      color: var(--muted);
      font-size: 0.86rem;
    }
    @media (max-width: 900px) {
      .summary, .grid, .grid.two { grid-template-columns: 1fr; }
      .table-wrap { overflow-x: auto; }
      th, td { min-width: 150px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="kicker">CRBOX · Phase ${escapeHtml(report.phase)}</div>
    <h1>Paid Media Conversion Map</h1>
    <p>Planning-only source of truth before connecting Google Ads, Meta, or optimization platforms.</p>
    <div class="summary">
      <div>${chip(report.overallStatus)}<p>Overall status</p></div>
      <div>${chip('yes_primary')}<p>Quote submit import candidate</p></div>
      <div>${chip('ready_with_limitations')}<p>Google Ads import planning</p></div>
      <div>${chip('planning_only')}<p>Meta Pixel / CAPI</p></div>
    </div>
  </header>
  <main>
    <section>
      <h2>Strategic recommendation</h2>
      <div class="note">
        <ul>${report.finalRecommendation.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    </section>
    <section>
      <h2>Primary conversions</h2>
      <div class="grid two">${cardList(report.primaryConversions, 'primary')}</div>
    </section>
    <section>
      <h2>Secondary conversions</h2>
      <div class="grid">${cardList(report.secondaryConversions)}</div>
    </section>
    <section>
      <h2>Micro-conversions</h2>
      <div class="note"><ul>${report.microConversions.map((event) => `<li><strong>${escapeHtml(event.eventName)}:</strong> ${escapeHtml(event.businessMeaning)} ${escapeHtml(event.optimizationWarning)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Diagnostic-only events</h2>
      <div class="note"><ul>${report.diagnosticOnlyEvents.map((event) => `<li><strong>${escapeHtml(event.eventName)}:</strong> ${escapeHtml(event.reason)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Do-not-optimize warning</h2>
      <div class="note"><ul>${report.doNotOptimizeEvents.map((event) => `<li>${escapeHtml(event.eventName)}: ${escapeHtml(event.reason)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Google Ads import matrix</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Import</th><th>Conversions column</th><th>Bidding use</th><th>Initial action</th></tr></thead>
          <tbody>${tableRows(googleRows)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Meta Pixel / CAPI planning matrix</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Candidate</th><th>Suggested type</th><th>CAPI readiness</th><th>Caveats</th></tr></thead>
          <tbody>${tableRows(metaRows)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Conversion value strategy</h2>
      <div class="note"><ul>${report.conversionValueStrategy.slice(0, 12).map((item) => `<li><strong>${escapeHtml(item.eventName)}:</strong> ${escapeHtml(item.valueStrategy)}. ${escapeHtml(item.suggestedApproach)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Lead quality loop</h2>
      <div class="note">
        <p>${escapeHtml(report.leadQualityLoopRecommendation.whyRawLeadsAreNotEnough)}</p>
        <ul>${report.leadQualityLoopRecommendation.requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    </section>
    <section>
      <h2>Privacy and consent notes</h2>
      <div class="note"><ul>${report.privacyAndConsentConsiderations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
    </section>
    <section>
      <h2>Decision matrix</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Event</th><th>Category</th><th>Observability</th><th>Google Ads</th><th>Conversions column</th><th>Meta</th><th>Risk</th></tr></thead>
          <tbody>${tableRows(matrixRows)}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>Final next phase recommendation</h2>
      <div class="note"><p><strong>${escapeHtml(report.recommendedNextPhase)}</strong></p><p>Use this conversion map as the approval artifact before connecting Google Ads.</p></div>
    </section>
    <section>
      <h2>Safety confirmations</h2>
      <div class="note">
        <ul>
          <li>GA4 writes made: false</li>
          <li>GTM writes made: false</li>
          <li>GTM published: false</li>
          <li>Google Ads touched: false</li>
          <li>Meta touched: false</li>
          <li>Runtime files touched: false</li>
          <li>Secrets/tokens/PII/raw click IDs printed: false</li>
        </ul>
      </div>
    </section>
  </main>
  <footer>Generated ${escapeHtml(report.generatedAt)} from local source artifacts. No live platform write calls are made by this artifact.</footer>
</body>
</html>`;
}

function writeReport(root, report) {
  const paths = {
    jsonPath: path.join(root, 'docs/marketing-ops-paid-media-conversion-map.json'),
    markdownPath: path.join(root, 'docs/marketing-ops-paid-media-conversion-map.md'),
    htmlPath: path.join(root, 'docs/marketing-ops-paid-media-conversion-map.html')
  };
  writeJson(paths.jsonPath, report);
  writeText(paths.markdownPath, buildMarkdown(report));
  writeText(paths.htmlPath, buildHtml(report));
  return paths;
}

function runPaidMediaConversionMap(root) {
  const report = buildReport(root);
  const paths = writeReport(root, report);
  return { report, paths };
}

function summaryLines(result) {
  const { report, paths } = result;
  return [
    `Paid media conversion map: ${statusLabel(report.overallStatus)}`,
    `- Primary conversions: ${report.primaryConversions.map((event) => event.eventName).join(', ')}`,
    `- Secondary conversions: ${report.secondaryConversions.map((event) => event.eventName).join(', ')}`,
    `- Do-not-optimize events: ${report.doNotOptimizeEvents.length}`,
    '- Google Ads: ready for import planning, not execution',
    '- Meta: planning-only',
    '- Conversion values: no fake values; offline/dynamic values require a future phase',
    `- Recommended next phase: ${report.recommendedNextPhase}`,
    `- GA4 writes made: ${report.safety.ga4WritesMade}`,
    `- GTM writes made: ${report.safety.gtmWritesMade}`,
    `- GTM published: ${report.safety.gtmPublished}`,
    `- JSON: ${paths.jsonPath}`,
    `- Markdown: ${paths.markdownPath}`,
    `- HTML: ${paths.htmlPath}`
  ];
}

module.exports = {
  buildReport,
  runPaidMediaConversionMap,
  summaryLines
};
