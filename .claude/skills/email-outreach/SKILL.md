---
name: email-outreach
description: Run and manage the automated cold email outreach pipeline targeting coaches and consultants in the UK and US
trigger: /email-outreach [optional: step to run, e.g. step1, step2, step3, step4, step5, or all]
examples:
  - /email-outreach
  - /email-outreach step1
  - /email-outreach step4
  - /email-outreach status
---

# email-outreach

Runs the automated cold email outreach pipeline at `projects/outreach/`. Finds coaches and consultants in the UK and US, scrapes their websites, generates personalised emails via Claude, sends via Brevo SMTP, and follows up automatically.

## Pipeline Overview

| Step | Script | What it does |
|------|--------|-------------|
| 1 | `step1-find-leads.js` | Firecrawl search → extract real coach/consultant websites → append to Google Sheet |
| 2 | `step2-enrich.js` | Scrape each lead's homepage + /about page → extract services, pain points, name, blog |
| 3 | `step3-generate.js` | Claude API → personalised opening line referencing something specific from their site |
| 4 | `step4-send.js` | Send Email 1 via Brevo SMTP → update sheet status → BCC adamthor.outreach@gmail.com |
| 5 | `step5-followup.js` | IMAP reply detection → send E2 (day 4) and E3 (day 8) if no reply |

## Key Files

- `projects/outreach/src/` — all pipeline scripts
- `projects/outreach/src/templates.js` — E1, E2, E3 email copy
- `projects/outreach/src/config.js` — env vars, column indices, status constants
- `.github/workflows/outreach.yml` — daily cron at 5am UTC (9am Dubai)

## Google Sheet

Spreadsheet ID: `1Dk8ugKdurVhijfc3l6mzaLUlD5zDGxwYdI_Tjz-sGMU`
Tab: `AI Leads`

Status flow: `New` → `Enriched` → `Draft Ready` → `Sent E1` → `Sent E2` → `Sent E3` → `Replied` / `Done`

## Email Configuration

- **From:** `adam@adamthor.co.uk` (ImprovMX alias — not a real mailbox, just the sender address prospects see)
- **BCC:** `adamthor.outreach@gmail.com` (every outgoing email — for quality monitoring)
- **Sending:** Brevo SMTP (`smtp-relay.brevo.com:587`)
- **Reply detection:** IMAP → `adamthor.outreach@gmail.com`
- **Follow-up timing:** E2 after 4 days no reply, E3 after 4 more days, Done after 4 more

## Email Templates (current copy)

**E1 — "The admin trap"**
- Personalised opener (specific to their site) as its own paragraph
- Body: operational friction angle — not selling software, not forcing AI, just finding friction and fixing it
- Closing: "Have you ever taken a step back to look at where friction exists inside your business?"

**E2 — Day 4 bump**
- Social proof angle: a real result from a similar client (business coach, 10hrs/week admin cut to 90 mins)

**E3 — Day 8 graceful exit**
- Short: "No worries if the timing isn't right. Happy to pick this up whenever it makes sense."

## Writing Craft

### Before Writing

Understand the situation before drafting:

- **Who are you writing to?** Role, business type, why them specifically
- **What do you want?** The outcome — a reply, a conversation starter
- **What's the value?** The specific friction or problem you solve for people like them
- **What's your proof?** A result, case study, or credibility signal
- **Any research signals?** Something specific from their site, content, or business context

Work with whatever you have. If there's a strong signal and a clear value prop, that's enough to write. Don't block on missing inputs — use what you have.

### Writing Principles

**Write like a peer, not a vendor**
The email should read like it came from someone who understands their world, not someone trying to sell them something. Use contractions. Read it aloud. If it sounds like marketing copy, rewrite it.

**Every sentence must earn its place**
Cold email is ruthlessly short. If a sentence doesn't move the reader toward replying, cut it. The best cold emails feel like they could have been shorter, not longer.

**Personalization must connect to the problem**
If you remove the personalised opening and the email still makes sense, the personalization isn't working. The observation should naturally lead into why you're reaching out.

**Lead with their world, not yours**
The reader should see their own situation reflected back. "You/your" should dominate over "I/we." Don't open with who you are or what you do.

**One ask, low friction**
Interest-based CTAs ("Worth exploring?" / "Would this be useful?") beat meeting requests. One CTA per email. Make it easy to say yes with a one-line reply.

### Voice & Tone

Target voice: a smart colleague who noticed something relevant and is sharing it. Conversational but not sloppy. Confident but not pushy.

Calibrate to the audience:
- **Business owner / solo operator:** Peer-level, practical, slightly informal
- **Corporate / enterprise:** More measured, slightly more formal, still human
- **Technical audience:** Precise, no fluff, respect their intelligence

What it should NOT sound like:
- A template with fields swapped in
- A pitch deck compressed into paragraph form
- An AI-generated email — avoid the telltale patterns: "I hope this email finds you well," "I came across your profile," "leverage," "synergy," "best-in-class," "I wanted to reach out"

### Structure

