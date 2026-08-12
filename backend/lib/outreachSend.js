// outreachSend.js — deliver a single QUEUED outreach_emails row via Gmail.
//
// Shared by the immediate-send route and the background drip worker so both
// paths render, inject the open-pixel, send with backoff, and persist state
// identically. Idempotent: a row that already has a gmail_message_id is skipped.

const gmailClient = require('./gmailClient');
const { renderTemplate } = require('./render');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToHtml(text) {
  return escapeHtml(text).replace(/\r?\n/g, '<br>\n');
}

// 1x1 open-tracking pixel pointing back at this backend. Empty if no public
// base URL is configured (can't build a reachable src).
function trackingPixel(appBaseUrl, trackingId) {
  const base = String(appBaseUrl || '').replace(/\/+$/, '');
  if (!base || !trackingId) return '';
  const src = `${base}/track/open/${trackingId}`;
  return `<img src="${src}" width="1" height="1" alt="" style="display:none;max-height:0;overflow:hidden" />`;
}

function buildHtmlBody(text, appBaseUrl, trackingId) {
  return `<div style="white-space:normal">${textToHtml(text)}</div>${trackingPixel(appBaseUrl, trackingId)}`;
}

function isRetryable(err) {
  const status = (err && (err.code != null ? err.code : err.status));
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500 && status < 600) return true;
  return ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN'].includes(err && err.code);
}

// Retry transient Gmail/network failures with exponential backoff (§10).
async function withBackoff(fn, { retries = 3, baseMs = 400 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) throw err;
      await sleep(baseMs * 2 ** attempt);
    }
  }
  throw lastErr;
}

async function markFailed(supabase, emailId, reason) {
  const nowIso = new Date().toISOString();
  await supabase.from('outreach_emails').update({ status: 'FAILED' }).eq('id', emailId);
  await supabase.from('email_events').insert([{
    outreach_email_id: emailId, event_type: 'ERROR',
    metadata: { reason: String(reason).slice(0, 300) }, occurred_at: nowIso,
  }]);
}

// Deliver one row. On success: status SENT + gmail ids + SENT event.
// On opt-out or hard failure: status FAILED + ERROR event, then rethrow.
async function deliverEmail({ supabase, emailId, appBaseUrl, sender }) {
  // Atomically claim the row: flip QUEUED → SENDING. Only one caller (the drip
  // worker vs. an inline "now" send) can win the conditional update, so the same
  // row is never delivered twice (§13 "never sent twice").
  const { data: claimed } = await supabase
    .from('outreach_emails').update({ status: 'SENDING' })
    .eq('id', emailId).eq('status', 'QUEUED').select('*');
  let email = claimed && claimed[0];
  if (!email) {
    // Not claimable as QUEUED — already sent, mid-send elsewhere, or another state.
    const { data: cur } = await supabase
      .from('outreach_emails').select('*').eq('id', emailId).single();
    if (!cur) throw new Error('email row not found: ' + emailId);
    if (cur.gmail_message_id) return { ok: true, skipped: true, id: cur.gmail_message_id };
    return { ok: true, skipped: true, reason: 'not_claimable', status: cur.status };
  }

  const { data: contact } = await supabase
    .from('contacts').select('*').eq('id', email.contact_id).single();
  const { data: template } = await supabase
    .from('email_templates').select('*').eq('id', email.template_id).single();
  if (!contact) { await markFailed(supabase, emailId, 'contact_not_found'); throw new Error('contact not found'); }
  if (contact.opted_out) {
    await markFailed(supabase, emailId, 'contact_opted_out');
    const e = new Error('contact_opted_out'); e.code = 'OPTED_OUT'; throw e;
  }

  const subject = email.subject || renderTemplate(template && template.subject_template, contact);
  const text = email.body_snapshot || renderTemplate(template && template.body_template, contact);
  const html = buildHtmlBody(text, appBaseUrl, email.tracking_id);
  const messageId = `<${email.tracking_id}@${gmailClient.domainOf(sender)}>`;
  const listUnsubscribe = `<mailto:${gmailClient.addressOnly(sender)}?subject=unsubscribe>`;

  let result;
  try {
    result = await withBackoff(() => gmailClient.sendMessage({
      from: sender, to: contact.recruiter_email, subject, html, text, messageId, listUnsubscribe,
    }));
  } catch (err) {
    await markFailed(supabase, emailId, err.message || 'send_failed');
    throw err;
  }

  const nowIso = new Date().toISOString();
  await supabase.from('outreach_emails').update({
    status: 'SENT', sent_at: nowIso,
    gmail_message_id: result.id, gmail_thread_id: result.threadId, rfc_message_id: messageId,
    subject, body_snapshot: text,
  }).eq('id', emailId);
  await supabase.from('email_events').insert([{
    outreach_email_id: emailId, event_type: 'SENT',
    metadata: { source: 'gmail', gmail_message_id: result.id }, occurred_at: nowIso,
  }]);

  return { ok: true, id: result.id, threadId: result.threadId };
}

module.exports = { deliverEmail, buildHtmlBody, textToHtml, trackingPixel, withBackoff, isRetryable };
