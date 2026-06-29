---
name: email-outreach
description: Run and manage the automated cold email outreach pipeline — pitches website design services to 4 target verticals using 4 demo portfolio sites
trigger: /email-outreach [optional: step to run, e.g. step1, step2, step3, step4, step5, or all]
examples:
  - /email-outreach
  - /email-outreach step1
  - /email-outreach step4
  - /email-outreach status
---

# email-outreach

Runs the automated cold email outreach pipeline at `projects/outreach/`. Finds businesses in 4 target verticals, scrapes their websites, generates personalised opening lines via Claude, sends via Brevo SMTP, and follows up automatically.

**The pitch:** Show them a relevant demo portfolio site and ask if they want something similar.

## The 4 Verticals

| Vertical | Demo Site | Target | Hook |
|----------|-----------|--------|------|
| `MAHARI` | mahari.adamthor.co.uk | Luxury real estate agencies, property developers, architecture studios | "Your website is selling £5M properties from a template" |
| `PELAGOS` | pelagos.adamthor.co.uk | Yacht charter companies, superyacht brokers, marina operators | "Most charter sites look like a booking engine" |
| `KOAN` | koan.adamthor.co.uk | Premium artisan/product brands, Japanese goods, craft food/spirits | "A Shopify template isn't a strategy" |
| `PATROL_PAWS` | patrolpaws.co.uk | Dog walkers, groomers, tradespeople, local service businesses | "A free Wix site erodes trust instead of building it" |

## Pipeline Overview

| Step | Script | What it does |
|------|--------|-------------|
| 1 | `step1-find-leads.js` | DuckDuckGo search per vertical → extract website emails → append to Google Sheet with VERTICAL column |
| 2 | `step2-enrich.js` | Scrape homepage + /about → extract services, about text, platform (Wix/Squarespace/Shopify/WordPress) |
| 3 | `step3-generate.js` | Claude API → personalised opening sentence about their product/business (not a pitch) |
| 4 | `step4-send.js` | Send E1 via Brevo SMTP → template selected by VERTICAL → BCC adamthor.outreach@gmail.com |
| 5 | `step5-followup.js` | IMAP reply detection → send E2 (day 4) and E3 (day 8) if no reply, templates per VERTICAL |

## Key Files

- `projects/outreach/src/` — all pipeline scripts
- `projects/outreach/src/templates.js` — 12 templates: E1/E2/E3 per vertical (4 × 3)
- `projects/outreach/src/config.js` — env vars, column indices (VERTICAL = col V), status constants
- `.github/workflows/outreach.yml` — daily cron at 8am UTC

## Google Sheet

Spreadsheet ID: `1Dk8ugKdurVhijfc3l6mzaLUlD5zDGxwYdI_Tjz-sGMU`
Tab: `Leads` (old coach/consultant leads are in `AI Leads — Old`)

Key columns: A-U same as before + **V = VERTICAL** (MAHARI / PELAGOS / KOAN / PATROL_PAWS)

Status flow: `New` → `Enriched` → `Draft Ready` → `Sent E1` → `Sent E2` → `Sent E3` → `Replied` / `Done`

## Email Configuration

- **From:** `adam@adamthor.co.uk`
- **BCC:** `adamthor.outreach@gmail.com` (every outgoing email)
- **Sending:** Brevo SMTP (`smtp-relay.brevo.com:587`)
- **Reply detection:** IMAP → `adamthor.outreach@gmail.com`
- **Delays:** 2-4 min randomised between E1 sends; 2s between follow-ups
- **Follow-up timing:** E2 after 4 days, E3 after 4 more days, Done after 4 more

## Email Templates Summary

Each vertical has E1/E2/E3. All share the same structure:
- **E1:** [Personalised opener] + demo site URL + soft question ("does your current site do this justice?")
- **E2:** Re: [same subject] — different angle, no pitch pressure
- **E3:** Re: [same subject] — graceful exit

Email filter differences:
- **MAHARI / PELAGOS / KOAN:** Allow `info@`, `hello@`, `contact@` — these businesses are managed and those inboxes are real
- **PATROL_PAWS:** Strict filter (personal emails only) — sole traders publish their direct email

## Writing Craft

**Opener rules (step 3 prompt):**
- One specific, genuine observation about their product, business, or market position
- Makes clear you actually looked — not "I noticed you sell X"
- No compliments, no pitch, no mention of websites or design
- Standalone sentence ending with a full stop
- Never use em-dashes (— or -) — AI giveaway

**Email body rules:**
- Write like a peer, not a vendor
- Lead with their world, not yours
- One CTA, low friction ("Does that sound familiar?" / "Worth a conversation?")
- No feature dumps, no pitch decks compressed into paragraphs
- Read it aloud — if it sounds like marketing copy, rewrite it

**What to avoid:**
- "I hope this email finds you well" / "I came across your website"
- Generic compliments ("love your work", "impressive portfolio")
- HTML, images, or multiple links
- Em-dashes (— or -)
- Asking for a 30-minute call on first touch
- "Just checking in" follow-ups

## Lead Quality

- **MAHARI/PELAGOS/KOAN:** Targeting business websites — company emails OK, no mass directories
- **PATROL_PAWS:** Sole traders — personal emails preferred
- Skip: LinkedIn, Instagram, Facebook, Twitter, booking platforms, aggregator directories
- Max 35 new leads per run (`MAX_NEW_LEADS` in config.js)

## How to Use

**Run the full pipeline:**
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

**Test with a lead cap:**
```
cd projects/outreach && MAX_NEW_LEADS=3 npm run step1
```

**Check status:** Google Sheet → `Leads` tab → column R (Status)

## GitHub Actions

Runs daily via `.github/workflows/outreach.yml`. Manual trigger available via GitHub Actions UI.

Required secrets: `ANTHROPIC_API_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS`

## Common Issues

**Emails not delivering** — `adamthor.co.uk` must be authenticated in Brevo (SPF/DKIM via Ionos DNS). Without this, sends are silently rejected.

**SMTP auth fails** — `SMTP_USER` must be your Brevo SMTP key (`ab8e9d001@smtp-brevo.com`), not `adam@adamthor.co.uk`

**Opener returns SKIP** — step 3 fetches `/about` and retries once; if still SKIP, email sends template-only (no opener paragraph)

**Wrong vertical on old leads** — if a lead in the sheet has no VERTICAL value, template falls back to PATROL_PAWS. Add the VERTICAL manually in column V to fix.

**Google Sheet tab not found** — tab must be named exactly `Leads`. Old tab is `AI Leads — Old`.
