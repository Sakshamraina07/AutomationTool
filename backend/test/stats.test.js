// Quick known-answer checks for lib/stats.js and lib/render.js (PRD §14).
const assert = require('assert');
const { computeStats, funnel, twoProportionTest, median } = require('../lib/stats');
const { renderTemplate } = require('../lib/render');

function approx(a, b, eps = 1e-9) { return Math.abs(a - b) <= eps; }

// --- render ----------------------------------------------------------------
assert.strictEqual(
  renderTemplate('Hi {{first_name}} at {{company}}', { recruiter_name: 'Dana Lee', company: 'Acme' }),
  'Hi Dana at Acme'
);
assert.strictEqual(renderTemplate('Role: {{role_title}}', {}), 'Role: ', 'unknown → blank');
assert.strictEqual(renderTemplate('{{ first_name }}', { recruiter_name: 'Sam' }), 'Sam', 'whitespace tolerant');

// --- median ----------------------------------------------------------------
assert.strictEqual(median([]), null);
assert.strictEqual(median([5]), 5);
assert.strictEqual(median([1, 2, 3, 4]), 2.5);

// --- funnel: hand-built rows ----------------------------------------------
// 10 sent; 1 bounced → 9 delivered; 4 opened; 3 replied; 2 positive; 1 interview.
const now = Date.now();
const H = 3.6e6;
const rows = [];
for (let i = 0; i < 10; i++) {
  rows.push({
    status: 'SENT', variant_label: i < 5 ? 'A' : 'B',
    sent_at: new Date(now - 48 * H).toISOString(),
    open_count: 0,
  });
}
rows[0].status = 'BOUNCED';                         // 1 bounce
rows[1].open_count = 2; rows[1].first_opened_at = new Date(now).toISOString();
rows[2].open_count = 1;
rows[3].open_count = 1;
rows[4].open_count = 1;                              // 4 opened total
rows[5].replied_at = new Date(now - 46 * H).toISOString(); rows[5].reply_sentiment = 'interview';
rows[6].replied_at = new Date(now - 24 * H).toISOString(); rows[6].reply_sentiment = 'positive';
rows[7].replied_at = new Date(now - 47 * H).toISOString(); rows[7].reply_sentiment = 'rejection';
rows[5].interview_at = new Date(now).toISOString(); // 1 interview

const f = funnel(rows);
assert.strictEqual(f.sent, 10, 'sent');
assert.strictEqual(f.bounced, 1, 'bounced');
assert.strictEqual(f.delivered, 9, 'delivered = sent - bounced');
assert.strictEqual(f.opened, 4, 'opened');
assert.strictEqual(f.replied, 3, 'replied');
assert.strictEqual(f.positive, 2, 'positive (interview+positive)');
assert.strictEqual(f.interview, 1, 'interview');
assert(approx(f.reply_rate, 3 / 9), 'reply rate = 3/9');
assert(approx(f.open_rate, 4 / 9), 'open rate = 4/9');
assert(approx(f.interview_rate, 1 / 9), 'interview rate = 1/9');

// median response time: replies at 2h, 1h(24h ago→ from 48h sent =24h... ) compute explicitly
// sent 48h ago; replies at 46h/24h/47h ago → elapsed 2h,24h,1h → median 2h
assert(approx(f.median_response_hours, 2), 'median response ~2h, got ' + f.median_response_hours);

// --- variant split ---------------------------------------------------------
const stats = computeStats(rows);
assert.strictEqual(stats.variants.length, 2, 'A and B');
assert.strictEqual(stats.variants[0].variant_label, 'A');
assert.strictEqual(stats.overall.sent, 10);

// --- two-proportion test: small n → not enough data ------------------------
const t1 = twoProportionTest({ delivered: 9, replied: 3 }, { delivered: 9, replied: 1 });
assert.strictEqual(t1.significant, null, 'n<30 → null');
assert.strictEqual(t1.note, 'not enough data yet');

// --- two-proportion test: large n, clear difference ------------------------
const t2 = twoProportionTest({ delivered: 150, replied: 18 }, { delivered: 150, replied: 6 });
assert.strictEqual(t2.significant, true, '12% vs 4% at n=150 → significant');
assert(t2.pValue < 0.05, 'p<0.05');

// --- large n, identical rates → not significant ----------------------------
const t3 = twoProportionTest({ delivered: 200, replied: 20 }, { delivered: 200, replied: 20 });
assert.strictEqual(t3.significant, false);

console.log('✓ all stats/render assertions passed');
