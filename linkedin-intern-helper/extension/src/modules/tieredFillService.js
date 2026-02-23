// tieredFillService.js — Tier 1 (DB) → Tier 2 (custom_answers + AI) → Tier 3 (ask user)
// Used by background script to resolve field values for autofill.

import { getCustomAnswer, saveCustomAnswer } from './customAnswersService.js';

const PROFILE_LABEL_MAP = [
  { keys: ['phone', 'mobile', 'contact', 'tel'], profileKeys: ['phone', 'phone_number'] },
  { keys: ['email'], profileKeys: ['email'] },
  { keys: ['first name'], profileKeys: ['first_name', 'full_name'] },
  { keys: ['last name'], profileKeys: ['last_name'] },
  { keys: ['city', 'location'], profileKeys: ['city', 'location'] },
  { keys: ['linkedin'], profileKeys: ['linkedin_url'] },
  { keys: ['experience', 'years'], profileKeys: ['years_of_experience', 'experience', 'experience_summary'] },
  { keys: ['salary', 'stipend', 'ctc'], profileKeys: ['expected_stipend', 'stipend'] },
  { keys: ['degree', 'education'], profileKeys: ['degree'] },
  { keys: ['major'], profileKeys: ['major'] },
  { keys: ['university', 'school', 'college'], profileKeys: ['university'] },
  { keys: ['graduation'], profileKeys: ['graduation_year'] },
  { keys: ['gpa'], profileKeys: ['gpa'] },
  { keys: ['skills'], profileKeys: ['skills'] },
  { keys: ['portfolio', 'website', 'url'], profileKeys: ['portfolio_url'] },
  { keys: ['cover letter', 'summary', 'about'], profileKeys: ['experience_summary', 'experience'] },
];

function simpleHash(str) {
  let h = 0;
  const s = String(str).trim().toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return 'q_' + Math.abs(h).toString(36);
}

function tier1StrictMapping(profile, labelText, inputType) {
  if (!profile || !labelText) return null;
  const lower = labelText.toLowerCase().trim();
  for (const row of PROFILE_LABEL_MAP) {
    for (const k of row.keys) {
      if (lower.includes(k)) {
        for (const pk of row.profileKeys) {
          const v = profile[pk];
          if (v != null && String(v).trim() !== '') return String(v).trim();
        }
        break;
      }
    }
  }
  if (inputType === 'tel' || lower.includes('phone') || lower.includes('mobile')) {
    const phone = profile.phone || profile.phone_number;
    if (phone && String(phone).trim()) return String(phone).trim();
    return null;
  }
  if (inputType === 'email' || lower.includes('email')) {
    const v = profile.email;
    return (v && String(v).trim()) ? String(v).trim() : null;
  }
  return null;
}

function shouldAskUser(labelText, inputType, options) {
  const lower = (labelText || '').toLowerCase();
  if (lower.includes('legal') || lower.includes('authorize') || lower.includes('agree') || lower.includes('declare')) return true;
  if (inputType === 'number' && (lower.includes('salary') || lower.includes('years') || lower.includes('experience'))) return true;
  if (options && options.length > 3 && !lower.includes('country') && !lower.includes('state')) return true;
  return false;
}

// Placeholder: replace with your AI endpoint (e.g. Supabase Edge Function or external API).
async function askAI(payload) {
  try {
    // Optional: call your backend. Example:
    // const res = await fetch('https://your-api.com/ai/answer', { method: 'POST', body: JSON.stringify(payload) });
    // const data = await res.json(); return data.answer ?? null;
    const q = (payload.question || '').trim();
    if (!q) return null;
    const job = payload.job_title || '';
    const company = payload.company || '';
    const profile = payload.user_profile || {};
    const summary = profile.experience_summary || profile.experience || '';
    const short = q.slice(0, 100);
    if (short.includes('why') && (company || job)) {
      return `I am interested in the ${job} role at ${company} because it aligns with my experience and career goals. ${summary ? 'My background includes: ' + String(summary).slice(0, 150) + '.' : ''}`.trim();
    }
    if (short.includes('how did you hear') || short.includes('referral')) return 'LinkedIn';
    if (short.includes('available') || short.includes('start date')) return profile.available_from || profile.notice_period || 'Immediately';
    return null;
  } catch (e) {
    console.warn('[InternHelper] askAI failed:', e);
    return null;
  }
}

/**
 * Resolve value for a field: Tier 1 (profile) → Tier 2 (custom_answers then AI) → Tier 3 (ask user).
 * @returns { Promise<{ value?: string, source: 'profile'|'custom'|'ai', askUser?: boolean, questionText?: string, questionHash?: string }> }
 */
export async function getFieldValue(profile, fieldInfo, jobContext) {
  const { labelText, placeholder, inputType, options } = fieldInfo;
  const questionText = (labelText || placeholder || '').trim() || 'Field';
  const questionHash = simpleHash(questionText);

  const t1 = tier1StrictMapping(profile, questionText, inputType);
  if (t1) return { value: t1, source: 'profile' };

  const custom = await getCustomAnswer(questionHash);
  if (custom) return { value: custom, source: 'custom' };

  if (shouldAskUser(questionText, inputType, options)) {
    return { askUser: true, questionText, questionHash, source: 'user' };
  }

  const aiPayload = {
    question: questionText,
    input_type: inputType,
    job_title: jobContext?.jobTitle || '',
    company: jobContext?.companyName || '',
    user_profile: profile || {},
  };
  const aiAnswer = await askAI(aiPayload);
  if (aiAnswer) {
    await saveCustomAnswer(questionHash, questionText, aiAnswer);
    return { value: aiAnswer, source: 'ai' };
  }

  return { askUser: true, questionText, questionHash, source: 'user' };
}

export { simpleHash };
