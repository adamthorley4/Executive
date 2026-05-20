import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY, COL, STATUS, WEB_STATUS } from './config.js';
import { getLeadsByStatus, updateRowFields } from './sheets.js';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

function buildPrompt(lead) {
  const company = lead[COL.COMPANY] || 'this company';
  const webStatus = lead[COL.WEB_STATUS] || '';
  const webNotes = lead[COL.WEB_NOTES] || '';
  const url = lead[COL.WEBSITE] || '';

  return `You are writing the opening line of a cold email from Adam, a freelance web designer based in Dubai. Adam builds clean, professional websites for small businesses. His site is adamthor.co.uk.

Lead company: ${company}
Their website situation: ${webStatus}
Specific detail: ${webNotes}
Website URL (if any): ${url}

Context by situation type:
- "None" means no website at all — they may be active on PropertyFinder, Bayut, or social media but have no domain of their own.
- "Free Builder" means they built a site on Wix, Weebly, or similar — shows as a free template, subdomain, or has platform branding.
- "Outdated" means their site has a copyright year before 2021 — hasn't been touched in years.
- "Poor Quality" means the site has no mobile support, placeholder content, or is under construction.

Write ONE opening sentence (max 20 words) that references their specific situation in plain, conversational English.

Rules:
- For "None": reference that they don't appear to have their own website. Phrase it as a natural observation, e.g. "couldn't find a website for [company] anywhere online" or "[company] doesn't seem to have a site yet". Do NOT mention any database, register, directory, or portal — just say they don't appear to have a website.
- For "Free Builder": reference the Wix/free-tier situation plainly — not as an insult, just practical — e.g. the Wix branding, the subdomain, the template limitations.
- For "Outdated": mention the age of the site plainly — e.g. "your site hasn't been touched since [year]".
- For "Poor Quality": reference the specific issue — e.g. "doesn't load properly on mobile" or "is still showing as under construction".
- Do NOT say "I noticed", "I came across", "I love what you're doing", or give any generic praise.
- Do NOT mention Dubai, real estate, or what Adam does.
- Do NOT use dashes or em-dashes.
- End with a full stop.
- Return SKIP only if webStatus and webNotes are both empty and you have nothing specific to work with.

Output ONLY the opening sentence or SKIP. Nothing else.`;
}

export async function generateOpeners() {
  console.log('Step 3: Generating email openers...');
  const leads = await getLeadsByStatus(STATUS.SCORED);

  if (!leads.length) {
    console.log('  No scored leads to process.');
    return;
  }

  for (const lead of leads) {
    const company = lead.data[COL.COMPANY] || lead.data[COL.EMAIL];
    console.log(`  Generating opener for: ${company}`);

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 60,
        messages: [{ role: 'user', content: buildPrompt(lead.data) }],
      });

      const opener = message.content[0]?.text?.trim() || '';

      if (!opener || opener === 'SKIP') {
        console.log(`    No specific opener — sending template as-is`);
        await updateRowFields(lead.rowNumber, { [COL.OPENER]: '', [COL.STATUS]: STATUS.DRAFT_READY });
      } else {
        console.log(`    Opener: "${opener}"`);
        await updateRowFields(lead.rowNumber, { [COL.OPENER]: opener, [COL.STATUS]: STATUS.DRAFT_READY });
      }
    } catch (err) {
      console.error(`    Failed for ${company}:`, err.message);
    }
  }

  console.log('Step 3 done.');
}

if (process.argv[1].endsWith('step3-generate.js')) {
  generateOpeners().catch(console.error);
}
