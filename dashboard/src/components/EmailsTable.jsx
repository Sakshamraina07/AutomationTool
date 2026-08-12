const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—');

// Sent emails with status badge + row actions (Mark Interview / Rejected).
export default function EmailsTable({ emails, onStatus, busyId }) {
  if (!emails.length) {
    return (
      <div className="empty">
        No emails tracked yet — import contacts and log a send to begin.
      </div>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Recipient</th><th>Company</th><th>Template</th>
          <th>Status</th><th>Sent</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {emails.map((e) => {
          const contact = e.contacts || {};
          const template = e.email_templates || {};
          const busy = busyId === e.id;
          return (
            <tr key={e.id}>
              <td>
                <div>{contact.recruiter_name || contact.recruiter_email || '—'}</div>
                <div style={{ color: 'var(--text-faint)', fontSize: 11 }}>{contact.recruiter_email}</div>
              </td>
              <td>{contact.company || '—'}</td>
              <td>
                {template.name || '—'}
                {template.variant_label && <span style={{ color: 'var(--text-faint)' }}> · {template.variant_label}</span>}
              </td>
              <td><span className={`badge ${e.status}`}>{e.status}</span></td>
              <td>{fmtDate(e.sent_at)}</td>
              <td>
                <div className="row-actions">
                  <button className="btn btn-sm" disabled={busy || e.status === 'INTERVIEW'}
                    onClick={() => onStatus(e.id, { status: 'INTERVIEW' })}>Interview</button>
                  <button className="btn btn-sm ghost" disabled={busy}
                    onClick={() => onStatus(e.id, { status: 'REPLIED', sentiment: 'rejection' })}>Rejected</button>
                  {e.status !== 'REPLIED' && e.status !== 'INTERVIEW' && (
                    <button className="btn btn-sm ghost" disabled={busy}
                      onClick={() => onStatus(e.id, { status: 'REPLIED', sentiment: 'positive' })}>Replied</button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
