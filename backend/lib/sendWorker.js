// sendWorker.js — background drip that releases QUEUED emails within the §10
// safeguards (daily cap ≤400, hourly cap, per-minute burst). Runs once/minute
// via node-cron. node-cron is lazy-required so the server boots without it.

const policy = require('./sendPolicy');
const { deliverEmail } = require('./outreachSend');
const gmailClient = require('./gmailClient');

const DEFAULT_USER = 'default-user';

async function countSentSince(supabase, sinceIso) {
  const { count, error } = await supabase
    .from('outreach_emails')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', DEFAULT_USER)
    .not('sent_at', 'is', null)
    .gte('sent_at', sinceIso);
  if (error) throw error;
  return count || 0;
}

// One tick: compute the current allowance, then deliver up to that many of the
// oldest QUEUED rows. Returns a summary for logging/tests.
async function runOnce({ supabase, appBaseUrl, sender, env = process.env, nowIso, log }) {
  const now = nowIso || new Date().toISOString();
  const dailyCap = policy.resolveDailyCap(env);
  const hourlyCap = policy.resolveHourlyCap(env);
  const perMinute = policy.resolvePerMinute(env);

  const sentToday = await countSentSince(supabase, policy.startOfUtcDayIso(now));
  const sentLastHour = await countSentSince(supabase, policy.hoursAgoIso(now, 1));
  const allow = policy.allowance({ dailyCap, hourlyCap, perMinute, sentToday, sentLastHour });
  if (allow <= 0) return { sent: 0, failed: 0, allow, sentToday, reason: 'cap_reached' };

  const { data: queued, error } = await supabase
    .from('outreach_emails')
    .select('id')
    .eq('user_id', DEFAULT_USER)
    .eq('status', 'QUEUED')
    .order('created_at', { ascending: true })
    .limit(allow);
  if (error) throw error;
  if (!queued || !queued.length) return { sent: 0, failed: 0, allow, sentToday, reason: 'empty_queue' };

  let sent = 0, failed = 0;
  for (const row of queued) {
    try {
      const r = await deliverEmail({ supabase, emailId: row.id, appBaseUrl, sender });
      if (r.skipped) continue;
      sent++;
    } catch (err) {
      failed++;
      if (log) log.warn(`drip send failed for ${row.id}: ${err.message}`);
    }
  }
  return { sent, failed, allow, sentToday: sentToday + sent };
}

// Start the once-a-minute cron. No-op (returns null) when sending isn't
// configured, so a bare deployment stays inert. Returns the cron task.
function startWorker({ supabase, appBaseUrl, sender, env = process.env, log = console }) {
  if (!gmailClient.sendConfigured()) {
    log.warn && log.warn('[sendWorker] Gmail send not configured — drip worker inactive.');
    return null;
  }
  let cron;
  try {
    cron = require('node-cron');
  } catch (_) {
    log.warn && log.warn('[sendWorker] node-cron not installed — drip worker inactive.');
    return null;
  }

  let running = false;
  const task = cron.schedule('* * * * *', async () => {
    if (running) return; // never overlap ticks
    running = true;
    try {
      const res = await runOnce({ supabase, appBaseUrl, sender, env, log });
      if (res.sent || res.failed) {
        (log.info || log.log).call(log, `[sendWorker] sent ${res.sent}, failed ${res.failed} (allow ${res.allow})`);
      }
    } catch (err) {
      (log.error || log.log).call(log, '[sendWorker] tick error: ' + err.message);
    } finally {
      running = false;
    }
  });
  (log.info || log.log).call(log, '[sendWorker] drip worker started (once/min).');
  return task;
}

module.exports = { startWorker, runOnce, countSentSince };
