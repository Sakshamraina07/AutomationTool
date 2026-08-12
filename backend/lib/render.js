// render.js — {{placeholder}} rendering for subjects/bodies (PRD §6).
// Pure and reused by Phase 1 manual logging and Phase 2 Gmail send.

function firstNameOf(contact) {
  const name = (contact && (contact.recruiter_name || contact.name)) || '';
  return name.trim().split(/\s+/)[0] || '';
}

// Replaces {{first_name}}, {{recruiter_name}}, {{company}}, {{role_title}}.
// Unknown placeholders are left blank rather than leaking "{{x}}" into email.
function renderTemplate(str, contact) {
  if (!str) return '';
  const c = contact || {};
  const map = {
    first_name: firstNameOf(c),
    recruiter_name: c.recruiter_name || c.name || '',
    company: c.company || '',
    role_title: c.role_title || c.role || '',
  };
  return str.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (whole, key) => {
    const k = String(key).toLowerCase();
    return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : '';
  });
}

module.exports = { renderTemplate, firstNameOf };
