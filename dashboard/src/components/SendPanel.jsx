import { useEffect, useState } from 'react';
import { api } from '../api';

// Phase 2: send outreach through the Gmail API. Shows the current sending
// posture (caps + how many are left today, §10), lets you queue a template to
// all eligible contacts or send a first batch immediately.
export default function SendPanel({ templates, onChange }) {
  const [status, setStatus] = useState(null);
  const [templateId, setTemplateId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadStatus = async () => {
    try { setStatus(await api.sendStatus()); }
    catch (err) { setMsg({ type: 'err', text: err.message }); }
  };

  useEffect(() => { loadStatus(); }, []);

  async function run(mode) {
    if (!templateId) return setMsg({ type: 'warn', text: 'Pick a template first.' });
    setBusy(true); setMsg(null);
    try {
      const r = await api.send({ template_id: templateId, mode });
      const parts = [`Queued ${r.queued}`];
      if (r.sent) parts.push(`sent ${r.sent} now`);
      if (r.failed) parts.push(`${r.failed} failed`);
      if (r.skipped_existing) parts.push(`${r.skipped_existing} already sent`);
      if (r.skipped_opted_out) parts.push(`${r.skipped_opted_out} opted out`);
      setMsg({ type: r.failed ? 'warn' : 'ok', text: parts.join(' · ') + '.' });
      await loadStatus();
      onChange && (await onChange());
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (status && !status.configured) {
    return (
      <div className="card">
        <h2>Gmail sending</h2>
        <div className="note warn">
          Gmail sending isn’t configured. Set <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>,{' '}
          <code>GOOGLE_REFRESH_TOKEN</code> and <code>GMAIL_SENDER_ADDRESS</code> in <code>backend/.env</code>,
          then restart the backend. Until then you can still log sends manually on the Import &amp; Send tab.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Gmail sending <span className="hint">automated · Phase 2</span></h2>

      {status && (
        <div className="kpis" style={{ marginBottom: 16 }}>
          <div className="kpi">
            <div className="val">{status.remaining_today}</div>
            <div className="label">Left today</div>
            <div className="sub">cap {status.daily_cap} · sent {status.sent_today}</div>
          </div>
          <div className="kpi">
            <div className="val" style={{ color: 'var(--accent)' }}>{status.sent_last_hour}</div>
            <div className="label">Sent this hour</div>
            <div className="sub">hourly cap {status.hourly_cap}</div>
          </div>
          <div className="kpi">
            <div className="val" style={{ color: 'var(--violet)' }}>{status.queued}</div>
            <div className="label">Queued</div>
            <div className="sub">drip ~2/min</div>
          </div>
          <div className="kpi">
            <div className="val" style={{ fontSize: 15 }}>{status.sender || '—'}</div>
            <div className="label">From</div>
            <div className="sub">hard max {status.hard_max_daily}/day</div>
          </div>
        </div>
      )}

      <label>Template to send</label>
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        <option value="">Select template…</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name} · {t.variant_label}</option>
        ))}
      </select>

      <div className="row-actions" style={{ marginTop: 14 }}>
        <button className="btn primary" disabled={busy} onClick={() => run('queue')}>
          Queue to all eligible
        </button>
        <button className="btn" disabled={busy} onClick={() => run('now')}>
          Send first batch now
        </button>
        <button className="btn ghost btn-sm" disabled={busy} onClick={loadStatus}>Refresh</button>
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        Sends only to contacts with no prior email for this template, skipping opt-outs.
        “Queue” hands off to the background drip (caps enforced); “Send now” delivers the
        first batch immediately up to today’s remaining allowance.
      </p>

      {msg && <div className={`note ${msg.type}`}>{msg.text}</div>}
    </div>
  );
}
