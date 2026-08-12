-- outreach_tracking.sql
-- AutoReach — Outreach Analytics & Funnel Tracking (PRD v2.0, §5)
-- Run this in the Supabase SQL Editor. Safe to re-run (idempotent).
--
-- Design note: `outreach_emails` holds current state for fast reads;
-- `email_events` is the append-only history so metrics can be recomputed
-- and audited later (precision matters if the data is used in a paper).

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Recruiter / recipient list
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null default 'default-user',
  recruiter_name  text,
  recruiter_email text not null,
  company         text,
  role_title      text,
  source          text,          -- 'linkedin', 'csv', 'manual'
  notes           text,
  opted_out       boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (user_id, recruiter_email)
);

-- ---------------------------------------------------------------------------
-- Reusable email templates + A/B variants
-- ---------------------------------------------------------------------------
create table if not exists public.email_templates (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null default 'default-user',
  name             text not null,             -- 'Backend SWE outreach'
  variant_label    text not null default 'A', -- 'A','B','C' for A/B tests
  subject_template text not null,             -- may contain {{first_name}}, {{company}}
  body_template    text not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- One row per email actually sent (current state, fast reads)
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_emails (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null default 'default-user',
  contact_id       uuid references public.contacts(id),
  template_id      uuid references public.email_templates(id),
  variant_label    text,                        -- denormalized for fast stats
  tracking_id      uuid not null default gen_random_uuid(), -- open-pixel URL id
  gmail_message_id text,                         -- Gmail message id of the sent mail
  gmail_thread_id  text,                         -- Gmail threadId (key for reply matching)
  rfc_message_id   text,                         -- RFC 5322 Message-ID header
  subject          text,
  body_snapshot    text,                         -- exact body sent (audit / paper)
  status           text not null default 'QUEUED',
                   -- QUEUED, SENT, DELIVERED, BOUNCED, OPENED, REPLIED, INTERVIEW, CLOSED
  sent_at          timestamptz,
  delivered_at     timestamptz,
  first_opened_at  timestamptz,
  open_count       int not null default 0,
  replied_at       timestamptz,
  reply_sentiment  text,                         -- interview|positive|rejection|auto_reply|neutral
  interview_at     timestamptz,
  outcome          text,                         -- offer|rejected|ghosted|in_progress
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Append-only event log (source of truth; replayable metrics)
-- ---------------------------------------------------------------------------
create table if not exists public.email_events (
  id                uuid primary key default gen_random_uuid(),
  outreach_email_id uuid references public.outreach_emails(id),
  event_type        text not null, -- SENT|DELIVERED|OPEN|REPLY|BOUNCE|INTERVIEW|OUTCOME
  metadata          jsonb,
  occurred_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Stored replies (classification + paper data)
-- ---------------------------------------------------------------------------
create table if not exists public.email_replies (
  id                uuid primary key default gen_random_uuid(),
  outreach_email_id uuid references public.outreach_emails(id),
  gmail_message_id  text,
  from_email        text,
  snippet           text,
  full_body         text,
  classification    text,          -- interview|positive|rejection|auto_reply|neutral
  classified_by     text,          -- 'ollama'|'keyword'|'user'
  received_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_emails_user     on public.outreach_emails(user_id);
create index if not exists idx_emails_status   on public.outreach_emails(status);
create index if not exists idx_emails_tracking on public.outreach_emails(tracking_id);
create index if not exists idx_emails_thread   on public.outreach_emails(gmail_thread_id);
create index if not exists idx_events_email    on public.email_events(outreach_email_id);
create index if not exists idx_replies_email   on public.email_replies(outreach_email_id);
create index if not exists idx_replies_gmail   on public.email_replies(gmail_message_id);

-- ---------------------------------------------------------------------------
-- RLS: disabled — this project uses the Supabase service-role key server-side
-- only (never exposed to the extension/frontend), matching supabase_setup.sql.
-- ---------------------------------------------------------------------------
alter table public.contacts        disable row level security;
alter table public.email_templates disable row level security;
alter table public.outreach_emails disable row level security;
alter table public.email_events    disable row level security;
alter table public.email_replies   disable row level security;
