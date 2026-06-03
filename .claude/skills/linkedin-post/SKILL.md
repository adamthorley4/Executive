---
name: linkedin-post
description: Draft LinkedIn posts for StockSight AI with optional AI-generated images via kie.ai (Nano Banana model). Takes a topic from Adam, writes a post in StockSight AI's voice, and generates an image if it would add value.
trigger: /linkedin-post <topic or brief>
examples:
  - /linkedin-post why most traders are always late to market moves
  - /linkedin-post the difference between news and signals
  - /linkedin-post launch announcement for StockSight AI waitlist
  - /linkedin-post why geopolitical events move markets faster than fundamentals
---

# LinkedIn Post Skill

Draft LinkedIn posts for StockSight AI, with optional image generation via kie.ai.

## How to Use

```
/linkedin-post <topic or brief>
```

---

## Instructions (Follow Every Time)

### Step 1 — Understand the brief

Parse what Adam wants. Could be:
- **Thought leadership** — a POV on markets, trading, or signals
- **Educational** — explaining a concept (what is a signal? how do macro events move prices?)
- **Brand building** — StockSight AI positioning, what it does, why it exists
- **Announcement** — waitlist, launch, product update
- **Topical / reactive** — responding to a current market event or news story

If the brief is vague, write the most natural interpretation — don't ask for clarification unless it's genuinely ambiguous.

### Step 2 — Write the LinkedIn post

**Voice:** StockSight AI — intelligent, confident, minimal. No hype. No "get rich quick." Feels like it was written by a sharp, knowledgeable person, not a bot.

**Format rules:**
- First line is the hook — this is what shows before "see more". Make it a single punchy sentence that earns the click.
- Short paragraphs. 1-3 sentences max. White space is your friend on LinkedIn.
- No em-dashes. Use commas, colons, or restructure.
- Don't start with "I". Reorder the sentence.
- Hashtags at the end: 3-5 max. Mix specific (#StockSightAI #MarketSignals) and broad (#Trading #FinTech).
- Length: 150-400 words is the sweet spot. Don't pad it.
- End with a question, a provocation, or a CTA — not a generic "follow for more".

**Positioning themes to reinforce where natural:**
- Markets move on signals, not headlines
- The signal comes before the price move
- Most people react late because they only see the outcome
- StockSight AI focuses on the cause

**Tone examples of what works:**
- "Most traders aren't slow. They're just looking at the wrong thing."
- "Iran closes the Strait of Hormuz. Oil jumps 4%. Everyone calls it a surprise. It wasn't."
- "There's a reason institutional desks have 12 screens. They're not watching one thing."

**What to avoid:**
- Vague corporate language ("leverage synergies", "empower your journey")
- Rocket emojis, line breaks for every sentence, excessive emojis generally
- Overpromising on returns or performance
- Anything that reads like a Telegram signal group

### Step 3 — Decide whether to generate an image

Not every post needs an image. Use your judgement. Generate one when:
- The post has a concept that would land harder visually (data, contrast, metaphor)
- It's a brand-building or announcement post where visual identity matters
- The hook is strong but abstract — a visual grounds it
- LinkedIn performance data consistently shows images boost reach on non-link posts

Skip the image when:
- It's a text-only thought leadership post that works better as pure copy
- The topic is conversational and an image would feel forced
- Adam explicitly says no image

### Step 4 — Generate the image (if needed)

**Craft the image prompt first.** Think like a creative director:
- What's the visual metaphor for this post?
- Style: Clean, modern, minimal. Dark/moody tones tend to fit financial themes well. No cheesy stock photo vibes.
- Avoid: text in the image (it'll be wrong), faces, anything overly literal
- Good directions: abstract data flows, cityscapes, signal/wave imagery, market charts (stylised, not real), contrasting light/dark, radar screens, global maps with highlighted regions

**Default model:** `nano-banana-2` — fast and good quality for most posts
**Use `nano-banana-pro` for:** high-stakes posts (launch announcement, major campaign) where quality really matters

**Aspect ratio:** `1:1` (square) — performs best in LinkedIn feed

**API call — create the task:**

```bash
TASK_RESPONSE=$(curl -s -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Authorization: Bearer $KIE_AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nano-banana-2",
    "input": {
      "prompt": "<YOUR IMAGE PROMPT HERE>",
      "aspect_ratio": "1:1",
      "output_format": "png"
    }
  }')

TASK_ID=$(echo $TASK_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['taskId'])")
echo "Task ID: $TASK_ID"
```

**Poll for the result** (check every 5 seconds, up to 60 attempts):

```bash
for i in $(seq 1 60); do
  RESULT=$(curl -s -X GET "https://api.kie.ai/api/v1/jobs/recordInfo?taskId=$TASK_ID" \
    -H "Authorization: Bearer $KIE_AI_API_KEY")
  STATE=$(echo $RESULT | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['data']['state'])" 2>/dev/null)
  if [ "$STATE" = "success" ]; then
    IMAGE_URL=$(echo $RESULT | python3 -c "import sys, json; d=json.load(sys.stdin); rj=json.loads(d['data']['resultJson']); print(rj['resultUrls'][0])")
    echo "Image ready: $IMAGE_URL"
    break
  elif [ "$STATE" = "fail" ]; then
    echo "Image generation failed"
    break
  fi
  echo "Status: $STATE — waiting..."
  sleep 5
done
```

If image generation fails, present the post without it and note what image prompt was intended.

### Step 5 — Present the output

Use this format:

---

## LinkedIn Post

**[HOOK LINE]**

[Body of the post]

[Hashtags]

---

**Image prompt used:** `[the prompt you sent to kie.ai]`

**Generated image:** [URL or "generating..." status]

---

**Notes (optional):**
- Mention any alternative angles worth trying
- Flag if a different image style might work better
- Suggest whether nano-banana-pro would be worth it for this one

---

## Notes

- Keep the post human. Read it aloud before finalising — if it sounds like a press release, rewrite it.
- Image URLs from kie.ai expire after 24 hours — Adam should save/download immediately if he wants to keep it.
- If Adam wants to iterate on the post or image, that's a normal part of the workflow — just refine and re-generate.
- Check `.env` for `KIE_AI_API_KEY` before making API calls.
