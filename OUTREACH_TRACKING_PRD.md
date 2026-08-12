# AutoReach — Outreach Analytics & Funnel Tracking (Gmail API)

**Product Requirements Document (PRD) — build spec for Claude Code**

Version 2.0 · Owner: Saksham · Status: Ready to implement
Sending mechanism: **User's own Gmail account via the Gmail API** (confirmed)

---

## 1. Background & Problem

AutoReach helps the user apply to internships (LinkedIn Easy-Apply extension) and send personalized recruiter cold-emails with an attached resume, **sent from the user's own Gmail account using the Gmail API**. The user has already sent hundreds of personalized cold emails successfully.

**The problem:** nothing is measured. We do not know how many emails were sent, delivered, opened, replied to, or converted into interview calls. Without this funnel we cannot tell which templates work, cannot improve reply rates, and have no data to show (portfolio / future research paper).

**This PRD adds a full outreach funnel on top of the existing Gmail send flow:**

```
Contacts → Sent → Delivered → Opened → Replied → Interview → Outcome
```

…plus a dashboard and an A/B testing hook so different email templates can be compared fairly.

**Why Gmail makes this clean:** every reply lands in the same Gmail **thread** as the original message, so replies can be detected automatically and matched back to the exact email that was sent — no guesswork.

## 2. Goals & Non-Goals

### Goals
1. Record every outbound cold email with the template/variant used, timestamp, recipient, subject, body snapshot, Gmail `messageId` and `threadId`.
2. Track each funnel stage per email: delivered, opened, replied, interview, final outcome.
3. Automatically detect **replies** via the Gmail API (thread-based) and classify them (interview / positive / rejection / auto-reply / neutral) using the local Ollama model, with a keyword fallback.
4. Provide a **dashboard**: funnel counts, conversion rates, per-template A/B comparison, sends-vs-replies timeline.
5. Support clean **data export** (CSV/JSON) for analysis or a research paper.

### Non-Goals (out of scope for v1)
- No mass unsolicited spamming; personal job-search volume only.
- No multi-user SaaS. Single user (`user_id = 'default-user'`, matching current backend).
- No paid deliverability infra (dedicated IP, warmup pools).
- Open-tracking is best-effort only (see §7) and must never be presented as exact truth.

## 3. Users & Primary Use Cases
- **The user (job seeker).** Wants "of the 300 emails I sent, how many replied and how many became interviews," and "which subject line / template got more replies."
- **UC1:** Import a list of recruiter contacts and send a chosen template to each from Gmail.
- **UC2:** Open the dashboard and see the live funnel + per-template reply rates.
- **UC3:** When a recruiter replies, the system detects it, classifies it, and the user confirms "this is an interview."
- **UC4:** Export all data as CSV.

## 4. Existing System (integrate with, do not rewrite)
- **Backend:** Node + Fastify (`backend/server.js`), Supabase (Postgres) as the database, Supabase Storage for resumes. CORS currently `origin: '*'` (tighten — see §11).
- **Frontend:** React (Vite). Reuse the existing React app; add an "Outreach" route/page.
- **Email:** **Gmail API**, sending from the user's own Google account. A send flow already exists — this PRD **instruments** it (records each send + injects tracking) rather than replacing it.
- **Local LLM:** Ollama running `llama3` at `http://localhost:11434` (already used in `ollamaClient.js`). Reuse for reply classification.
- **Identity model:** single user, `user_id = 'default-user'`.

### Gmail authentication
- Use **OAuth 2.0** with scopes `gmail.send`, `gmail.readonly` (or `gmail.modify` if labeling read threads).
- Store `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a long-lived `GOOGLE_REFRESH_TOKEN` in server-side `.env` only. Never expose tokens to the extension/frontend.
- Backend refreshes the access token as needed via `googleapis`.

## 5. Data Model (Supabase / Postgres)

New migration `backend/migrations/outreach_tracking.sql`. UUID PKs, `timestamptz`.

```sql
-- Recruiter / recipient list
create table if not exists contacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null default 'default-user',
  recruiter_name text,
  recruiter_email text not null,
  company       text,
  role_title    text,
  source        text,          -- 'linkedin', 'csv', 'manual'
  notes         text,
  opted_out     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, recruiter_email)
);

