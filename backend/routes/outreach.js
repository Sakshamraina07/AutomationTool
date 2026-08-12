// outreach.js — AutoReach outreach funnel routes (PRD §6)
//
// Registered as a Fastify plugin from server.js with the shared Supabase client.
// Phase 1: contacts import, template create, manual send-logging, open pixel,
// manual status transitions, and the real /outreach/stats funnel.
// Phase 2 (Gmail send), Phase 4 (export) remain stubbed with a clear phase code.

const gmailClient = require('../lib/gmailClient');
const { renderTemplate } = require('../lib/render');
const { computeStats } = require('../lib/stats');
const { deliverEmail } = require('../lib/outreachSend');
const { startWorker, countSentSince } = require('../lib/sendWorker');
const policy = require('../lib/sendPolicy');

// Statuses that mean "already handled" — a matching row blocks a re-send so the
// same (contact, template) is never sent twice (§13). FAILED is retryable.
const ACTIVE_STATUSES = ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'REPLIED', 'INTERVIEW', 'CLOSED'];

// Module-level guard so the drip worker starts once even if the plugin is
// registered more than once.
let workerStarted = false;

// 1x1 transparent GIF (open-tracking pixel). Fast, unauthenticated, ALWAYS
// returns the GIF (PRD §6, §11).
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const DEFAULT_USER = 'default-user';

// Maps a target email status to its append-only event type (§5).
const STATUS_EVENT = {
  SENT: 'SENT', DELIVERED: 'DELIVERED', OPENED: 'OPEN', REPLIED: 'REPLY',
  BOUNCED: 'BOUNCE', INTERVIEW: 'INTERVIEW', CLOSED: 'OUTCOME',
};

