import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY, COL, STATUS } from './config.js';
import { getLeadsByStatus, updateRowFields } from './sheets.js';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

function buildConnNotePrompt(lead) {
  const name = lead[COL.NAME] || '';
  const headline = lead[COL.HEADLINE] || '';
  const summary = lead[COL.SUMMARY] || '';
  const services = lead[COL.SERVICES] || '';
  const about = lead[COL.ABOUT] || '';

  const context = [summary, services, about].filter(Boolean).join('\n').trim() || headline;

  return `Write a LinkedIn connection request note from Adam to ${name}.

About Adam: He works with coaches and consultants to find the friction inside their business — the manual, repetitive work that eats into their time — and fixes it so they can focus on the revenue-generating work that actually grows their business.

What ${name} does: ${context}

Rules:
- STRICT 300 character limit — count carefully before outputting
- Reference something specific about their niche, client type, or approach — show you actually read their profile
- Include a natural, one-line hint about what Adam does — not a pitch, just enough context so they know who he is and why he's reaching out
- The hint should feel incidental, not like the point of the message
- No hard sell, no CTA
- Never end with "would love to have you in my network", "wanted to connect", "love to connect" or any variant — these are dead giveaways of a template
- End with a short, genuine question specific to their work — something that invites a reply naturally
- Human voice, short, direct
- No em-dashes (— or -)
- No exclamation marks

Output ONLY the connection note. Nothing else.`;
}

function buildFollowupPrompt(lead) {
  const name = lead[COL.NAME] || '';
  const headline = lead[COL.HEADLINE] || '';
  const summary = lead[COL.SUMMARY] || '';
  const services = lead[COL.SERVICES] || '';
  const about = lead[COL.ABOUT] || '';

  const context = [summary, services, about].filter(Boolean).join('\n').trim() || headline;

  return `Write a LinkedIn DM from Adam to ${name}, who just accepted his connection request.

What ${name} does: ${context}

Adam works with coaches and consultants to find where friction exists in their business — the admin and repetitive work that eats time they should be spending on clients and revenue. This DM comes after they accepted the connection. The goal is to start a real conversation, not pitch.

Rules:
- Max 120 words
- Acknowledge the connection naturally, but do not be cringey about it ("Thanks for connecting!" is too generic)
- Reference something specific about their work that sparks a genuine question
- End with one question that invites a reply — make it specific to them, not generic ("do you find AI useful?" is not a good question)
- Do not pitch anything. Do not mention AI automations or what Adam does.
- Human voice, conversational
- No em-dashes (— or -)
- Short paragraphs

Output ONLY the DM. Nothing else.`;
}

function enforceCharLimit(text, limit) {
  if (!text) return '';
  return text.length <= limit ? text : text.slice(0, limit - 3) + '...';
}

export async function generateMessages() {
  console.log('Step 3: Generating connection notes and follow-up DMs...');
  const leads = await getLeadsByStatus(STATUS.ENRICHED);

  if (!leads.length) {
    console.log('  No enriched leads to process.');
    return;
  }

  for (const lead of leads) {
    const name = lead.data[COL.NAME] || '(unknown)';
    console.log(`  Generating messages for: ${name}`);

    try {
      // Generate connection note (strict 300 char limit)
      const noteMsg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 120,
        messages: [{ role: 'user', content: buildConnNotePrompt(lead.data) }],
      });
      let connNote = noteMsg.content[0]?.text?.trim() || '';
      connNote = enforceCharLimit(connNote, 300);

      // Generate follow-up DM
      const dmMsg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 250,
        messages: [{ role: 'user', content: buildFollowupPrompt(lead.data) }],
      });
      const followupDm = dmMsg.content[0]?.text?.trim() || '';

      console.log(`    Note (${connNote.length} chars): "${connNote.slice(0, 60)}..."`);

      await updateRowFields(lead.rowNumber, {
        [COL.CONN_NOTE]: connNote,
        [COL.FOLLOWUP_DM]: followupDm,
        [COL.STATUS]: STATUS.DRAFT_READY,
      });
    } catch (err) {
      console.error(`    Failed for ${name}:`, err.message);
    }
  }

  console.log('Step 3 done.');
}

if (process.argv[1].endsWith('step3-generate.js')) {
  generateMessages().catch(console.error);
}
