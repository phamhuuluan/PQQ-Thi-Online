/**
 * Google Service Account auth — T-705 (DEC-OFF-02 A)
 */

const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function resolveKeyPath(config) {
  const keyPath = config.serviceAccountKeyPath || './service-account.json';
  if (path.isAbsolute(keyPath)) return keyPath;
  return path.join(__dirname, '..', keyPath);
}

function hasServiceAccount(config) {
  return fs.existsSync(resolveKeyPath(config));
}

function getAuthClient(config) {
  const keyPath = resolveKeyPath(config);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Service account key not found: ${keyPath}. See local-server/README.md`);
  }
  return new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: SCOPES,
  });
}

function getSheetsApi(config) {
  const auth = getAuthClient(config);
  return google.sheets({ version: 'v4', auth });
}

module.exports = { getSheetsApi, hasServiceAccount, resolveKeyPath, SCOPES };
