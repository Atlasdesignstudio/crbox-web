#!/usr/bin/env node
'use strict';

const REQUIRED = Object.freeze([
  'GOOGLE_ADS_CUSTOMER_ID',
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN'
]);

const OPTIONAL = Object.freeze([
  'GOOGLE_ADS_LOGIN_CUSTOMER_ID'
]);

function maskCustomerId(value) {
  const normalized = String(value || '').replace(/[^0-9]/g, '');
  if (!normalized) return 'missing';
  if (normalized.length <= 4) return '****';
  return `${normalized.slice(0, 3)}...${normalized.slice(-4)}`;
}

function statusFor(name) {
  const value = process.env[name];
  const present = Boolean(value && String(value).trim());
  const masked = name.endsWith('CUSTOMER_ID') ? maskCustomerId(value) : present ? 'present' : 'missing';
  return { name, present, masked };
}

const required = REQUIRED.map(statusFor);
const optional = OPTIONAL.map(statusFor);
const missingRequired = required.filter((item) => !item.present).map((item) => item.name);
const result = missingRequired.length ? 'blocked_missing_required_vars' : 'pass';

console.log(`setup check result: ${result}`);
console.log('required variables:');
for (const item of required) {
  console.log(`- ${item.name}: ${item.masked}`);
}
console.log('optional variables:');
for (const item of optional) {
  console.log(`- ${item.name}: ${item.masked}`);
}
console.log('Secrets printed: false');

if (missingRequired.length) {
  console.log(`missing required vars: ${missingRequired.join(', ')}`);
  process.exitCode = 1;
}