-- Reusable email templates + A/B variants
create table if not exists email_templates (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null default 'default-user',
  name           text not null,             -- 'Backend SWE outreach'
  variant_label  text not null default 'A', -- 'A','B','C' for A/B tests
  subject_template text not null,           -- may contain {{first_name}}, {{company}}
  body_template  text not null,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- One row per email actually sent
create table if not exists outreach_emails (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null default 'default-user',
  contact_id     uuid references contacts(id),
  template_id    uuid references email_templates(id),
  variant_label  text,                       -- denormalized for fast stats
  tracking_id    uuid not null default gen_random_uuid(), -- used in the open-pixel URL
  gmail_message_id text,                      -- Gmail message id of the sent mail
  gmail_thread_id  text,                      -- Gmail threadId (key for reply matching)
  rfc_message_id   text,                      -- RFC 5322 Message-ID header
  subject        text,
  body_snapshot  text,                        -- exact body sent (audit / paper)
  status         text not null default 'QUEUED',
                 -- QUEUED, SENT, DELIVERED, BOUNCED, OPENED, REPLIED, INTERVIEW, CLOSED
  sent_at        timestamptz,
  delivered_at   timestamptz,
  first_opened_at timestamptz,
  open_count     int not null default 0,
  replied_at     timestamptz,
  reply_sentiment text,                       -- interview|positive|rejection|auto_reply|neutral
  interview_at   timestamptz,
  outcome        text,                        -- offer|rejected|ghosted|in_progress
  created_at     timestamptz not null default now()
);

-- Append-only event log (source of truth; replayable metrics)
create table if not exists email_events (
  id                uuid primary key default gen_random_uuid(),
  outreach_email_id uuid references outreach_emails(id),
  event_type        text not null, -- SENT|DELIVERED|OPEN|REPLY|BOUNCE|INTERVIEW|OUTCOME
  metadata          jsonb,
  occurred_at       timestamptz not null default now()
);

-- Stored replies (classification + paper data)
create table if not exists email_replies (
  id                uuid primary key default gen_random_uuid(),
  outreach_email_id uuid references outreach_emails(id),
  gmail_message_id  text,
  from_email        text,
  snippet           text,
  full_body         text,
  classification    text,          -- interview|positive|rejection|auto_reply|neutral
  classified_by     text,          -- 'ollama'|'keyword'|'user'
  received_at       timestamptz not null default now()
);

create index if not exists idx_emails_user on outreach_emails(user_id);
create index if not exists idx_emails_status on outreach_emails(status);
create index if not exists idx_emails_tracking on outreach_emails(tracking_id);
create index if not exists idx_emails_thread on outreach_emails(gmail_thread_id);
create index if not exists idx_events_email on email_events(outreach_email_id);
```

**Design note:** `outreach_emails` holds current state for fast reads; `email_events` is the append-only history so metrics can be recomputed and audited later (precision matters if the data is used in a paper).

## 6. Backend API (Fastify)

New file `backend/routes/outreach.js`, registered in `server.js`. All routes assume `user_id = 'default-user'` unless provided.

| Method & path | Purpose |
|---|---|
| `POST /outreach/contacts/import` | Bulk-import contacts from CSV/JSON (`recruiter_name, recruiter_email, company, role_title`). Dedupe on email. |
| `GET /outreach/contacts` | List contacts with their latest email status. |
| `POST /outreach/templates` | Create/update a template variant. |
| `GET /outreach/templates` | List templates. |
| `POST /outreach/send` | Send a template to one/many contacts **via Gmail API**. Renders `{{placeholders}}`, attaches resume, injects the open pixel, sends, then stores `gmail_message_id` + `gmail_thread_id` + `rfc_message_id`, writes the `outreach_emails` row and `SENT` event. Skips opted-out/duplicate. Applies rate limiting (§10). |
| `GET /track/open/:trackingId` | **Open pixel.** Returns a 1×1 transparent GIF, logs an `OPEN` event, sets `first_opened_at`/increments `open_count`. Unauthenticated, fast, always returns the GIF. |
| `POST /outreach/emails/:id/status` | Manual status change ("Mark Interview" / "Rejected"). Writes event + updates row. |
| `GET /outreach/emails` | List sent emails with filters (status, template, date range). |
| `GET /outreach/stats` | Aggregated funnel + per-variant reply/interview rates (§8). |
| `GET /outreach/export.csv` | Export all emails + events as CSV. |
| *(internal)* `pollGmailReplies()` | Scheduled job (node-cron, every 5–10 min) that finds new replies and records them. |

### Sending via Gmail API (`POST /outreach/send`)
1. For each selected contact: skip if `opted_out` or if a `SENT` row already exists for this `contact_id + template_id` (idempotency).
2. Render subject/body from the template (`{{first_name}}`, `{{company}}`, `{{role_title}}`).
3. Build a MIME message (`raw`, base64url) with:
   - `From` = user's Gmail, `To` = recruiter, truthful `Subject`.
   - HTML body + the open pixel `<img src="{APP_BASE_URL}/track/open/{tracking_id}" width="1" height="1">` appended.
   - Resume attachment (pull the file already stored in Supabase Storage).
   - A generated `Message-ID` header (store as `rfc_message_id`).
4. Call `gmail.users.messages.send`. Capture the returned `id` (→ `gmail_message_id`) and `threadId` (→ `gmail_thread_id`).
5. Insert `outreach_emails` (status `SENT`) + a `SENT` event.
6. Respect rate limits between sends (§10).

### Reply detection job (`pollGmailReplies()`) — the important part
1. Query Gmail: `gmail.users.messages.list` with `q = "newer_than:14d -from:me"` (optionally scope by label).
2. For each returned message, get its `threadId` and headers (`From`, `In-Reply-To`, `References`, `Message-ID`).
3. **Match** to an `outreach_emails` row by `gmail_thread_id` (primary) — or, as a fallback, if our `rfc_message_id` appears in the reply's `References`/`In-Reply-To`.
4. On a new match (no existing `REPLY` event for that Gmail message): insert `email_replies`, insert a `REPLY` event, set `replied_at`, update `status = 'REPLIED'`.
5. Classify the reply (below) and store `reply_sentiment`.
6. Track processed Gmail message ids to avoid double-counting across polls.

### Reply classification (reuse Ollama)
- Send the reply body to `llama3` with a strict prompt: *"Classify this recruiter reply as exactly one of: interview, positive, rejection, auto_reply, neutral. Answer with one word only."*
- **Keyword fallback** if Ollama is unavailable: "schedule / call / interview / availability / calendly" → `interview`; "unfortunately / not moving forward / other candidates / not a fit" → `rejection`; "out of office / vacation / automatic reply" → `auto_reply`; else `neutral`.
- Classification is a **suggestion**. The user confirms interviews manually (source of truth for conversions).

## 7. Open & Delivery Tracking (be honest about limits)
- **Open pixel:** embedded at the end of the HTML body (see §6).
- **Caveats (show in the UI as a tooltip; document for any paper):**
  - Gmail proxies/caches images, so an open shows Google's IP, not the recruiter's — you can count *an* open, not geolocate it.
  - Apple Mail Privacy Protection and some clients pre-fetch images → inflated opens (false positives).
  - Image blocking → missed opens (false negatives).
  - **Treat open-rate as a soft, directional metric. Reply-rate and interview-rate are the trustworthy numbers.**
- **Delivery / bounce (Gmail-native):** after sending, a failed delivery produces a bounce message from `mailer-daemon@googlemail.com` / "Mail Delivery Subsystem" in the mailbox. The reply-poller should also detect these and mark the matching email `BOUNCED` (via thread or the original recipient in the bounce body). If no bounce within 24h, treat as delivered.

## 8. Metrics (define precisely — makes it useful and paper-grade)

Compute in `GET /outreach/stats`, grouped overall and **per template variant**:

- **Sent** = `outreach_emails` with a `SENT` event.
- **Delivered** = Sent − Bounced.
- **Open rate** = distinct emails with ≥1 `OPEN` ÷ Delivered. *(soft metric)*
- **Reply rate** = emails with `replied_at` ÷ Delivered.
- **Positive-reply rate** = replies classified `interview` or `positive` ÷ Delivered.
- **Interview rate (conversion)** = emails with `interview_at` ÷ Delivered.
- **Median response time** = median(`replied_at − sent_at`).

For A/B tests, show reply rate per variant **with sample sizes** and a plain-language confidence note (two-proportion z-test). If either group n < 30, label "not enough data yet." Example UI copy: *"A: 12% (n=150) vs B: 7% (n=150) — likely a real difference."*

## 9. Frontend Dashboard (React)

Add an **"Outreach"** page/route in the existing React app. Use `recharts` for charts.

1. **Funnel bar** — Sent → Delivered → Opened → Replied → Interview, counts + % drop per stage.
2. **A/B comparison table** — per variant: sent, open %, reply %, interview %, + confidence note.
3. **Timeline chart** — emails sent vs replies received per day.
4. **Emails table** — recipient, company, template, status badge, sent date, last event; row actions: **Mark Interview**, **Mark Rejected**, **View reply**.
5. **Import & Send panel** — upload contacts CSV, pick a template variant, send (confirmation + rate-limit notice).

Match existing styling. Empty state: "No emails tracked yet — import contacts to begin."

## 10. Sending Safeguards (personal Gmail limits)
- **Daily cap:** a normal Gmail account allows ~500 sends/day (Google Workspace ~2,000). Stay well under — default a configurable soft cap (e.g., 80/day) and never exceed 400/day.
- **Rate limit:** ~30–50 emails/hour with a randomized 30–90s gap between sends. Reuse the human-delay approach in `delayController.js` if convenient.
- **Idempotency:** never double-send; a `contact_id + template_id` with an existing `SENT` row is skipped unless explicitly re-queued.
- **Backoff:** on Gmail `429`/`5xx`, exponential backoff and resume; surface a clear error in the UI.
- **Resume attachment:** reuse the resume already stored in Supabase Storage.

## 11. Privacy, Ethics & Compliance (required — also strengthens a paper)
- Include a real **opt-out line** ("reply STOP and I won't email again") and honor it: set `contacts.opted_out = true` and never send to opted-out contacts.
- Send from a real identity with a truthful subject — no deceptive headers (also protects Gmail sender reputation).
- Recruiter emails are personal data: store securely; provide a "delete contact + all their data" action.
- Follow GDPR/CAN-SPAM principles for outreach: truthful identity, easy opt-out, no large-scale harvesting.
- **Security hardening while here:** replace CORS `origin: '*'` with an allow-list; keep the Supabase **service-role key** and **Google OAuth tokens** server-side only (never in the extension/frontend); the open-pixel endpoint must always return the GIF and never leak data.

## 12. Phased Delivery Plan (build in this order)

**Phase 0 — Schema & plumbing.** Create tables/migration (§5). Register `outreach` route skeleton + Gmail OAuth client init. *Acceptance:* migration runs on Supabase; empty endpoints return 200; server obtains a Gmail access token from the refresh token.

**Phase 1 — Manual tracking + dashboard (highest value, lowest risk).** Import contacts, log sends, open pixel, manual status buttons, `GET /outreach/stats`, dashboard. *Acceptance:* user imports 10 contacts, records sends/opens/replies/interviews, and sees a correct funnel + A/B table.

**Phase 2 — Automated Gmail sending.** Implement `POST /outreach/send` end-to-end (render → pixel → attach resume → Gmail send → store ids → `SENT` event), with rate limiting + idempotency. *Acceptance:* sending to 3 test addresses creates correct rows/events and the emails arrive personalized with the resume attached.

**Phase 3 — Automated reply + bounce detection.** Implement `pollGmailReplies()` (thread match) + Ollama classification + keyword fallback + bounce detection. *Acceptance:* replying from a test inbox flips the email to `REPLIED` within one poll cycle and is classified; a bounce marks the email `BOUNCED`; user can confirm "Interview."

**Phase 4 — Export + polish.** CSV/JSON export, empty states, metric-caveat tooltips, security tightening (§11). *Acceptance:* `export.csv` opens cleanly in Excel; open-rate tooltip present; CORS restricted.

## 13. Acceptance Criteria (definition of done)
- Every sent email produces exactly one `outreach_emails` row (with `gmail_message_id` + `gmail_thread_id`) and one `SENT` event.
- Opens, replies, and interviews appear in the dashboard within one refresh/poll cycle.
- Replies are matched to the correct original email via Gmail thread (verified on a hand-checked sample of 10).
- No email is ever sent twice to the same contact for the same template.
- Opted-out contacts are never emailed.
- All secrets (Supabase service-role key, Google tokens) stay server-side; CORS restricted; open pixel never errors.

## 14. Test Plan
- **Unit:** placeholder rendering; metric calculations (feed known events → assert rates); Gmail thread/header matching; classification keyword fallback.
- **Integration:** send to 3 personal test addresses; confirm arrival + attachment; pixel fire on open; reply detection + classification; bounce handling; status transitions.
- **Manual QA:** import a 20-row CSV; run a small A/B (template A vs B, 10 each); verify dashboard math by hand.

## 15. Research-Paper Hook (wired in by design)
Every send stores its **template variant** and **body snapshot**; every reply is timestamped and classified. This doubles as an experiment harness for a clean study:

> *"Do AI-personalized cold emails get more recruiter replies than generic ones?"*

Randomly split contacts between template A (generic) and template B (AI-personalized), send, then export and report reply-rate and interview-rate with sample sizes. That table is a publishable result. Keep raw data (`email_events`, `email_replies`) so the analysis is reproducible.

---

### Libraries
`googleapis` (Gmail send + read) · `csv-parse` or `papaparse` (import) · `node-cron` (reply polling) · `@supabase/supabase-js` (already present) · `recharts` (charts).

### Env vars to add
`APP_BASE_URL` (open-pixel base URL) · `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_REFRESH_TOKEN` · `GMAIL_SENDER_ADDRESS` · `OLLAMA_URL` (default `http://localhost:11434`) · `OUTREACH_DAILY_CAP` (default 80).
