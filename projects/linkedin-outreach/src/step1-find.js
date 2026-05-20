import fetch from 'node-fetch';
import { FIRECRAWL_API_KEY, COL, STATUS, MAX_NEW_LEADS } from './config.js';
import { appendLeads, getExistingLinkedInUrls, normaliseUrl } from './sheets.js';

// Search queries targeting individual coach/consultant LinkedIn profiles in Dubai/UAE
const SEARCH_QUERIES = [
  // Business & executive coaches
  'site:linkedin.com/in "business coach" Dubai',
  'site:linkedin.com/in "executive coach" Dubai',
  'site:linkedin.com/in "leadership coach" Dubai',
  'site:linkedin.com/in "business consultant" Dubai',
  'site:linkedin.com/in "executive coach" UAE',
  // Life, mindset & wellness
  'site:linkedin.com/in "life coach" Dubai',
  'site:linkedin.com/in "mindset coach" Dubai',
  'site:linkedin.com/in "wellness coach" Dubai',
  'site:linkedin.com/in "performance coach" Dubai',
  // Health & fitness
  'site:linkedin.com/in "health coach" Dubai',
  'site:linkedin.com/in "nutrition coach" Dubai UAE',
  // Career & NLP
  'site:linkedin.com/in "career coach" Dubai',
  'site:linkedin.com/in "NLP coach" Dubai UAE',
  'site:linkedin.com/in "NLP practitioner" Dubai',
  // Relationships & personal development
  'site:linkedin.com/in "relationship coach" Dubai UAE',
  'site:linkedin.com/in "personal development coach" Dubai',
  // Sales & marketing consultants
  'site:linkedin.com/in "sales consultant" Dubai',
  'site:linkedin.com/in "marketing consultant" Dubai UAE',
  // Abu Dhabi
  'site:linkedin.com/in "business coach" "Abu Dhabi"',
  'site:linkedin.com/in "life coach" "Abu Dhabi"',
  'site:linkedin.com/in "executive coach" "Abu Dhabi"',
];

// Known company/aggregator pages to skip
const BLOCKED_DOMAINS = /\/company\/|\/school\/|\/jobs\/|\/pulse\/|linkedin\.com\/in\/(search|help|legal|cookies|settings|feed)/i;

async function firecrawlSearch(query) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit: 8 }),
  });
  if (!res.ok) throw new Error(`Firecrawl search failed: ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

// LinkedIn titles: "Name - Headline - Location | LinkedIn" or "Name | Headline | LinkedIn"
function cleanText(str) {
  // Remove invisible Unicode directional marks (e.g. RTL marks from Arabic LinkedIn pages)
  return str.replace(/[‎‏‪-‮⁦-⁩]/g, '').trim();
}

function parseTitleForProfile(title) {
  if (!title) return { name: '', headline: '', company: '' };

  // Strip trailing " | LinkedIn" or " - LinkedIn"
  const clean = cleanText(title.replace(/\s*[|\-]\s*LinkedIn\s*$/i, ''));

  // Split by " - " or " | "
  const parts = clean.split(/\s+[-|]\s+/).map(p => cleanText(p)).filter(Boolean);

  const name = parts[0] || '';
  const headline = parts[1] || '';
  // parts[2] is often "Location" — skip it, not useful as company
  // Try to extract company from headline (e.g. "Business Coach at Acme")
  const companyMatch = headline.match(/\bat\s+(.+)/i);
  const company = companyMatch ? companyMatch[1].trim() : '';

  return { name, headline, company };
}

function isValidLinkedInProfile(url) {
  if (!url) return false;
  if (!url.includes('linkedin.com/in/')) return false;
  if (BLOCKED_DOMAINS.test(url)) return false;
  return true;
}

// Extract niche keyword from headline for display
function extractNiche(headline) {
  const match = headline.match(/^([\w\s]+coach|[\w\s]+consultant|[\w\s]+advisor|[\w\s]+mentor)/i);
  return match ? match[1].trim() : headline.split(/[|,\-]/)[0].trim();
}

export async function findProfiles() {
  console.log('Step 1: Finding new LinkedIn profiles...');
  const existing = await getExistingLinkedInUrls();
  const found = [];

  const shuffled = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);

  for (const query of shuffled) {
    if (found.length >= MAX_NEW_LEADS) break;
    console.log(`  Searching: "${query}"`);

    let results;
    try {
      results = await firecrawlSearch(query);
    } catch (err) {
      console.error(`  Search failed for "${query}":`, err.message);
      continue;
    }

    for (const result of results) {
      if (found.length >= MAX_NEW_LEADS) break;

      const url = result.url || '';
      if (!isValidLinkedInProfile(url)) continue;

      const normUrl = normaliseUrl(url);
      if (existing.has(normUrl)) continue;

      const { name, headline, company } = parseTitleForProfile(result.title || '');
      if (!name) continue; // Can't personalise without a name — skip

      const niche = extractNiche(headline);
      const row = new Array(18).fill('');
      row[COL.NAME] = name;
      row[COL.HEADLINE] = headline;
      row[COL.LINKEDIN_URL] = url.split('?')[0].replace(/\/$/, ''); // clean URL, no query params
      row[COL.COMPANY] = company;
      row[COL.SOURCE] = query;
      row[COL.STATUS] = STATUS.NEW;

      found.push(row);
      existing.add(normUrl);
      console.log(`  Found: ${name} — ${niche}`);
    }
  }

  await appendLeads(found);
  console.log(`Step 1 done. Found ${found.length} new profiles.`);
}

if (process.argv[1].endsWith('step1-find.js')) {
  findProfiles().catch(console.error);
}