async function outreachRoutes(fastify, opts) {
  const supabase = opts.supabase;
  if (!supabase) throw new Error('outreachRoutes requires a supabase client in options');
  const appBaseUrl = opts.appBaseUrl || process.env.APP_BASE_URL || '';
  const sender = process.env.GMAIL_SENDER_ADDRESS || '';

  // Start the background drip worker (no-op unless Gmail send is configured).
  if (!workerStarted) {
    workerStarted = true;
    startWorker({ supabase, appBaseUrl, sender, log: fastify.log });
  }

  // --- Health / Gmail self-check -------------------------------------------
  fastify.get('/outreach/health', async (request, reply) => {
    if (!gmailClient.gmailConfigured()) return { status: 'ok', gmail: 'not_configured' };
    try {
      const token = await gmailClient.getAccessToken();
      return { status: 'ok', gmail: token ? 'authenticated' : 'no_token' };
    } catch (err) {
      fastify.log.error('Gmail auth check failed: ' + err.message);
      return reply.status(200).send({ status: 'ok', gmail: 'error', detail: err.message });
    }
  });

  // --- Open pixel -----------------------------------------------------------
  fastify.get('/track/open/:trackingId', async (request, reply) => {
    try {
      await recordOpen(supabase, request.params.trackingId);
    } catch (err) {
      fastify.log.warn('open-pixel log failed: ' + err.message);
    }
    reply
      .header('Content-Type', 'image/gif')
      .header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      .header('Pragma', 'no-cache')
      .header('Expires', '0')
      .send(TRACKING_PIXEL);
  });

  // --- Contacts -------------------------------------------------------------
  // Body: { contacts: [ {recruiter_name, recruiter_email, company, role_title,
  //         source, notes} ] }  OR  { csv: "<csv text with headers>" }.
  // Dedupes on (user_id, recruiter_email) via the table's unique constraint.
  fastify.post('/outreach/contacts/import', async (request, reply) => {
    const body = request.body || {};
    let rows = [];

    if (Array.isArray(body.contacts)) {
      rows = body.contacts;
    } else if (typeof body.csv === 'string' && body.csv.trim()) {
      try {
        rows = parseCsv(body.csv);
      } catch (err) {
        return reply.status(400).send({ ok: false, error: 'csv_parse_failed', detail: err.message });
      }
    } else {
      return reply.status(400).send({ ok: false, error: 'provide contacts[] or csv' });
    }

    const cleaned = [];
    const seen = new Set();
    let skipped = 0;
    for (const r of rows) {
      const email = String(r.recruiter_email || r.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) { skipped++; continue; }
      if (seen.has(email)) { skipped++; continue; } // dedupe within the batch
      seen.add(email);
      cleaned.push({
        user_id: DEFAULT_USER,
        recruiter_email: email,
        recruiter_name: r.recruiter_name || r.name || null,
        company: r.company || null,
        role_title: r.role_title || r.role || null,
        source: r.source || 'csv',
        notes: r.notes || null,
      });
    }

    if (!cleaned.length) {
      return reply.status(400).send({ ok: false, error: 'no valid rows', skipped });
    }

    // ignoreDuplicates so re-importing the same list is a no-op for existing emails.
    const { data, error } = await supabase
      .from('contacts')
      .upsert(cleaned, { onConflict: 'user_id,recruiter_email', ignoreDuplicates: true })
      .select();

    if (error) {
      fastify.log.error(error);
      return reply.status(500).send({ ok: false, error: error.message });
    }
    const inserted = data ? data.length : 0;
    return { ok: true, inserted, skipped: skipped + (cleaned.length - inserted) };
  });

  fastify.get('/outreach/contacts', async (request, reply) => {
    const { data, error } = await supabase
      .from('contacts').select('*')
      .eq('user_id', DEFAULT_USER).order('created_at', { ascending: false });
    if (error) fastify.log.error(error);
    return data || [];
  });

  // Delete a contact + all of their outreach data (PRD §11 right-to-erasure).
  fastify.delete('/outreach/contacts/:id', async (request, reply) => {
    const contactId = request.params.id;
    const { data: emails } = await supabase
      .from('outreach_emails').select('id').eq('contact_id', contactId);
    const emailIds = (emails || []).map((e) => e.id);
    if (emailIds.length) {
      await supabase.from('email_events').delete().in('outreach_email_id', emailIds);
      await supabase.from('email_replies').delete().in('outreach_email_id', emailIds);
      await supabase.from('outreach_emails').delete().in('id', emailIds);
    }
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) return reply.status(500).send({ ok: false, error: error.message });
    return { ok: true, deleted_emails: emailIds.length };
  });

  // --- Templates ------------------------------------------------------------
  fastify.post('/outreach/templates', async (request, reply) => {
    const b = request.body || {};
    if (!b.name || !b.subject_template || !b.body_template) {
      return reply.status(400).send({ ok: false, error: 'name, subject_template, body_template required' });
    }
    const row = {
      user_id: DEFAULT_USER,
      name: b.name,
      variant_label: b.variant_label || 'A',
      subject_template: b.subject_template,
      body_template: b.body_template,
      is_active: b.is_active !== undefined ? !!b.is_active : true,
    };
    if (b.id) row.id = b.id; // update path
    const { data, error } = await supabase
      .from('email_templates').upsert(row).select().single();
    if (error) {
      fastify.log.error(error);
      return reply.status(500).send({ ok: false, error: error.message });
    }
    return { ok: true, template: data };
  });

  fastify.get('/outreach/templates', async (request, reply) => {
    const { data, error } = await supabase
      .from('email_templates').select('*')
      .eq('user_id', DEFAULT_USER).order('created_at', { ascending: false });
    if (error) fastify.log.error(error);
    return data || [];
  });

  // --- Manual send-log (Phase 1) -------------------------------------------
  // Records that an email was sent (outside Gmail automation) so the funnel is
  // usable immediately. Body: { contact_id, template_id }. Renders + snapshots
  // subject/body, writes the row (status SENT) + a SENT event. Idempotent per
  // (contact_id, template_id) — the §13 "never sent twice" guarantee.
  fastify.post('/outreach/emails/log', async (request, reply) => {
    const { contact_id, template_id } = request.body || {};
    if (!contact_id || !template_id) {
      return reply.status(400).send({ ok: false, error: 'contact_id and template_id required' });
    }

    const { data: existing } = await supabase
      .from('outreach_emails').select('id')
      .eq('contact_id', contact_id).eq('template_id', template_id)
      .not('sent_at', 'is', null).limit(1);
    if (existing && existing.length) {
      return reply.status(200).send({ ok: true, skipped: true, reason: 'already_sent', id: existing[0].id });
    }

    const { data: contact } = await supabase
      .from('contacts').select('*').eq('id', contact_id).single();
    const { data: template } = await supabase
      .from('email_templates').select('*').eq('id', template_id).single();
    if (!contact || !template) {
      return reply.status(404).send({ ok: false, error: 'contact or template not found' });
    }
    if (contact.opted_out) {
      return reply.status(409).send({ ok: false, error: 'contact_opted_out' });
    }

    const subject = renderTemplate(template.subject_template, contact);
    const body = renderTemplate(template.body_template, contact);
    const nowIso = new Date().toISOString();

    const { data: inserted, error } = await supabase
      .from('outreach_emails').insert([{
        user_id: DEFAULT_USER,
        contact_id, template_id,
        variant_label: template.variant_label,
        subject, body_snapshot: body,
        status: 'SENT', sent_at: nowIso,
      }]).select().single();
    if (error) {
      fastify.log.error(error);
      return reply.status(500).send({ ok: false, error: error.message });
    }

    await supabase.from('email_events').insert([{
      outreach_email_id: inserted.id, event_type: 'SENT',
      metadata: { source: 'manual' }, occurred_at: nowIso,
    }]);
    return { ok: true, email: inserted };
  });

  // --- Gmail send — Phase 2 -------------------------------------------------
  // Queue + send outreach via the Gmail API. Body:
  //   { template_id, contact_ids?: [], mode?: 'queue'|'now' }
  // contact_ids defaults to every non-opted-out contact with no prior email for
  // this template. Creates QUEUED rows (idempotent per contact+template), then:
  //   mode 'now'   → sends up to the current allowance inline, rest stay QUEUED
  //   mode 'queue' → leaves them for the once/min drip worker (default)
  // Enforces the §10 daily/hourly caps and never double-sends (§13).
  fastify.post('/outreach/send', async (request, reply) => {
    if (!gmailClient.sendConfigured()) {
      return reply.status(400).send({
        ok: false, error: 'gmail_not_configured',
        detail: 'Set GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN and GMAIL_SENDER_ADDRESS in backend/.env',
      });
    }
    const body = request.body || {};
    const templateId = body.template_id;
    const mode = body.mode === 'now' ? 'now' : 'queue';
    if (!templateId) {
      return reply.status(400).send({ ok: false, error: 'template_id required' });
    }

    const { data: template } = await supabase
      .from('email_templates').select('*').eq('id', templateId).single();
    if (!template) return reply.status(404).send({ ok: false, error: 'template_not_found' });

    // Resolve the target contacts.
    let contacts;
    if (Array.isArray(body.contact_ids) && body.contact_ids.length) {
      const { data } = await supabase
        .from('contacts').select('*')
        .eq('user_id', DEFAULT_USER).in('id', body.contact_ids);
      contacts = data || [];
    } else {
      const { data } = await supabase
        .from('contacts').select('*')
        .eq('user_id', DEFAULT_USER).eq('opted_out', false);
      contacts = data || [];
    }

    // Skip contacts that already have an active email for this template (idempotency).
    const { data: prior } = await supabase
      .from('outreach_emails').select('contact_id')
      .eq('user_id', DEFAULT_USER)
      .eq('template_id', templateId).in('status', ACTIVE_STATUSES);
    const already = new Set((prior || []).map((r) => r.contact_id));

    const toCreate = [];
    let skippedOptOut = 0, skippedExisting = 0;
    for (const c of contacts) {
      if (c.opted_out) { skippedOptOut++; continue; }
      if (already.has(c.id)) { skippedExisting++; continue; }
      toCreate.push({
        user_id: DEFAULT_USER,
        contact_id: c.id, template_id: templateId,
        variant_label: template.variant_label,
        subject: renderTemplate(template.subject_template, c),
        body_snapshot: renderTemplate(template.body_template, c),
        status: 'QUEUED',
      });
    }

    let queued = [];
    if (toCreate.length) {
      const { data, error } = await supabase.from('outreach_emails').insert(toCreate).select('id');
      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ ok: false, error: error.message });
      }
      queued = data || [];
    }

    // Immediate mode: send up to the current allowance now; leave the rest queued.
    let sent = 0, failed = 0, sentIds = [];
    if (mode === 'now' && queued.length) {
      const nowIso = new Date().toISOString();
      const dailyCap = policy.resolveDailyCap(process.env);
      const hourlyCap = policy.resolveHourlyCap(process.env);
      const sentToday = await countSentSince(supabase, policy.startOfUtcDayIso(nowIso));
      const sentLastHour = await countSentSince(supabase, policy.hoursAgoIso(nowIso, 1));
      const allow = policy.allowance({ dailyCap, hourlyCap, perMinute: null, sentToday, sentLastHour });

      for (const row of queued.slice(0, allow)) {
        try {
          const r = await deliverEmail({ supabase, emailId: row.id, appBaseUrl, sender });
          if (r && r.skipped) continue; // claimed elsewhere / already sent — leave it
          sent++; sentIds.push(row.id);
        } catch (err) {
          failed++;
          fastify.log.warn(`send failed for ${row.id}: ${err.message}`);
        }
      }
    }

    return {
      ok: true, mode,
      queued: queued.length,
      sent, failed,
      remaining_queued: queued.length - sent - failed,
      skipped_opted_out: skippedOptOut,
      skipped_existing: skippedExisting,
    };
  });

  // Current sending posture: caps, how many sent in each window, remaining
  // allowance, and queue depth (§10 transparency for the dashboard).
  fastify.get('/outreach/send/status', async (request, reply) => {
    const nowIso = new Date().toISOString();
    const dailyCap = policy.resolveDailyCap(process.env);
    const hourlyCap = policy.resolveHourlyCap(process.env);
    const sentToday = await countSentSince(supabase, policy.startOfUtcDayIso(nowIso));
    const sentLastHour = await countSentSince(supabase, policy.hoursAgoIso(nowIso, 1));
    const { count: queuedCount } = await supabase
      .from('outreach_emails').select('id', { count: 'exact', head: true })
      .eq('user_id', DEFAULT_USER).eq('status', 'QUEUED');
    return {
      configured: gmailClient.sendConfigured(),
      sender: sender || null,
      daily_cap: dailyCap,
      hourly_cap: hourlyCap,
      hard_max_daily: policy.HARD_MAX_DAILY,
      sent_today: sentToday,
      sent_last_hour: sentLastHour,
      remaining_today: Math.max(0, dailyCap - sentToday),
      queued: queuedCount || 0,
    };
  });

  // Real opt-out (§11): mark a contact opted_out and cancel any of their QUEUED
  // emails so nothing further goes out.
  fastify.post('/outreach/contacts/:id/opt-out', async (request, reply) => {
    const id = request.params.id;
    const { error } = await supabase
      .from('contacts').update({ opted_out: true }).eq('id', id);
    if (error) return reply.status(500).send({ ok: false, error: error.message });
    await supabase.from('outreach_emails')
      .update({ status: 'CANCELLED' })
      .eq('contact_id', id).eq('status', 'QUEUED');
    return { ok: true };
  });

  // --- Emails list ----------------------------------------------------------
  // Joins contact + template for a display-ready table (recipient, company, …).
  fastify.get('/outreach/emails', async (request, reply) => {
    const { status, template_id } = request.query || {};
    let q = supabase.from('outreach_emails')
      .select('*, contacts(recruiter_name, recruiter_email, company), email_templates(name, variant_label)')
      .eq('user_id', DEFAULT_USER)
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (template_id) q = q.eq('template_id', template_id);
    const { data, error } = await q;
    if (error) fastify.log.error(error);
    return data || [];
  });

  // --- Manual status transition (Mark Interview / Rejected / Replied …) ------
  // Body: { status, sentiment?, outcome?, reply_body? }.
  fastify.post('/outreach/emails/:id/status', async (request, reply) => {
    const id = request.params.id;
    const { status, sentiment, outcome, reply_body } = request.body || {};
    const eventType = STATUS_EVENT[status];
    if (!eventType) {
      return reply.status(400).send({ ok: false, error: 'unknown status', allowed: Object.keys(STATUS_EVENT) });
    }

    const nowIso = new Date().toISOString();
    const patch = { status };
    if (status === 'REPLIED') { patch.replied_at = nowIso; if (sentiment) patch.reply_sentiment = sentiment; }
    if (status === 'INTERVIEW') { patch.interview_at = nowIso; }
    if (status === 'CLOSED' && outcome) { patch.outcome = outcome; }

    const { data: updated, error } = await supabase
      .from('outreach_emails').update(patch).eq('id', id).select().single();
    if (error) {
      fastify.log.error(error);
      return reply.status(500).send({ ok: false, error: error.message });
    }

    await supabase.from('email_events').insert([{
      outreach_email_id: id, event_type: eventType,
      metadata: { source: 'user', sentiment: sentiment || null, outcome: outcome || null },
      occurred_at: nowIso,
    }]);

    // A manually-recorded reply is also a stored reply row (user is source of truth).
    if (status === 'REPLIED') {
      await supabase.from('email_replies').insert([{
        outreach_email_id: id,
        full_body: reply_body || null,
        snippet: reply_body ? String(reply_body).slice(0, 200) : null,
        classification: sentiment || null,
        classified_by: 'user',
      }]);
    }
    return { ok: true, email: updated };
  });

  // --- Stats ----------------------------------------------------------------
  fastify.get('/outreach/stats', async (request, reply) => {
    const { data, error } = await supabase
      .from('outreach_emails').select('*').eq('user_id', DEFAULT_USER);
    if (error) {
      fastify.log.error(error);
      return reply.status(500).send({ ok: false, error: error.message });
    }
    return computeStats(data || []);
  });

  // --- Timeline (sends vs replies per day) — dashboard chart ---------------
  fastify.get('/outreach/timeline', async (request, reply) => {
    const { data, error } = await supabase
      .from('outreach_emails').select('sent_at, replied_at')
      .eq('user_id', DEFAULT_USER);
    if (error) { fastify.log.error(error); return []; }
    const byDay = new Map();
    const bump = (iso, key) => {
      if (!iso) return;
      const day = String(iso).slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, { date: day, sent: 0, replied: 0 });
      byDay.get(day)[key]++;
    };
    for (const e of data || []) { bump(e.sent_at, 'sent'); bump(e.replied_at, 'replied'); }
    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  });

  // --- Export — Phase 4 -----------------------------------------------------
  fastify.get('/outreach/export.csv', async (request, reply) => {
    return reply.status(501).send({ ok: false, error: 'not_implemented', phase: 4 });
  });
}

