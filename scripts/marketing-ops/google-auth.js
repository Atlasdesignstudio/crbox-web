'use strict';

const https = require('https');
const { URL, URLSearchParams } = require('url');
const { maskSecretsInText } = require('./utils');

class GoogleApiError extends Error {
  constructor(message, options = {}) {
    super(maskSecretsInText(message));
    this.name = 'GoogleApiError';
    this.status = options.status || 0;
    this.code = options.code || '';
    this.details = maskSecretsInText(options.details || '');
  }
}

function parseJsonSafe(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (_error) {
    return { raw: body };
  }
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body || null;
    const requestOptions = {
      method: options.method || 'GET',
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    };

    if (body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(requestOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const responseText = Buffer.concat(chunks).toString('utf8');
        const data = parseJsonSafe(responseText);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data });
          return;
        }

        const apiError = data.error || {};
        const message = typeof apiError === 'string'
          ? apiError
          : (apiError.message || data.error_description || `HTTP ${res.statusCode}`);
        reject(new GoogleApiError(message, {
          status: res.statusCode,
          code: apiError.status || data.error || '',
          details: JSON.stringify(data)
        }));
      });
    });

    req.on('error', (error) => reject(new GoogleApiError(error.message)));
    if (body) req.write(body);
    req.end();
  });
}

async function getGoogleAccessToken() {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
    grant_type: 'refresh_token'
  }).toString();

  const { data } = await requestJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!data.access_token) {
    throw new GoogleApiError('Google OAuth response did not include an access token.');
  }

  return data.access_token;
}

async function googleApiGet(url, accessToken) {
  const { data } = await requestJson(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  return data;
}

async function googleApiPost(url, accessToken, payload) {
  const { data } = await requestJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  });
  return data;
}

function readableGoogleError(error) {
  if (!error) return 'Unknown Google API error.';
  const status = error.status ? `HTTP ${error.status}` : 'Google API error';
  const code = error.code ? ` (${error.code})` : '';
  const authHint = /unauthorized_client/i.test(`${error.code} ${error.message}`)
    ? ' OAuth token refresh was rejected before API scopes could be evaluated; verify the OAuth client ID/secret match the refresh token and that the OAuth client is enabled.'
    : '';
  const details = error.details ? ` Details: ${error.details}` : '';
  return maskSecretsInText(`${status}${code}: ${error.message || String(error)}.${authHint}${details}`);
}

module.exports = {
  GoogleApiError,
  getGoogleAccessToken,
  googleApiGet,
  googleApiPost,
  readableGoogleError
};
