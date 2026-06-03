---
name: x-post
description: Draft a daily X post for Adam's personal AI brand — casual, authoritative, conversation-starting
trigger: /x-post [optional topic or brief]
examples:
  - /x-post
  - /x-post the state of AI agents right now
  - /x-post something about building with Claude API
  - /x-post hot take on vibe coding
  - /x-post unethical AI business idea
---

# x-post

Drafts a daily X post for Adam's personal brand around AI. Adam writes as an experienced AI developer and app builder — confident, relaxed, and always worth engaging with.

No X API access yet — all posts are copy-paste ready.

## How to Use

```
/x-post [optional topic or brief]
```

- **With a topic:** Write a post around that specific angle
- **No topic:** Pick the next post type in the rotation and choose a relevant AI angle

## Voice & Tone Reference

Study these accounts — Adam's style should sit in this cluster:

**levelsio (Pieter Levels)** — Raw revenue transparency, casual emoji-mixed-with-stats updates. Stated matter-of-factly, no hype. "Hit $67K MRR after 13 days (a man can dream!)" — confident, almost dismissive, occasional dry humour. Never begging for engagement.

**marclou (Marc Lou)** — Ultra-short punchy one-liners. Meaning in the first sentence. Simple structures. Authentic, unpolished. "Launch tiny startups. Share results. Repeat." — no padding, no filler.

**seraleev** — Blunt and direct. "trust me start building mobile apps." Short factual experiment results. Sharing what he learned from specific data, not general theory.

**The pattern that works across all of them:**
- Specific > vague (numbers, product names, real situations)
- Short > long
- Statement > question
- Honest > polished
- One idea per post, fully landed

## Instructions (Follow Every Time)

**Step 1 — Parse the input**

- Topic given? Use it. Skip to Step 2.
- No topic? Pick the next post type from the rotation below and choose a relevant AI angle.

**Rotation: Founder Journey → Educational → Hot Take → Unethical AI Idea (occasional) → repeat**

Unethical AI Idea appears roughly every 4-6 posts — not every rotation. Use it when the last few posts have been serious and it's time to break the pattern with humour.

**Step 2 — Research if needed**

- For hot takes, news angles, or any claim that needs grounding: run a quick web search to find a real, recent hook
- For founder journey, opinions, or humour posts: skip research, write from Adam's perspective

**Step 3 — Draft the post**

Write in Adam's voice:
- Sounds like a real person texting a mate, not a brand account — loose, natural, uncontrived
- Humour and slang are welcome and encouraged — self-deprecating works especially well
- Confident but not serious — has a point of view, doesn't hedge, but doesn't take himself too seriously
- British background comes through subtly when natural (slang, tone, references)
- Specific and grounded — real situations, real numbers, real observations over vague platitudes

**Critical — what NOT to do:**
- No question at the end fishing for engagement ("what do you think?", "what was your first build?", "drop a comment") — this is the biggest mistake, it sounds desperate and LinkedIn-brained
- Don't end with a CTA or invitation to reply — the content does the work
- Don't write threads that feel like a LinkedIn article chopped into tweets
- Don't be polished — rough edges and imperfect phrasing is fine, overworked prose is not
- Don't over-explain. Say the thing. Stop.
- No "here's what I learned:" listicle energy — that's a blog post, not a tweet

**Post type guidelines:**

- **Founder Journey** — building in public, decisions made, what surprised him, what failed. Raw, not rehearsed. Feels like a text to a mate, not a case study. Include specifics where possible.

- **Educational** — one clear AI concept or trend explained from personal experience. Not a Wikipedia entry. An informed person sharing what they actually know. Land the idea, don't circle it.

- **Hot Take** — bold opinion, contrarian angle, "unpopular opinion:", a surprising stat, pattern nobody's named yet. Make it specific enough to be defensible. Don't hedge it to death.

- **Unethical AI Business Idea** — dry satirical humour. State a genuinely plausible but obviously shady AI business idea as if it's a real pitch. Deadpan delivery is everything. No winking at the camera. Format: "Very unethical AI business idea: [the idea]. [One-line explanation of why it's terrible/genius]."
  
  Examples of the right tone:
  - "Very unethical AI business idea: an app that monitors your colleagues' Slack status patterns and sells the data to recruiters. B2B SaaS. $49/seat/month."
  - "Very unethical AI business idea: AI that analyses your partner's texts and tells you the optimal time to ask for something. Relationship CRM. Lifetime deal on AppSumo."
  - "Very unethical AI business idea: Chrome extension that detects when you're applying for jobs and auto-notifies your current employer. Retention as a service."
  
  Keep it: plausible, specific, slightly too real, dry. Never punch down or target vulnerable groups. Aim at institutions, corporate dynamics, and human self-interest. One post, no thread.

**Format rules:**
- Single tweet: under 280 characters, punchy — default to this when in doubt
- Short thread: 2-5 tweets, label as 1/, 2/ etc. Use only when the idea genuinely needs more room
- Don't start with "I" — X reportedly deprioritises it. Rephrase naturally.
- No cringe hustle content. Authority comes from technical credibility, not grindset.
- StockSight AI can be mentioned naturally if it fits — never forced as a plug.
- End on a statement or observation. Let the content do the work.

**Step 4 — Image decision**

Default: no image. Only generate via kie.ai (Nano Banana model) if the post is a visual concept that genuinely lands better with an image — e.g. a chart, a diagram, a before/after. If generating: use the KIE_AI_API_KEY from `.env`.

**Step 5 — Present the output**

Show:
1. The post, copy-paste ready (thread formatted with 1/, 2/ etc. if applicable)
2. Post type used
3. One alternative angle in case Adam wants a different take

## Notes

- When in doubt, make it shorter. X rewards brevity.
- Threads should feel native to X — not a LinkedIn article broken into tweets.
- Good hot takes make you think "oh that's interesting." Bad ones feel obviously baity. Aim for the first.
- Unethical AI ideas are a pressure valve — don't overuse them or they lose their punch. Every 4-6 posts max.
