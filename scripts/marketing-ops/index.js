#!/usr/bin/env node
'use strict';

const { repoRoot } = require('./config');
const { loadDotEnv } = require('./env-loader');
const { formatStatus, maskSecretsInText } = require('./utils');
const { runRepoCheck } = require('./checks/repo-check');
const { runGa4Check } = require('./checks/ga4-check');
const { runGtmCheck } = require('./checks/gtm-check');
const { runGoogleAdsCheck } = require('./checks/google-ads-check');
const { runMetaCheck } = require('./checks/meta-check');
const { writeMarkdownReport } = require('./report/markdown-report');
const { buildDryRunPlan, mergeDryRunPlan } = require('./planner/dry-run-plan');
const { readDryRunPlan, writeDryRunPlan } = require('./planner/plan-writer');
const { runApply } = require('./apply/apply-runner');
const { runGtmPreflight, printPreflightSummary } = require('./gtm-preflight');
const { runGtmPayloadReview, printPayloadReviewSummary } = require('./gtm-payload-review');
const { runGtmPreviewQaReport, printSummary: printGtmPreviewQaSummary } = require('./gtm-preview-qa-report');
const { runGtmGa4TagsPayloadReview, printSummary: printGtmGa4TagsPayloadReviewSummary } = require('./gtm-ga4-tags-payload-review');
const { runGtmGa4TagsPreviewQa, printSummary: printGtmGa4TagsPreviewQaSummary } = require('./gtm-ga4-tags-preview-qa');
const { runGtmPublishReadinessReview, printSummary: printGtmPublishReadinessSummary } = require('./gtm-publish-readiness-review');
const { runGtmControlledPublish, outputLines: gtmPublishOutputLines } = require('./gtm-publish-execution');
const { runGtmGa4TagsControlledCreate, outputLines: gtmGa4TagsCreateOutputLines } = require('./apply/gtm-ga4-tags-create');
const {
  safeOutputLines: gtmEditOauthOutputLines,
  writeGtmEditAuthorizationUrl
} = require('./oauth-gtm-edit-url');
const {
  safeOutputLines: gtmPublishOauthOutputLines,
  writeGtmPublishAuthorizationUrl
} = require('./oauth-gtm-publish-url');

const root = repoRoot();
loadDotEnv(root);

function printResult(result) {
  console.log(`${result.name}: ${formatStatus(result.status)}`);
  for (const check of result.checks || []) {
    console.log(`- [${formatStatus(check.status)}] ${check.label}`);
    if (check.details) {
      console.log(`  ${maskSecretsInText(check.details)}`);
    }
  }
}

async function runAll() {
  return [
    runRepoCheck(root),
    await runGa4Check(),
    await runGtmCheck(),
    runGoogleAdsCheck(),
    runMetaCheck()
  ];
}

function printPlanSummary(plan, paths) {
  console.log(`Dry-run plan: ${plan.mode}`);
  console.log(`- Proposed GA4 actions: ${plan.summary.totalProposedGa4Actions}`);
  console.log(`- Proposed GTM actions: ${plan.summary.totalProposedGtmActions}`);
  console.log(`- Blocked actions: ${plan.summary.totalBlockedActions}`);
  console.log(`- Mutation performed: ${plan.mutationPerformed}`);
  if (paths) {
    console.log(`- Markdown: ${paths.markdownPath}`);
    console.log(`- JSON: ${paths.jsonPath}`);
  }
}

async function runPlan(scope) {
  let ga4Result = null;
  let gtmResult = null;
  let reportResults = null;

  if (scope === 'all') {
    reportResults = [
      runRepoCheck(root),
      await runGa4Check(),
      await runGtmCheck(),
      runGoogleAdsCheck(),
      runMetaCheck()
    ];
    ga4Result = reportResults.find((result) => result.name === 'GA4 checks');
    gtmResult = reportResults.find((result) => result.name === 'GTM checks');
  } else if (scope === 'ga4') {
    ga4Result = await runGa4Check();
  } else if (scope === 'gtm') {
    gtmResult = await runGtmCheck();
  }

  const partialPlan = buildDryRunPlan({ ga4Result, gtmResult, scope });
  const existingPlan = readDryRunPlan(root);
  const plan = mergeDryRunPlan(existingPlan, partialPlan, scope);
  const paths = writeDryRunPlan(root, plan);

  if (reportResults) {
    writeMarkdownReport(root, reportResults, { plan });
  }

  printPlanSummary(plan, paths);
  console.log('Mutation statement: No GA4 or GTM mutations were performed. This is a dry-run plan only.');
}

async function runApplyCommand(scope, validateOnly, argv, requestedMode) {
  const applyResult = await runApply(root, { scope, validateOnly, argv, requestedMode });
  const results = await runAll();
  const reportPath = writeMarkdownReport(root, results, { apply: applyResult.summary });

  for (const line of applyResult.outputLines) {
    console.log(maskSecretsInText(line));
  }
  console.log(`Report written: ${reportPath}`);
  console.log(applyResult.summary.mutationStatement);

  if (applyResult.exitCode) {
    process.exitCode = applyResult.exitCode;
  }
}

