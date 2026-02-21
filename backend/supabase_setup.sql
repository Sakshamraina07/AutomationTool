-- Supabase Database Initialization Script for LinkedIn Intern Helper
-- Run these commands in your Supabase SQL Editor

-- 1) Create or Ensure Profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text,
  first_name text,
  last_name text,
  phone text,
  city text,
  linkedin_url text,
  portfolio_url text,
  experience text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2) Create or Ensure Applications table exists
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text,
  job_title text,
  company text,
  job_url text,
  status text DEFAULT 'APPLIED'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3) Disable Row Level Security (RLS) if you are strictly using Service Role Key
-- or if this is a private project MVP.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;