No single right structure. Choose a shape that fits the situation, or write freeform if the email flows naturally.

Common shapes that work:

- **Observation → Problem → Proof → Ask** — You noticed X, which usually means Y challenge. We helped Z with that. Interested?
- **Question → Value → Ask** — Struggling with X? We do Y. [Someone similar] saw [result]. Worth a look?
- **Trigger → Insight → Ask** — [Something specific from their site]. That usually creates Y challenge. Curious?
- **Story → Bridge → Ask** — [Similar client] had [problem]. They solved it this way. Relevant to you?

### Subject Lines

Short, boring, internal-looking. The subject line's only job is to get the email opened, not to sell.

- 2-4 words, lowercase, no punctuation tricks
- Should look like it came from a colleague ("reply rates", "ops friction", "Q3 pipeline")
- No product pitches, no urgency, no emojis, no prospect's first name in the subject

### Follow-Up Sequences

Each follow-up should add something new — a different angle, a fresh proof point, a useful observation. "Just checking in" gives the reader no reason to respond.

- 3 total emails (E1, E2, E3), increasing gaps between them
- Each email should stand alone — they may not have read the previous ones
- E3 is a graceful exit — honor it, don't chase further

### Quality Check

Before sending, gut-check:

- Does it sound like a human wrote it? (Read it aloud)
- Would YOU reply to this if you received it?
- Does every sentence serve the reader, not the sender?
- Is the personalization connected to the problem?
- Is there one clear, low-friction ask?

### What to Avoid

- Opening with "I hope this email finds you well" or "My name is X and I work at Y"
- Jargon: "synergy," "leverage," "circle back," "best-in-class," "leading provider"
- Feature dumps — one proof point beats ten features
- HTML, images, or multiple links in a cold email
- Fake "Re:" or "Fwd:" subject lines
- Identical templates with only the first name swapped
- Asking for a 30-minute call in first touch
- "Just checking in" follow-ups
- Em-dashes (— or -) — dead giveaway of AI writing
- Generic openers: "I loved your website", "Great content", "I came across your profile"
- Lists of services or "we help businesses scale" language

## Lead Quality Rules

- Target: individual coaches and consultants with their own websites
- Skip: directories, aggregator sites, coaching schools, LinkedIn, Reddit, YouTube
- Skip emails: `enroll@`, `info@`, `hello@`, `team@`, `contact@`, `admin@`, `support@`
- Require personal signals on the page: "I help", "work with me", "my clients", "book a call"
- Max 35 new leads per run (`MAX_NEW_LEADS` in config.js)

## How to Use

**Run the full pipeline (all steps):**
```
cd projects/outreach && node src/index.js
```

**Run a single step:**
```
cd projects/outreach && npm run step1   # find leads
cd projects/outreach && npm run step2   # enrich
cd projects/outreach && npm run step3   # generate openers
cd projects/outreach && npm run step4   # send E1
cd projects/outreach && npm run step5   # follow-ups + reply detection
```

**Run step 1 with a lead cap override (for testing):**
```
cd projects/outreach && MAX_NEW_LEADS=1 npm run step1
```

**Check pipeline status:** Open the Google Sheet — column R (Status) shows where every lead is.

## GitHub Actions

The pipeline runs automatically daily via `.github/workflows/outreach.yml`. Manual trigger available via GitHub Actions UI (workflow_dispatch).

All env vars must be added as GitHub Secrets before the cron works:
- `ANTHROPIC_API_KEY`
- `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS`

## Name Extraction

Names are extracted via `src/name-utils.js` — a shared module used by both step1 and step2. It uses conservative regex patterns plus a large blocklist of words that look capitalised but aren't first names (e.g. "Information", "Finisher", "Coach", "Services"). If no reliable name is found, the email greets with "Hi there" — safer than guessing wrong.

Do not duplicate name extraction logic in step1 or step2. Always import `extractName` from `name-utils.js`.

## Common Issues

**Emails not delivering (Brevo says "accepted" but nothing arrives)** — the sender domain `adamthor.co.uk` must be authenticated in Brevo. Go to Brevo > Settings > Senders & IPs > Domains, add `adamthor.co.uk`, and add the SPF/DKIM records to DNS (managed via Ionos). Without this, Brevo queues and silently rejects every email.

**SMTP auth fails** — `SMTP_USER` must be your Brevo SMTP key (e.g. `ab8e9d001@smtp-brevo.com`), not `adam@adamthor.co.uk`

**Opener returns SKIP** — step 3 automatically fetches `/about` and retries once; if still SKIP, email sends without opener (template only)

**Name shows as blank / "Hi there"** — name not found on page; this is correct behaviour, safer than guessing

**Search** — done via DuckDuckGo HTML scraping (no API key, completely free). A 2-second delay between queries avoids rate limiting. If DuckDuckGo starts blocking, check the step 1 logs for failed searches.

**Page scraping** — done via plain fetch + cheerio (no API, no credits). JS-heavy sites won't render but most coach sites are WordPress/Squarespace and scrape fine.
