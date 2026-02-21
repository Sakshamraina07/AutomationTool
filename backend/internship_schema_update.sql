-- SQL Script to Alter existing Supabase Profiles Table for Internship Auto-aply
-- Copy and run this in your Supabase SQL Editor

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS degree text,
ADD COLUMN IF NOT EXISTS major text,
ADD COLUMN IF NOT EXISTS university text,
ADD COLUMN IF NOT EXISTS graduation_year text,
ADD COLUMN IF NOT EXISTS current_year text,
ADD COLUMN IF NOT EXISTS gpa text,
ADD COLUMN IF NOT EXISTS work_authorized boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS relocation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expected_stipend text,
ADD COLUMN IF NOT EXISTS availability_type text,
ADD COLUMN IF NOT EXISTS available_from text,
ADD COLUMN IF NOT EXISTS notice_period text,
ADD COLUMN IF NOT EXISTS skills text,
ADD COLUMN IF NOT EXISTS experience_summary text,
ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS resume_filename text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
