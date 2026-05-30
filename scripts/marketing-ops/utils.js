'use strict';

const fs = require('fs');
const path = require('path');

const SECRET_PATTERN = /(TOKEN|SECRET|PASSWORD|KEY|CREDENTIAL|REFRESH|CLIENT_SECRET|ACCESS_TOKEN)/i;

function readTextIfExists(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return { exists: false, content: '', absolutePath };
  }
  return {
    exists: true,
    content: fs.readFileSync(absolutePath, 'utf8'),
    absolutePath
  };
}

function envValue(name, env = process.env) {
  return env[name] || '';
}

function missingEnv(names, env = process.env) {
  return names.filter((name) => !envValue(name, env));
}

function maskEnvValue(name, value) {
  if (!value) return '';
  if (SECRET_PATTERN.test(name)) return '[masked]';
  if (value.length > 12) return `${value.slice(0, 4)}...${value.slice(-4)}`;
  return value;
}

function maskSecretsInText(text) {
  if (!text) return '';
  return String(text)
    .replace(/([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|KEY|REFRESH|ACCESS_TOKEN|CLIENT_SECRET)[A-Z0-9_]*=)[^\s]+/gi, '$1[masked]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[masked]');
}

function makeCheck(id, label, passed, details, options = {}) {
  return {
    id,
    label,
    status: passed ? 'pass' : (options.status || 'warn'),
    details: maskSecretsInText(details || ''),
    evidence: options.evidence || []
  };
}

function makeSkipped(id, label, details, evidence = []) {
  return {
    id,
    label,
    status: 'skipped',
    details: maskSecretsInText(details || ''),
    evidence
  };
}

function summarizeStatus(checks) {
  return checks.reduce((counts, check) => {
    counts[check.status] = (counts[check.status] || 0) + 1;
    return counts;
  }, {});
}

function formatStatus(status) {
  return String(status || 'info').toUpperCase();
}

function unique(values) {
  return Array.from(new Set(values));
}

module.exports = {
  readTextIfExists,
  envValue,
  missingEnv,
  maskEnvValue,
  maskSecretsInText,
  makeCheck,
  makeSkipped,
  summarizeStatus,
  formatStatus,
  unique
};
