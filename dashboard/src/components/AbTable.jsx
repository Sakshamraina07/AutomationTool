const pct = (n) => `${(n * 100).toFixed(1)}%`;

// Per-variant sent / open% / reply% / interview%, plus a plain-language
// confidence note from the backend two-proportion z-test (§8).
export default function AbTable({ variants, abTest }) {
  if (!variants.length) {
    return <div className="empty">No template variants yet.</div>;
  }
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Variant</th><th>Sent</th><th>Deliv.</th>
            <th>Open %</th><th>Reply %</th><th>Interview %</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.variant_label}>
              <td><strong>{v.variant_label}</strong></td>
              <td>{v.sent}</td>
              <td>{v.delivered}</td>
              <td style={{ color: 'var(--violet)' }}>{pct(v.open_rate)}</td>
              <td style={{ color: 'var(--green)' }}>{pct(v.reply_rate)}</td>
              <td style={{ color: 'var(--accent)' }}>{pct(v.interview_rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {abTest && (
        <div className={`note ${abTest.significant ? 'ok' : 'info'}`}>
          <strong>A vs B:</strong>{' '}
          {abTest.note === 'not enough data yet'
            ? 'Not enough data yet — need ≥30 delivered per variant for a confident call.'
            : `${abTest.note}${abTest.pValue != null ? ` (p = ${abTest.pValue.toFixed(3)})` : ''}.`}
        </div>
      )}
    </div>
  );
}
