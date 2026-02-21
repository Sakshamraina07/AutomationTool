-- internship_schema_update.sql
-- Run this in the Supabase SQL Editor to perfectly align everything!

-- 1. Base Auth & User Information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_url text;

-- 2. Educational & Experience Information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS degree text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS major text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gpa text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_summary text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_domain text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]'::jsonb;

-- 3. Temporal Tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS graduation_year text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_year text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notice_period text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_from text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. Specifically requested INTEGERS (Cast safely)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS internship_count integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expected_stipend integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stipend integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year_of_study integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability_weeks integer;

-- 5. Specifically requested BOOLEANS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS authorized_to_work boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS open_to_relocation boolean DEFAULT false;

-- 6. Supabase Storage Links
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_filename text;

-- 7. Add constraints & defaults safely
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
