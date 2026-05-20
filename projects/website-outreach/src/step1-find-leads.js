import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { COL, STATUS, MAX_NEW_LEADS } from './config.js';
import { appendLeads, getExistingEmails } from './sheets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to the DLD broker offices file (relative to project root)
const DLD_FILE = resolve(__dirname, '../../../.claude/skills/website-outreach/Broker Offices.xls');

// Large established brands to skip
const SKIP_COMPANIES = /\b(betterhomes|allsopp|haus\s*&?\s*haus|coldwell\s*banker|provident\s*estate|driven\s*properties|fam\s*properties|knights?\s*frank|savills|jll|cbre|engel\s*&?\s*v[oö]lkers|metropolitan|re\/?max|century\s*21|better\s*homes|white\s*&?\s*co|emaar|damac|nakheel|hamptons|sotheby|christie|harbor\s*real\s*estate|palma\s*real\s*estate)\b/i;

// Generic emails that won't reach a real person
const BLOCKED_EMAIL_PREFIXES = ['noreply', 'no-reply', 'example', 'test', 'webmaster', 'postmaster', 'abuse', 'spam'];

function parseDld() {
  if (!existsSync(DLD_FILE)) {
    throw new Error(`DLD file not found at: ${DLD_FILE}`);
  }

  const html = readFileSync(DLD_FILE, 'utf8');
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  const leads = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
    const vals = cells.map(c => c.replace(/<[^>]+>/g, '').trim());

    // Columns: 0=Office Number, 1=Name English, 2=Name Arabic, 3=Website, 4=Phone, 5=Email
    const name = vals[1] || '';
    const website = vals[3] || '';
    const phone = vals[4] || '';
    const email = (vals[5] || '').toLowerCase().trim();

    if (!name || !email) continue;
    if (website) continue; // Has a website — Step 1 is for no-website companies only

    if (SKIP_COMPANIES.test(name)) continue;
    if (BLOCKED_EMAIL_PREFIXES.some(p => email.startsWith(p + '@'))) continue;
    if (!email.includes('@')) continue;

    leads.push({ name, email, phone });
  }

  // Shuffle so we pick different companies each day
  return leads.sort(() => Math.random() - 0.5);
}

export async function findLeads() {
  console.log('Step 1: Loading leads from DLD broker register...');

  let allLeads;
  try {
    allLeads = parseDld();
  } catch (err) {
    console.error('  Failed to parse DLD file:', err.message);
    return;
  }

  console.log(`  ${allLeads.length} eligible no-website agencies in DLD file`);

  const existing = await getExistingEmails();
  const found = [];

  for (const lead of allLeads) {
    if (found.length >= MAX_NEW_LEADS) break;
    if (existing.has(lead.email)) continue;

    const row = new Array(16).fill('');
    row[COL.COMPANY] = lead.name;
    row[COL.WEBSITE] = '';           // confirmed no website
    row[COL.EMAIL] = lead.email;
    row[COL.PHONE] = lead.phone;
    row[COL.SOURCE] = 'DLD Broker Register';
    row[COL.WEB_STATUS] = 'None';    // already known — skip Step 2 for these
    row[COL.WEB_NOTES] = 'No website listed in DLD register';
    row[COL.STATUS] = STATUS.SCORED; // jump straight to Step 3

    found.push(row);
    existing.add(lead.email);
    console.log(`  Found: ${lead.name} — ${lead.email}`);
  }

  await appendLeads(found);
  console.log(`Step 1 done. Found ${found.length} new leads.`);
}

if (process.argv[1].endsWith('step1-find-leads.js')) {
  findLeads().catch(console.error);
}
