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
      console.error('Usage: node scripts/marketing-ops/index.js [check|report|repo|ga4|gtm|ads|meta]');
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