async function main() {
  const command = process.argv[2] || 'check';
  let results;
  let reportPath = null;

  switch (command) {
    case 'check':
      results = await runAll();
      reportPath = writeMarkdownReport(root, results);
      break;
    case 'report':
      results = await runAll();
      reportPath = writeMarkdownReport(root, results);
      break;
    case 'plan':
      await runPlan('all');
      return;
    case 'plan:ga4':
      await runPlan('ga4');
      return;
    case 'plan:gtm':
      await runPlan('gtm');
      return;
    case 'apply:validate':
      await runApplyCommand('all', true, process.argv.slice(3));
      return;
    case 'gtm:preflight': {
      const preflight = await runGtmPreflight(root);
      for (const line of printPreflightSummary(preflight.report, preflight.paths)) {
        console.log(line);
      }
      return;
    }
    case 'gtm:payload-review': {
      const payloadReview = runGtmPayloadReview(root);
      for (const line of printPayloadReviewSummary(payloadReview.review, payloadReview.paths)) {
        console.log(maskSecretsInText(line));
      }
      return;
    }
    case 'gtm:preview-qa-report': {
      const qaReport = runGtmPreviewQaReport(root);
      for (const line of printGtmPreviewQaSummary(qaReport.report, qaReport.paths)) {
        console.log(maskSecretsInText(line));
      }
      return;
    }
    case 'gtm:ga4-tags-payload-review': {
      const tagReview = await runGtmGa4TagsPayloadReview(root);
      for (const line of printGtmGa4TagsPayloadReviewSummary(tagReview.review, tagReview.paths)) {
        console.log(maskSecretsInText(line));
      }
      return;
    }
    case 'gtm:ga4-tags-preview-qa': {
      const previewQa = runGtmGa4TagsPreviewQa(root);
      for (const line of printGtmGa4TagsPreviewQaSummary(previewQa.report, previewQa.paths)) {
        console.log(maskSecretsInText(line));
      }
      return;
    }
    case 'gtm:publish-readiness-review': {
      const publishReview = await runGtmPublishReadinessReview(root);
      for (const line of printGtmPublishReadinessSummary(publishReview.review, publishReview.paths)) {
        console.log(maskSecretsInText(line));
      }
      return;
    }
    case 'oauth:gtm-edit-url': {
      try {
        const oauthUrl = writeGtmEditAuthorizationUrl(root);
        for (const line of gtmEditOauthOutputLines(oauthUrl)) {
          console.log(maskSecretsInText(line));
        }
      } catch (error) {
        console.error(maskSecretsInText(error && error.message ? error.message : String(error)));
        process.exitCode = 1;
      }
      return;
    }
    case 'oauth:gtm-publish-url': {
      try {
        const oauthUrl = writeGtmPublishAuthorizationUrl(root);
        for (const line of gtmPublishOauthOutputLines(oauthUrl)) {
          console.log(maskSecretsInText(line));
        }
      } catch (error) {
        console.error(maskSecretsInText(error && error.message ? error.message : String(error)));
        process.exitCode = 1;
      }
      return;
    }
    case 'apply':
      await runApplyCommand('all', false, process.argv.slice(3));
      return;
    case 'apply:ga4':
      await runApplyCommand('ga4', false, process.argv.slice(3), 'preview');
      return;
    case 'apply:ga4:create':
      await runApplyCommand('ga4', false, process.argv.slice(3), 'ga4_controlled_create');
      return;
    case 'apply:gtm':
      await runApplyCommand('gtm', false, process.argv.slice(3));
      return;
    case 'apply:gtm:create':
      await runApplyCommand('gtm', false, process.argv.slice(3), 'gtm_controlled_create');
      return;
    case 'apply:gtm:ga4-tags:create': {
      const createRun = await runGtmGa4TagsControlledCreate(root, process.argv.slice(3));
      for (const line of gtmGa4TagsCreateOutputLines(createRun)) {
        console.log(maskSecretsInText(line));
      }
      if (createRun.exitCode) process.exitCode = createRun.exitCode;
      return;
    }
    case 'apply:gtm:publish': {
      const publishRun = await runGtmControlledPublish(root, process.argv.slice(3));
      for (const line of gtmPublishOutputLines(publishRun)) {
        console.log(maskSecretsInText(line));
      }
      if (publishRun.exitCode) process.exitCode = publishRun.exitCode;
      return;
    }
    case 'repo':
      results = [runRepoCheck(root)];
      break;
    case 'ga4':
      results = [await runGa4Check()];
      break;
    case 'gtm':
      results = [await runGtmCheck()];
      break;
    case 'ads':
    case 'google-ads':
      results = [runGoogleAdsCheck()];
      break;
    case 'meta':
      results = [runMetaCheck()];
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: node scripts/marketing-ops/index.js [check|report|repo|ga4|gtm|gtm:preflight|gtm:payload-review|gtm:preview-qa-report|gtm:ga4-tags-payload-review|gtm:ga4-tags-preview-qa|gtm:publish-readiness-review|oauth:gtm-edit-url|oauth:gtm-publish-url|ads|meta|plan|plan:ga4|plan:gtm|apply|apply:ga4|apply:ga4:create|apply:gtm|apply:gtm:create|apply:gtm:ga4-tags:create|apply:gtm:publish|apply:validate]');
      process.exitCode = 1;
      return;
  }

  for (const result of results) {
    printResult(result);
  }

  if (reportPath) {
    console.log(`Report written: ${reportPath}`);
  }

  console.log('Mutation statement: no GA4, GTM, Google Ads, or Meta platform mutations were performed.');
}

try {
  main().catch((error) => {
    console.error(maskSecretsInText(error && error.stack ? error.stack : String(error)));
    process.exitCode = 1;
  });
} catch (error) {
  console.error(maskSecretsInText(error && error.stack ? error.stack : String(error)));
  process.exitCode = 1;
}
