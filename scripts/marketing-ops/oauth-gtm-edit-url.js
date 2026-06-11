'use strict';

const fs = require('fs');
const path = require('path');
const { URL, URLSearchParams } = require('url');
const { maskEnvValue } = require('./utils');

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const REQUIRED_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/tagmanager.edit.containers'
]);

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`${name} is required to generate the GTM edit-scope OAuth authorization URL.`);
  }
  return value;
}

function buildGtmEditAuthorizationUrl() {
  const clientId = requiredEnv('GOOGLE_CLIENT_ID');
  const redirectUri = requiredEnv('GOOGLE_OAUTH_REDIRECT_URI');
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: REQUIRED_SCOPES.join(' ')
  });
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.search = query.toString();

  return {
    url: url.toString(),
    clientId,
    scopes: REQUIRED_SCOPES.slice()
  };
}

function writeGtmEditAuthorizationUrl(root) {
  const result = buildGtmEditAuthorizationUrl();
  const outputPath = path.join(root, '.oauth-gtm-edit-url.local.txt');
  fs.writeFileSync(outputPath, `${result.url}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  return {
    ...result,
    outputPath
  };
}

function safeOutputLines(result) {
  return [
    'GTM edit-scope OAuth authorization URL generated locally.',
    `- Output file: ${result.outputPath}`,
    `- OAuth client ID present: yes (${maskEnvValue('GOOGLE_CLIENT_ID_PUBLIC', result.clientId)})`,
    '- OAuth client secret accessed by this helper: no',
    '- Existing refresh token accessed by this helper: no',
    '- Token values printed: no',
    '- Required scopes:',
    ...result.scopes.map((scope) => `  - ${scope}`),
    '- Open the local output file, complete Google consent, then replace only GOOGLE_REFRESH_TOKEN in local .env.',
    '- Keep MARKETING_AGENT_GTM_CREATE_ENABLED=false.'
  ];
}

module.exports = {
  REQUIRED_SCOPES,
  buildGtmEditAuthorizationUrl,
  safeOutputLines,
  writeGtmEditAuthorizationUrl
};
