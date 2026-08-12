import { useState } from 'react';
import { api } from '../api';

// Import contacts (CSV/paste), create a template variant, and log a send
// (Phase 1 manual path; Phase 2 swaps in the Gmail API send).
export default function ImportSendPanel({ contacts, templates, onChange }) {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const [csv, setCsv] = useState('');
  const [tpl, setTpl] = useState({ name: '', variant_label: 'A', subject_template: '', body_template: '' });
  const [send, setSend] = useState({ contact_id: '', template_id: '' });

  const flash = (type, text) => setMsg({ type, text });

  async function run(fn) {
    setBusy(true); setMsg(null);
    try { await fn(); onChange && (await onChange()); }
    catch (err) { flash('err', err.message); }
    finally { setBusy(false); }
  }

  const importCsv = () => run(async () => {
    if (!csv.trim()) return flash('warn', 'Paste CSV rows first.');
    const r = await api.importContacts({ csv });
    setCsv('');
    flash('ok', `Imported ${r.inserted} contact(s), skipped ${r.skipped}.`);
  });

  const saveTpl = () => run(async () => {
    if (!tpl.name || !tpl.subject_template || !tpl.body_template) {
      return flash('warn', 'Name, subject and body are required.');
    }
    await api.createTemplate(tpl);
    setTpl({ name: '', variant_label: 'A', subject_template: '', body_template: '' });
    flash('ok', 'Template saved.');
  });

  const logSend = () => run(async () => {
    if (!send.contact_id || !send.template_id) return flash('warn', 'Pick a contact and a template.');
    const r = await api.logSend(send.contact_id, send.template_id);
    flash(r.skipped ? 'info' : 'ok', r.skipped ? 'Already logged for this contact + template.' : 'Send logged.');
  });

  return (
    <div className="stack">
      <div className="card">
        <h2>Import contacts <span className="hint">CSV with headers: recruiter_name, recruiter_email, company, role_title</span></h2>
        <textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)}
          placeholder={'recruiter_name,recruiter_email,company,role_title\nDana Lee,dana@acme.com,Acme,Backend Intern'} />
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" disabled={busy} onClick={importCsv}>Import contacts</button>
        </div>
      </div>

      <div className="card">
        <h2>Create template variant</h2>
        <div className="field-row">
          <div>
            <label>Name</label>
            <input value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} placeholder="Backend SWE outreach" />
          </div>
          <div style={{ maxWidth: 90 }}>
            <label>Variant</label>
            <input value={tpl.variant_label} onChange={(e) => setTpl({ ...tpl, variant_label: e.target.value })} />
          </div>
        </div>
        <label>Subject <span className="hint">{'supports {{first_name}}, {{company}}, {{role_title}}'}</span></label>
        <input value={tpl.subject_template} onChange={(e) => setTpl({ ...tpl, subject_template: e.target.value })}
          placeholder="Quick question about {{company}}'s internships" />
        <label>Body</label>
        <textarea rows={4} value={tpl.body_template} onChange={(e) => setTpl({ ...tpl, body_template: e.target.value })}
          placeholder={'Hi {{first_name}},\n\nI came across {{company}} and...'} />
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" disabled={busy} onClick={saveTpl}>Save template</button>
        </div>
      </div>

      <div className="card">
        <h2>Log a send <span className="hint">Phase 1 manual tracking · Phase 2 sends via Gmail</span></h2>
        <div className="field-row">
          <div>
            <label>Contact</label>
            <select value={send.contact_id} onChange={(e) => setSend({ ...send, contact_id: e.target.value })}>
              <option value="">Select contact…</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.recruiter_name || c.recruiter_email} · {c.company || '—'}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Template</label>
            <select value={send.template_id} onChange={(e) => setSend({ ...send, template_id: e.target.value })}>
              <option value="">Select template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} · {t.variant_label}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" disabled={busy} onClick={logSend}>Log send</button>
        </div>
      </div>

      {msg && <div className={`note ${msg.type}`}>{msg.text}</div>}
    </div>
  );
}
