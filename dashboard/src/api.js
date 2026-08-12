// Thin API client for the AutoReach backend.
// In dev, Vite proxies /outreach and /track to http://localhost:3000.
// In prod, set VITE_API_BASE to the deployed backend origin.
const BASE = import.meta.env.VITE_API_BASE || '';

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && (data.error || data.detail)) || res.statusText;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  stats: () => req('/outreach/stats'),
  timeline: () => req('/outreach/timeline'),
  emails: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('/outreach/emails' + (q ? '?' + q : ''));
  },
  contacts: () => req('/outreach/contacts'),
  templates: () => req('/outreach/templates'),
  importContacts: (payload) =>
    req('/outreach/contacts/import', { method: 'POST', body: JSON.stringify(payload) }),
  createTemplate: (payload) =>
    req('/outreach/templates', { method: 'POST', body: JSON.stringify(payload) }),
  logSend: (contact_id, template_id) =>
    req('/outreach/emails/log', { method: 'POST', body: JSON.stringify({ contact_id, template_id }) }),
  send: (payload) =>
    req('/outreach/send', { method: 'POST', body: JSON.stringify(payload) }),
  sendStatus: () => req('/outreach/send/status'),
  setStatus: (id, payload) =>
    req(`/outreach/emails/${id}/status`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteContact: (id) =>
    req(`/outreach/contacts/${id}`, { method: 'DELETE' }),
  optOut: (id) =>
    req(`/outreach/contacts/${id}/opt-out`, { method: 'POST' }),
};
