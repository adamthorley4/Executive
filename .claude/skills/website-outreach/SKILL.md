# Website Outreach Skill

## Purpose

Automated cold email pipeline targeting real estate companies in Dubai that have no website or a poor/outdated one. Offers Adam's website creation service (adamthor.co.uk).

Runs separately from the coach email outreach pipeline. Uses the same Google Sheet (tab: `Website Leads`), same SMTP/IMAP setup, and same GitHub Actions infrastructure.

## Trigger

`/website-outreach [step1|step2|step3|step4|step5|all|status]`

## Pipeline Overview

| Step | Script | What it does |
|------|--------|--------------|
| 1 | `step1-find-leads.js` | Firecrawl search for Dubai real estate agencies, writes URLs to sheet |
| 2 | `step2-score-websites.js` | Visits each URL, scores website quality, finds email |
| 3 | `step3-generate.js` | Claude generates a personalised opener referencing their specific website situation |
| 4 | `step4-send.js` | Sends Email 1 via Brevo SMTP |
| 5 | `step5-followup.js` | IMAP reply detection, sends E2 (day 4) and E3 (day 8) |

## Project Location

`projects/website-outreach/`

## Google Sheet

Same sheet as email outreach. Tab: `Website leads`.

Columns: `Company | Website | Email | Phone | Source | Web Status | Web Notes | Opener | E1 Date | E2 Date | E3 Date | Reply | Reply Date | Status | Notes | E1 Msg ID`

### Status flow

`New` → `Scored` → `Draft Ready` → `Sent E1` → `Sent E2` → `Sent E3` → `Replied` / `Done`

`Skipped` — no email found, website is good, or page unscrapable.

### Web Status values

- `None` — no website at all (social media only, or unscrapable)
- `Free Builder` — Wix, Weebly, Carrd, GoDaddy free, Squarespace subdomain
- `Outdated` — copyright year before 2021
- `Poor Quality` — no mobile viewport, under construction, minimal content
- `Good` — passes all checks (row marked Skipped — no email sent)

## Targets

Real estate companies in Dubai. Small/boutique agencies and solo operators.

**Skip list (large agencies):** Betterhomes, Allsopp & Allsopp, Haus & Haus, Coldwell Banker, Provident Estate, Driven Properties, FAM Properties, Knight Frank, Savills, JLL, CBRE, Engel & Völkers, RE/MAX, Century 21, Better Homes, White & Co, Emaar, DAMAC, Nakheel, Hamptons, Sotheby's, Christie's.

## Email Sequence

**E1 — Subject: `You don't exist online`**

```
Hi there,

[personalised opener if available]

Research shows businesses without a website lose around a third of potential clients at the Google search step. Someone hears about them, searches the name, finds nothing, and calls a competitor instead.

In the competitive world of Dubai real estate, where almost every client does their homework before picking up the phone, that gap compounds fast.

I build clean, professional websites for boutique agencies. Quick turnarounds, no ongoing fees, you own everything.

Worth a quick conversation?

Adam
```

**E2 (day 4) — Subject: `Re: You don't exist online`**
```
Hi there,

Just wanted to make sure this didn't get buried.

Adam
```

**E3 (day 8) — Subject: `Re: You don't exist online`**
```
Hi there,

No worries if the timing isn't right. Happy to pick this up whenever it makes sense.

Adam
```

## GitHub Actions

`.github/workflows/website-outreach.yml` — runs daily at 6am UTC (10am Dubai). Manual trigger available via `workflow_dispatch`.

## Running Steps Manually

```bash
cd projects/website-outreach
npm install
npm run step1   # find leads
npm run step2   # score websites
npm run step3   # generate openers
npm run step4   # send Email 1
npm run step5   # reply detection + follow-ups
npm start       # run all steps
```

## Setup Checklist (one-time)

1. In the existing Google Sheet, create a tab named `Website Leads`
2. Add header row: `Company | Website | Email | Phone | Source | Web Status | Web Notes | Opener | E1 Date | E2 Date | E3 Date | Reply | Reply Date | Status | Notes | E1 Msg ID`
3. All required env vars (`GOOGLE_SHEETS_SPREADSHEET_ID`, SMTP, IMAP, etc.) are already in `.env` from the existing outreach pipeline — no new vars needed
4. Run `npm run step1` locally first to verify searches return real estate results
5. Run `npm run step2` on a small batch before committing to a full daily run
