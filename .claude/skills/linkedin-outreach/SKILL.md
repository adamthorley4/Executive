---
name: linkedin-outreach
description: Run and manage the automated LinkedIn outreach pipeline targeting coaches and consultants in the UK and US
trigger: /linkedin-outreach [optional: step to run, e.g. step1, step2, step3, or all]
examples:
  - /linkedin-outreach
  - /linkedin-outreach step1
  - /linkedin-outreach step3
  - /linkedin-outreach status
---

# linkedin-outreach

Runs the automated LinkedIn outreach pipeline at `projects/linkedin-outreach/`. Finds coaches and consultants on LinkedIn in the UK and US, searches for their personal websites, scrapes for context, generates a personalised 300-char connection note and a follow-up DM via Claude. Adam sends manually from LinkedIn and updates the sheet status.

## Pipeline Overview

| Step | Script | What it does |
|------|--------|-------------|
| 1 | `step1-find.js` | DuckDuckGo search → find LinkedIn profiles of coaches/consultants in the UK and US → append to Google Sheet |
| 2 | `step2-enrich.js` | Search for personal website → scrape homepage + /about → extract summary, services, about text |
| 3 | `step3-generate.js` | Claude API → 300-char connection note + follow-up DM → sheet status: Draft Ready |

**Adam's manual steps (outside the pipeline):**
- Opens the LinkedIn sheet, reads connection notes under "Draft Ready"
- Sends connection request on LinkedIn, updates Status to "Note Sent"
- When they accept, updates Status to "Connected", sends the follow-up DM
- Updates Status to "DM Sent" → "Replied" → "Done" as the conversation progresses

## Key Files

- `projects/linkedin-outreach/src/` — all pipeline scripts
- `projects/linkedin-outreach/src/config.js` — env vars, column indices, status constants
- `.github/workflows/linkedin-outreach.yml` — Mon-Fri cron at 8am UTC (9am UK BST)

## Google Sheet

Spreadsheet ID: same as email outreach (`GOOGLE_SHEETS_SPREADSHEET_ID`)
Tab: `LinkedIn Leads`

| Column | Field | Who updates |
|--------|-------|-------------|
| A | Name | Auto |
| B | Headline | Auto |
| C | LinkedIn URL | Auto |
| D | Company | Auto |
| E | Personal Website | Auto |
| F | Source (search query) | Auto |
| G | Summary | Auto |
| H | Services | Auto |
| I | About | Auto |
| J | Connection Note (300 chars) | Auto |
| K | Follow-up DM | Auto |
| L | Note Sent Date | Adam |
| M | Connected Date | Adam |
| N | DM Sent Date | Adam |
| O | Replied (Y/N) | Adam |
| P | Reply Date | Adam |
| Q | Status | Auto + Adam |
| R | Notes | Adam |

Status flow: `New` → `Enriched` → `Draft Ready` → `Note Sent` → `Connected` → `DM Sent` → `Replied` → `Done`

## Writing Rules (connection notes and DMs)

**Positioning:**
- Adam finds the friction inside a coach/consultant's business — the manual, repetitive work eating their time — and fixes it so they can focus on revenue-generating work
- Never say "I build AI automations" — that's a feature, not a value prop
- The hint about what Adam does should feel incidental, not like the point of the message

**Connection note rules:**
- Strictly under 300 characters
- Reference something specific about their niche, client type, or approach — show you actually read their profile
- One natural line about what Adam does (finding operational friction, freeing up time)
- End with a short, genuine question specific to their work that invites a reply
- Never end with "would love to have you in my network", "wanted to connect", or any template closer — dead giveaways
- No em-dashes (— or -)
- No exclamation marks
- No flattery ("Loved your content", "Amazing work")

**Follow-up DM rules (sent after connection accepted):**
- Under 120 words
- Acknowledge the connection naturally — not "Thanks for connecting!" (too generic)
- Reference something specific about their work that sparks a genuine question
- End with one specific question relevant to them — not "do you find AI useful?" or anything generic
- No pitch in this message
- No em-dashes (— or -)
- Short paragraphs, human voice

## Lead Quality Notes

- Targets individual coaches and consultants — not company pages or training schools
- Skips LinkedIn company/school/job URLs automatically
- Skips leads with no parseable name (can't personalise without a name)
- MAX_NEW_LEADS defaults to 10 per run (override with env var)

## How to Use

**Run the full pipeline (all steps):**
```
cd projects/linkedin-outreach && npm start
```

**Run a single step:**
```
cd projects/linkedin-outreach && npm run step1   # find profiles
cd projects/linkedin-outreach && npm run step2   # enrich
cd projects/linkedin-outreach && npm run step3   # generate messages
```

**Test with fewer leads:**
```
cd projects/linkedin-outreach && MAX_NEW_LEADS=3 npm run step1
```

**Check status:** Open the Google Sheet → LinkedIn tab → column Q (Status) shows where every lead is.

## GitHub Actions

Runs Mon-Fri at 8am UTC (9am UK BST) via `.github/workflows/linkedin-outreach.yml`. Manual trigger available via GitHub Actions UI.

All env vars are shared with the email outreach pipeline — no new GitHub Secrets needed if email outreach is already configured:
- `ANTHROPIC_API_KEY`
- `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## First-Time Setup

Before running, create the `LinkedIn` tab in the Google Sheet manually:
1. Open the spreadsheet at `GOOGLE_SHEETS_SPREADSHEET_ID`
2. Add a new sheet tab named exactly `LinkedIn Leads`
3. Add header row: Name | Headline | LinkedIn URL | Company | Personal Website | Source | Summary | Services | About | Connection Note | Follow-up DM | Note Sent | Connected | DM Sent | Replied | Reply Date | Status | Notes

## Common Issues

**Name not found in step 1** — LinkedIn title format varies. If `name` is blank, the lead is skipped (can't personalise without it). This is intentional.

**No personal website found in step 2** — Lead is still enriched using headline only. Connection note will be less specific but still generated.

**Connection note over 300 chars** — Code enforces the limit by hard-truncating with "..." as a fallback. If this happens frequently, the model prompt may need tuning.

**Search** — DuckDuckGo HTML scraping (no API key, free). A 2-second delay between queries avoids rate limiting. Page scraping uses plain fetch + cheerio — no credits, no limits.
