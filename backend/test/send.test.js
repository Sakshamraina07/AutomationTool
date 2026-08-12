// Known-answer checks for the Phase 2 send path: MIME building (gmailClient),
// pixel/HTML assembly + backoff (outreachSend), and cap math (sendPolicy).
const assert = require('assert');
const gmail = require('../lib/gmailClient');
const send = require('../lib/outreachSend');
const policy = require('../lib/sendPolicy');

// --- gmailClient.buildRawMessage ------------------------------------------
// Decode the base64url payload back to the raw RFC 5322 message and inspect it.
function decodeRaw(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64').toString('utf8');
}

const raw = decodeRaw(gmail.buildRawMessage({
  from: 'Me <me@example.com>',
  to: 'Dana <dana@acme.com>',
  subject: 'Hello Acme',
  text: 'Plain body',
  html: '<b>HTML body</b>',
  messageId: '<abc@example.com>',
  listUnsubscribe: '<mailto:me@example.com?subject=unsubscribe>',
  boundary: 'BND',
}));

assert.ok(raw.includes('From: Me <me@example.com>'), 'From header present');
assert.ok(raw.includes('To: Dana <dana@acme.com>'), 'To header present');
assert.ok(raw.includes('Subject: Hello Acme'), 'ASCII subject not needlessly encoded');
assert.ok(raw.includes('Message-ID: <abc@example.com>'), 'Message-ID present');
assert.ok(raw.includes('List-Unsubscribe: <mailto:me@example.com?subject=unsubscribe>'), 'unsub header');
assert.ok(raw.includes('multipart/alternative; boundary="BND"'), 'multipart alternative');
assert.ok(raw.includes('--BND--'), 'closing boundary');
assert.ok(raw.includes(Buffer.from('Plain body').toString('base64')), 'plaintext part base64');
assert.ok(raw.includes(Buffer.from('<b>HTML body</b>').toString('base64')), 'html part base64');

// Header injection: CRLF in subject must not create new headers. The sanitizer
// folds the CRLF into a space, so "Bcc:" survives only as subject text, never
// as a standalone header line.
const injected = decodeRaw(gmail.buildRawMessage({
  from: 'me@example.com', to: 'x@y.com',
  subject: 'Hi\r\nBcc: evil@evil.com', text: 't', html: 'h', boundary: 'B',
}));
const headerBlock = injected.split('\r\n\r\n')[0];
assert.ok(!headerBlock.split('\r\n').some((l) => /^Bcc:/i.test(l)), 'no injected Bcc header line');
const subjectLine = headerBlock.split('\r\n').find((l) => l.startsWith('Subject:'));
assert.ok(subjectLine.includes('Bcc: evil@evil.com'), 'injected text folded into subject value');

// Non-ASCII subject → RFC 2047 encoded-word.
const uni = decodeRaw(gmail.buildRawMessage({
  from: 'me@example.com', to: 'x@y.com', subject: 'Café ☕', text: 't', html: 'h', boundary: 'B',
}));
assert.ok(/Subject: =\?UTF-8\?B\?/.test(uni), 'unicode subject encoded');

// address/domain helpers
assert.strictEqual(gmail.addressOnly('Me <me@example.com>'), 'me@example.com');
assert.strictEqual(gmail.domainOf('Me <me@example.com>'), 'example.com');

// --- outreachSend: pixel + html -------------------------------------------
assert.strictEqual(send.trackingPixel('', 'tid'), '', 'no base URL → no pixel');
const px = send.trackingPixel('https://api.test/', 'tid-123');
assert.ok(px.includes('https://api.test/track/open/tid-123'), 'pixel points at open route (no double slash)');
assert.ok(!px.includes('//track'), 'trailing slash trimmed');

const htmlBody = send.buildHtmlBody('Line 1\nLine 2', 'https://api.test', 'tid');
assert.ok(htmlBody.includes('Line 1<br>'), 'newlines → <br>');
assert.ok(htmlBody.includes('track/open/tid'), 'pixel injected into body');

// HTML escaping prevents body from breaking the markup.
assert.ok(send.buildHtmlBody('a<script>b', 'https://api.test', 't').includes('a&lt;script&gt;b'), 'body escaped');

// --- outreachSend.isRetryable ---------------------------------------------
assert.strictEqual(send.isRetryable({ code: 429 }), true, '429 retryable');
assert.strictEqual(send.isRetryable({ code: 503 }), true, '5xx retryable');
assert.strictEqual(send.isRetryable({ code: 400 }), false, '400 not retryable');
assert.strictEqual(send.isRetryable({ code: 'ETIMEDOUT' }), true, 'timeout retryable');

// --- sendPolicy: caps ------------------------------------------------------
assert.strictEqual(policy.resolveDailyCap({}), 80, 'default daily cap 80');
assert.strictEqual(policy.resolveDailyCap({ OUTREACH_DAILY_CAP: '120' }), 120, 'configurable cap');
assert.strictEqual(policy.resolveDailyCap({ OUTREACH_DAILY_CAP: '9999' }), 400, 'hard-capped at 400');
assert.strictEqual(policy.resolveDailyCap({ OUTREACH_DAILY_CAP: '-5' }), 1, 'min 1');
assert.strictEqual(policy.resolveHourlyCap({}), 40, 'default hourly 40');
assert.ok(policy.resolveHourlyCap({ OUTREACH_DAILY_CAP: '10' }) <= 10, 'hourly never exceeds daily');

// allowance is the min of all constraints, floored at 0
assert.strictEqual(
  policy.allowance({ dailyCap: 80, hourlyCap: 40, perMinute: 2, sentToday: 0, sentLastHour: 0 }), 2, 'per-minute binds');
assert.strictEqual(
  policy.allowance({ dailyCap: 80, hourlyCap: 40, perMinute: null, sentToday: 79, sentLastHour: 0 }), 1, 'daily binds');
assert.strictEqual(
  policy.allowance({ dailyCap: 80, hourlyCap: 40, perMinute: 10, sentToday: 80, sentLastHour: 0 }), 0, 'cap reached → 0');
assert.strictEqual(
  policy.allowance({ dailyCap: 80, hourlyCap: 40, perMinute: null, sentToday: 0, sentLastHour: 40 }), 0, 'hourly reached → 0');

// UTC-day boundary is a real midnight
assert.ok(policy.startOfUtcDayIso('2026-08-11T15:30:00.000Z').startsWith('2026-08-11T00:00:00'), 'start of UTC day');

console.log('✓ all Phase 2 send assertions passed');