// --- helpers ---------------------------------------------------------------

// Minimal, dependency-optional CSV parser: uses papaparse when installed,
// otherwise a small built-in reader (handles quotes, commas, CRLF, headers).
function parseCsv(text) {
  try {
    const Papa = require('papaparse');
    const out = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
    return out.data;
  } catch (_) {
    return parseCsvFallback(text);
  }
}

function parseCsvFallback(text) {
  const rows = [];
  let field = '', row = [], inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => Object.fromEntries(headers.map((h, idx) => [h, (r[idx] || '').trim()])));
}

// Records an open against the email whose tracking_id matches. No-op on unknown id.
async function recordOpen(supabase, trackingId) {
  const { data: email, error } = await supabase
    .from('outreach_emails')
    .select('id, open_count, first_opened_at, status')
    .eq('tracking_id', trackingId).single();
  if (error || !email) return;

  const patch = { open_count: (email.open_count || 0) + 1 };
  if (!email.first_opened_at) patch.first_opened_at = new Date().toISOString();
  if (['SENT', 'DELIVERED'].includes(email.status)) patch.status = 'OPENED';

  await supabase.from('outreach_emails').update(patch).eq('id', email.id);
  await supabase.from('email_events').insert([
    { outreach_email_id: email.id, event_type: 'OPEN', metadata: {} },
  ]);
}

module.exports = outreachRoutes;
module.exports._internal = { parseCsvFallback };
