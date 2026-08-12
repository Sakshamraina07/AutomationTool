import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import KpiRow from './components/KpiRow.jsx';
import FunnelBar from './components/FunnelBar.jsx';
import AbTable from './components/AbTable.jsx';
import TimelineChart from './components/TimelineChart.jsx';
import EmailsTable from './components/EmailsTable.jsx';
import ImportSendPanel from './components/ImportSendPanel.jsx';
import SendPanel from './components/SendPanel.jsx';

const EMPTY_STATS = {
  overall: {
    sent: 0, delivered: 0, bounced: 0, opened: 0, replied: 0,
    positive: 0, interview: 0, open_rate: 0, reply_rate: 0,
    positive_reply_rate: 0, interview_rate: 0, median_response_hours: null,
  },
  variants: [],
  abTest: null,
};

// Sent → Delivered → Opened → Replied → Interview (§9 funnel).
function toFunnel(o) {
  return [
    { stage: 'Sent', count: o.sent },
    { stage: 'Delivered', count: o.delivered },
    { stage: 'Opened', count: o.opened },
    { stage: 'Replied', count: o.replied },
    { stage: 'Interview', count: o.interview },
  ];
}

export default function App() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [timeline, setTimeline] = useState([]);
  const [emails, setEmails] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('dashboard');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, t, e, c, tpl] = await Promise.all([
        api.stats(), api.timeline(), api.emails(), api.contacts(), api.templates(),
      ]);
      setStats(s || EMPTY_STATS);
      setTimeline(t?.days || t || []);
      setEmails(e?.emails || e || []);
      setContacts(c?.contacts || c || []);
      setTemplates(tpl?.templates || tpl || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onStatus(id, payload) {
    setBusyId(id);
    try {
      await api.setStatus(id, payload);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const o = stats.overall;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Auto<span className="brand">Reach</span></h1>
          <p className="subtitle">Outreach analytics &amp; funnel tracking</p>
        </div>
        <button className="btn btn-sm ghost" onClick={load} disabled={loading}>Refresh</button>
      </header>

      <div className="tabs">
        <button className={`tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={`tab ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')}>Import &amp; Send</button>
      </div>

      {error && <div className="note err">{error}</div>}
      {loading && <div className="note info">Loading…</div>}

      {tab === 'dashboard' && (
        <div className="stack">
          <KpiRow overall={o} />

          <div className="grid grid-2">
            <div className="card">
              <h2>Funnel</h2>
              <FunnelBar funnel={toFunnel(o)} />
            </div>
            <div className="card">
              <h2>Activity over time</h2>
              <TimelineChart data={timeline} />
            </div>
          </div>

          <div className="card">
            <h2>A/B comparison</h2>
            <AbTable variants={stats.variants} abTest={stats.abTest} />
          </div>

          <div className="card">
            <h2>Emails</h2>
            <EmailsTable emails={emails} onStatus={onStatus} busyId={busyId} />
          </div>
        </div>
      )}

      {tab === 'manage' && (
        <div className="stack">
          <SendPanel templates={templates} onChange={load} />
          <ImportSendPanel contacts={contacts} templates={templates} onChange={load} />
        </div>
      )}
    </div>
  );
}
