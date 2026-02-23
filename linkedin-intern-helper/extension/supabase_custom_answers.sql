-- Run this in Supabase SQL Editor to create the custom_answers table for Tier 2/3 memory.
-- Enables: Check custom_answers → if not found → AI generate → save for next time.

CREATE TABLE IF NOT EXISTS custom_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  question_hash TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_hash)
);

CREATE INDEX IF NOT EXISTS idx_custom_answers_user_hash ON custom_answers(user_id, question_hash);

-- RLS (optional): allow read/write for authenticated user only
-- ALTER TABLE custom_answers ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage own answers" ON custom_answers
--   FOR ALL USING (auth.uid()::text = user_id);
