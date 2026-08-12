// gmailClient.js — Gmail API OAuth2 helper for AutoReach (PRD §4, §6)
//
// Sends from the user's own Gmail account via the Gmail API. All secrets live
// in the backend .env only (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET /
// GOOGLE_REFRESH_TOKEN) and are NEVER exposed to the extension or frontend.
//
// `googleapis` is required lazily so the server still boots for Phase 0 before
// the dependency is installed or credentials are configured.

let _oAuth2Client = null;

function gmailConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

function getOAuth2Client() {
  if (!gmailConfigured()) {
    throw new Error(
      'Gmail not configured: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and ' +
      'GOOGLE_REFRESH_TOKEN in backend/.env'
    );
  }

  let google;
  try {
    ({ google } = require('googleapis'));
  } catch (err) {
    throw new Error(
      "The 'googleapis' package is not installed. Run `npm install` in backend/."
    );
  }

  if (!_oAuth2Client) {
    _oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    _oAuth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
  }
  return _oAuth2Client;
}

// Returns a ready-to-use gmail client (googleapis) authenticated as the user.
function getGmailClient() {
  const { google } = require('googleapis');
  return google.gmail({ version: 'v1', auth: getOAuth2Client() });
}

// Phase 0 acceptance check: prove we can mint an access token from the refresh
// token. Returns the access token string (do not log it in production).
async function getAccessToken() {
  const client = getOAuth2Client();
  const { token } = await client.getAccessToken();
  return token;
}

// True only when we can actually send: OAuth is configured AND a From address
// is set (Gmail needs a real sender in the header).
function sendConfigured() {
  return gmailConfigured() && Boolean(process.env.GMAIL_SENDER_ADDRESS);
}

// Header values are attacker-influenced (template/contact data), so strip CR/LF
// to prevent header injection, and collapse stray whitespace.
function sanitizeHeader(value) {
  return String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').trim();
}

// RFC 2047 encode a header only when it contains non-ASCII (keeps ASCII readable).
function encodeHeaderWord(value) {
  const v = sanitizeHeader(value);
  if (/^[\x00-\x7F]*$/.test(v)) return v;
  return '=?UTF-8?B?' + Buffer.from(v, 'utf8').toString('base64') + '?=';
}

// Bare address out of "Name <a@b.com>" or "a@b.com".
function addressOnly(addr) {
  const m = String(addr || '').match(/<([^>]+)>/);
  return sanitizeHeader(m ? m[1] : addr);
}

function domainOf(addr) {
  const at = addressOnly(addr).split('@')[1];
  return at ? at.trim() : 'mail.local';
}

// base64 body part, wrapped at 76 chars per RFC 2045.
function b64Body(text) {
  return Buffer.from(String(text), 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
}

// Gmail's messages.send wants the full RFC 5322 message, base64url (no padding).
// Pure + deterministic (boundary/messageId are passed in) so it is unit-testable.
function buildRawMessage({ from, to, subject, html, text, messageId, listUnsubscribe, boundary }) {
  const bnd = boundary || ('=_ar_' + String(messageId || 'part').replace(/[^A-Za-z0-9]/g, '').slice(0, 24) || '=_ar_part');
  const headers = [
    `From: ${sanitizeHeader(from)}`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${encodeHeaderWord(subject)}`,
    'MIME-Version: 1.0',
  ];
  if (messageId) headers.push(`Message-ID: ${sanitizeHeader(messageId)}`);
  if (listUnsubscribe) headers.push(`List-Unsubscribe: ${sanitizeHeader(listUnsubscribe)}`);
  headers.push(`Content-Type: multipart/alternative; boundary="${bnd}"`);

  const parts = [
    `--${bnd}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64Body(text != null ? text : ''),
    `--${bnd}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64Body(html != null ? html : ''),
    `--${bnd}--`,
    '',
  ];

  const raw = headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n');
  return Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Send via the Gmail API as the authenticated user. Returns { id, threadId }.
async function sendMessage({ from, to, subject, html, text, messageId, listUnsubscribe }) {
  const gmail = getGmailClient();
  const raw = buildRawMessage({ from, to, subject, html, text, messageId, listUnsubscribe });
  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return { id: res.data.id, threadId: res.data.threadId };
}

module.exports = {
  gmailConfigured,
  sendConfigured,
  getOAuth2Client,
  getGmailClient,
  getAccessToken,
  buildRawMessage,
  sendMessage,
  addressOnly,
  domainOf,
};
