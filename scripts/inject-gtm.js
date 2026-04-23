#!/usr/bin/env node
/**
 * inject-gtm.js
 *
 * Reads the GTM container ID from gtm.config.json and replaces any existing
 * GTM container ID in all public HTML pages with the configured value.
 *
 * Run this script:
 *   - Before every deployment / publish
 *   - After any merge that may affect HTML pages
 *   - Whenever the GTM container ID changes
 *
 *   node scripts/inject-gtm.js
 *
 * To change the GTM container ID in the future, update containerId in
 * gtm.config.json and re-run this script — that is the only file you need
 * to edit.  All public HTML pages in the project root are updated automatically.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'gtm.config.json');

const { containerId } = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

if (!containerId || !/^GTM-[A-Z0-9]+$/.test(containerId)) {
  console.error(`Invalid GTM container ID in gtm.config.json: "${containerId}"`);
  process.exit(1);
}

const HTML_FILES = fs
  .readdirSync(ROOT)
  .filter(f => f.endsWith('.html') && fs.statSync(path.join(ROOT, f)).isFile())
  .sort();

const GTM_PATTERN = /GTM-[A-Z0-9]+/g;

let updated = 0;
let unchanged = 0;

for (const file of HTML_FILES) {
  const filePath = path.join(ROOT, file);

  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP  ${file} (file not found)`);
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const replaced = original.replace(GTM_PATTERN, containerId);

  if (replaced === original) {
    console.log(`  OK    ${file} (already up to date)`);
    unchanged++;
  } else {
    fs.writeFileSync(filePath, replaced, 'utf8');
    console.log(`  UPDATED  ${file}`);
    updated++;
  }
}

console.log(`\nDone. ${updated} file(s) updated, ${unchanged} already up to date.`);
console.log(`GTM container ID: ${containerId}`);
