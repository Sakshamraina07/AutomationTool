const pct = (n) => `${(n * 100).toFixed(1)}%`;

const OPEN_CAVEAT =
  'Open-rate is a soft, directional metric. Image proxying (Gmail), pre-fetching ' +
  '(Apple Mail Privacy) and image-blocking all distort it. Trust reply-rate and ' +
  'interview-rate as the real numbers.';

function Tip({ text }) {
  return <span className="tooltip-icon" title={text}>?</span>;
}

export default function KpiRow({ overall }) {
  const o = overall;
  const mrh = o.median_response_hours;
  const median =
    mrh == null
      ? '—'
      : mrh < 48
        ? `${mrh.toFixed(1)}h`
        : `${(mrh / 24).toFixed(1)}d`;

  return (
    <div className="kpis">
      <div className="kpi">
        <div className="val">{o.sent}</div>
        <div className="label">Sent</div>
        <div className="sub">{o.delivered} delivered · {o.bounced} bounced</div>
      </div>
      <div className="kpi">
        <div className="val" style={{ color: 'var(--violet)' }}>{pct(o.open_rate)}</div>
        <div className="label">Open rate <Tip text={OPEN_CAVEAT} /></div>
        <div className="sub">{o.opened} opened</div>
      </div>
      <div className="kpi">
        <div className="val" style={{ color: 'var(--green)' }}>{pct(o.reply_rate)}</div>
        <div className="label">Reply rate</div>
        <div className="sub">{o.replied} replied</div>
      </div>
      <div className="kpi">
        <div className="val" style={{ color: 'var(--green)' }}>{pct(o.positive_reply_rate)}</div>
        <div className="label">Positive reply</div>
        <div className="sub">interview + positive</div>
      </div>
      <div className="kpi">
        <div className="val" style={{ color: 'var(--accent)' }}>{pct(o.interview_rate)}</div>
        <div className="label">Interview rate</div>
        <div className="sub">median reply {median}</div>
      </div>
    </div>
  );
}
