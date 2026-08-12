// stats.js — Outreach funnel + A/B metrics (PRD §8). Pure: no I/O, unit-testable.
//
// Input: an array of `outreach_emails` rows (current-state). A row counts as
// "sent" once it has a sent_at timestamp. `email_events` remains the append-only
// audit source (§5 design note); the live dashboard reads current-state for speed.

function isSent(e) {
  return Boolean(e.sent_at) ||
    ['SENT', 'DELIVERED', 'BOUNCED', 'OPENED', 'REPLIED', 'INTERVIEW', 'CLOSED']
      .includes(e.status);
}
function isBounced(e) { return e.status === 'BOUNCED'; }
function isOpened(e) { return (e.open_count || 0) > 0 || Boolean(e.first_opened_at); }
function isReplied(e) { return Boolean(e.replied_at); }
function isPositive(e) { return ['interview', 'positive'].includes(e.reply_sentiment); }
function isInterview(e) { return Boolean(e.interview_at) || e.status === 'INTERVIEW'; }

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function rate(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

// Core funnel counts + rates for one set of emails.
function funnel(emails) {
  const sent = emails.filter(isSent);
  const bounced = sent.filter(isBounced);
  const delivered = sent.filter((e) => !isBounced(e));
  const deliveredN = delivered.length;

  const opened = delivered.filter(isOpened);
  const replied = delivered.filter(isReplied);
  const positive = delivered.filter(isPositive);
  const interview = delivered.filter(isInterview);

  // Median response time in hours, over emails that have both timestamps.
  const responseHours = replied
    .filter((e) => e.sent_at && e.replied_at)
    .map((e) => (new Date(e.replied_at) - new Date(e.sent_at)) / 3.6e6)
    .filter((h) => Number.isFinite(h) && h >= 0);

  return {
    sent: sent.length,
    delivered: deliveredN,
    bounced: bounced.length,
    opened: opened.length,
    replied: replied.length,
    positive: positive.length,
    interview: interview.length,
    open_rate: rate(opened.length, deliveredN),        // soft metric (§7)
    reply_rate: rate(replied.length, deliveredN),
    positive_reply_rate: rate(positive.length, deliveredN),
    interview_rate: rate(interview.length, deliveredN),
    median_response_hours: median(responseHours),
  };
}

// --- Two-proportion z-test (§8) -------------------------------------------
// Standard normal CDF via Abramowitz & Stegun 7.1.26 erf approximation.
function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  let p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 +
    t * (-1.821255978 + t * 1.330274429))));
  p = 1 - p;
  return z >= 0 ? p : 1 - p;
}

// Compares reply rates of two variants. Returns a plain-language confidence note.
function twoProportionTest(a, b) {
  const n1 = a.delivered, n2 = b.delivered;
  const x1 = a.replied, x2 = b.replied;
  if (n1 < 30 || n2 < 30) {
    return { significant: null, pValue: null, note: 'not enough data yet' };
  }
  const p1 = x1 / n1, p2 = x2 / n2;
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (se === 0) {
    return { significant: false, pValue: 1, note: 'no measurable difference yet' };
  }
  const z = (p1 - p2) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const significant = pValue < 0.05;
  const note = significant
    ? 'likely a real difference'
    : 'difference not statistically significant yet';
  return { significant, pValue, zScore: z, note };
}

// Full stats payload consumed by GET /outreach/stats and the dashboard.
function computeStats(emails) {
  const overall = funnel(emails);

  const byVariant = new Map();
  for (const e of emails) {
    const key = e.variant_label || '—';
    if (!byVariant.has(key)) byVariant.set(key, []);
    byVariant.get(key).push(e);
  }

  const variants = [...byVariant.entries()]
    .map(([variant_label, rows]) => ({ variant_label, ...funnel(rows) }))
    .sort((a, b) => a.variant_label.localeCompare(b.variant_label));

  // Pairwise A vs B note when exactly the two canonical variants are present.
  let abTest = null;
  const A = variants.find((v) => v.variant_label === 'A');
  const B = variants.find((v) => v.variant_label === 'B');
  if (A && B) abTest = { a: 'A', b: 'B', ...twoProportionTest(A, B) };

  return { overall, variants, abTest };
}

module.exports = {
  computeStats, funnel, twoProportionTest, median, normalCdf,
  isSent, isBounced, isOpened, isReplied, isInterview,
};
