// sendPolicy.js — pure sending-safeguard math (PRD §10).
//
// Daily cap defaults to 80 and is hard-capped at 400 (never spam-blast).
// Hourly cap and per-minute burst throttle the drip worker. All functions are
// pure (time is passed in as an ISO string) so they can be unit-tested.

const HARD_MAX_DAILY = 400;

function clampInt(raw, min, max, dflt) {
  const n = parseInt(raw, 10);
  const val = Number.isFinite(n) ? n : dflt;
  return Math.max(min, Math.min(max, val));
}

// Daily send ceiling — user-configurable, but never above HARD_MAX_DAILY.
function resolveDailyCap(env = {}) {
  return clampInt(env.OUTREACH_DAILY_CAP, 1, HARD_MAX_DAILY, 80);
}

// Hourly ceiling (§10: 30–50/hr is the safe band). Never exceeds the daily cap.
function resolveHourlyCap(env = {}) {
  return clampInt(env.OUTREACH_HOURLY_CAP, 1, resolveDailyCap(env), 40);
}

// Max emails a single worker tick (once/min) will release — burst limiter.
function resolvePerMinute(env = {}) {
  return clampInt(env.OUTREACH_PER_MINUTE, 1, 50, 2);
}

// Start of the UTC day for `nowIso` — the window daily counts are measured in.
function startOfUtcDayIso(nowIso) {
  const d = new Date(nowIso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function hoursAgoIso(nowIso, hours) {
  return new Date(new Date(nowIso).getTime() - hours * 3600 * 1000).toISOString();
}

// How many we may send right now, given today's/this-hour's counts.
// perMinute is applied only for the drip worker; pass Infinity for immediate sends.
function allowance({ dailyCap, hourlyCap, perMinute, sentToday, sentLastHour }) {
  return Math.max(0, Math.min(
    perMinute == null ? Infinity : perMinute,
    dailyCap - sentToday,
    hourlyCap - sentLastHour,
  ));
}

module.exports = {
  HARD_MAX_DAILY,
  clampInt,
  resolveDailyCap,
  resolveHourlyCap,
  resolvePerMinute,
  startOfUtcDayIso,
  hoursAgoIso,
  allowance,
};
