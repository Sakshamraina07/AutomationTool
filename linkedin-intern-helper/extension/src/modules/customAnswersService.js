// customAnswersService.js — Smart memory layer for Tier 2/3 autofill
// getCustomAnswer / saveCustomAnswer for custom_answers table

import { supabase, USER_ID } from '../api.js';

export async function getCustomAnswer(questionHash) {
  try {
    const { data, error } = await supabase
      .from('custom_answers')
      .select('answer')
      .eq('user_id', USER_ID)
      .eq('question_hash', questionHash)
      .maybeSingle();
    if (error) {
      console.warn('[InternHelper] custom_answers get error:', error.message);
      return null;
    }
    return data?.answer ?? null;
  } catch (e) {
    console.warn('[InternHelper] getCustomAnswer failed:', e);
    return null;
  }
}

export async function saveCustomAnswer(questionHash, questionText, answer) {
  try {
    const { error } = await supabase
      .from('custom_answers')
      .upsert(
        {
          user_id: USER_ID,
          question_hash: questionHash,
          question_text: questionText,
          answer: answer,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,question_hash' }
      );
    if (error) {
      console.warn('[InternHelper] custom_answers save error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[InternHelper] saveCustomAnswer failed:', e);
    return false;
  }
}
