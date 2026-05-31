'use strict';

const fs = require('fs');
const path = require('path');

function unquoteValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadDotEnv(root) {
  const envPath = path.join(root, '.env');
  const result = {
    path: envPath,
    exists: fs.existsSync(envPath),
    loadedNames: [],
    skippedExistingNames: []
  };

  if (!result.exists) {
    return result;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    if (Object.prototype.hasOwnProperty.call(process.env, key)) {
      result.skippedExistingNames.push(key);
      continue;
    }

    process.env[key] = unquoteValue(line.slice(eqIndex + 1));
    result.loadedNames.push(key);
  }

  return result;
}

module.exports = {
  loadDotEnv
};
