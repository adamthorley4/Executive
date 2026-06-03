import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import { load } from 'cheerio';
import { ANTHROPIC_API_KEY, COL, STATUS } from './config.js';
import { getLeadsByStatus, updateRowFields } from './sheets.js';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

async function fetchAboutPage(websiteUrl) {
  try {
    const origin = new URL(websiteUrl).origin;
    const res = await fetch(`${origin}/about`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      timeout: 10000,
    });
    if (!res.ok) return '';
    const html = await res.text();
    const $ = load(html);
    $('script, style, nav, footer, header, noscript, iframe').remove();
    const main = $('main, article, [role="main"], .content, #content').first();
    return (main.length ? main : $('body')).text().replace(/\s+/g, ' ').trim().slice(0, 2000);
  } catch {
    return '';
  }
}

function buildPrompt(lead, extraAbout = '') {
  const name = lead[COL.NAME] || 'them';
  const company = lead[COL.COMPANY] || '';
  const summary = lead[COL.SUMMARY] || '';
  const services = lead[COL.SERVICES] || '';
  const painPoints = lead[COL.PAIN_POINTS] || '';
  const about = [lead[COL.ABOUT] || '', extraAbout].filter(Boolean).join('\n');
  const blog = lead[COL.BLOG] || '';

  return `You are writing the opening line of a cold email from Adam Thorley, who builds AI automations for coaches and consultants.

Lead: ${name}${company ? ` (${company})` : ''}
What they do: ${summary}
Services: ${services}
Pain points from their website: ${painPoints}
About them: ${about}
Blog themes: ${blog}

Write ONE opening sentence (max 30 words) that makes a specific observation about their work in a way that naturally implies they carry significant operational weight running a business like theirs.

Rules:
- Reference something real and specific — their niche, their client type, a specific outcome they promise, or a problem they solve
- The observation should hint at complexity, volume, or solo responsibility without spelling it out — the email body will make the friction angle explicit
- NOT generic praise ("I loved your work", "Great content", "I came across your website", "Your website caught my eye")
- Do not mention AI, automations, or what Adam does
- End with a full stop — it stands as its own sentence before the email body
- Never use dashes or em-dashes (— or -) — they are a giveaway of AI writing
- Only write SKIP if you have absolutely nothing specific to work with — even a niche or client type counts

Good example: "Helping ambitious founders scale from six to seven figures while managing your own pipeline and delivery is a lot to carry."
Bad example: "I noticed you work with ambitious founders looking to scale their businesses."

Output ONLY the opening line or SKIP. Nothing else.`;
}

export async function generateOpeners() {
  console.log('Step 3: Generating email openers...');
  const leads = await getLeadsByStatus(STATUS.ENRICHED);

  if (!leads.length) {
    console.log('  No enriched leads to process.');
    return;
  }

  for (const lead of leads) {
    const name = lead.data[COL.NAME] || lead.data[COL.EMAIL];
    console.log(`  Generating opener for: ${name}`);

    try {
      let opener = '';

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 60,
        messages: [{ role: 'user', content: buildPrompt(lead.data) }],
      });
      opener = message.content[0]?.text?.trim() || '';

      // If SKIP, try fetching about page for more context and retry once
      if (!opener || opener === 'SKIP') {
        console.log(`    Initial SKIP — fetching about page for more context...`);
        const extraAbout = await fetchAboutPage(lead.data[COL.WEBSITE]);
        if (extraAbout) {
          const retry = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 60,
            messages: [{ role: 'user', content: buildPrompt(lead.data, extraAbout) }],
          });
          opener = retry.content[0]?.text?.trim() || '';
        }
      }

      if (!opener || opener === 'SKIP') {
        console.log(`    No opener available — sending template as-is`);
        await updateRowFields(lead.rowNumber, { [COL.OPENER]: '', [COL.STATUS]: STATUS.DRAFT_READY });
      } else {
        console.log(`    Opener: "${opener}"`);
        await updateRowFields(lead.rowNumber, { [COL.OPENER]: opener, [COL.STATUS]: STATUS.DRAFT_READY });
      }
    } catch (err) {
      console.error(`    Failed for ${name}:`, err.message);
    }
  }

  console.log('Step 3 done.');
}

if (process.argv[1].endsWith('step3-generate.js')) {
  generateOpeners().catch(console.error);
}
