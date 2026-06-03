import fetch from 'node-fetch';
import { load } from 'cheerio';
import { COL, STATUS, MAX_NEW_LEADS } from './config.js';
import { appendLeads, getExistingLinkedInUrls, normaliseUrl } from './sheets.js';

const today = () => new Date().toISOString().slice(0, 10);

const SEARCH_QUERIES = [
  // UK — business & executive
  'site:linkedin.com/in "business coach" London',
  'site:linkedin.com/in "executive coach" UK',
  'site:linkedin.com/in "leadership coach" UK',
  'site:linkedin.com/in "business consultant" London',
  'site:linkedin.com/in "executive coach" Manchester',
  // UK — life, mindset & wellness
  'site:linkedin.com/in "life coach" UK',
  'site:linkedin.com/in "mindset coach" UK',
  'site:linkedin.com/in "wellness coach" London',
  'site:linkedin.com/in "performance coach" UK',
  // UK — health & career
  'site:linkedin.com/in "health coach" UK',
  'site:linkedin.com/in "career coach" London',
  'site:linkedin.com/in "NLP coach" UK',
  'site:linkedin.com/in "NLP practitioner" UK',
  'site:linkedin.com/in "personal development coach" UK',
  'site:linkedin.com/in "sales consultant" London',
  'site:linkedin.com/in "marketing consultant" UK',
  // US — business & executive
  'site:linkedin.com/in "business coach" "New York"',
  'site:linkedin.com/in "executive coach" USA',
  'site:linkedin.com/in "leadership coach" USA',
  'site:linkedin.com/in "business consultant" "Los Angeles"',
  'site:linkedin.com/in "executive coach" Chicago',
  // US — life, mindset & wellness
  'site:linkedin.com/in "life coach" USA',
  'site:linkedin.com/in "mindset coach" USA',
  'site:linkedin.com/in "wellness coach" "New York"',
  'site:linkedin.com/in "performance coach" USA',
  // US — health & career
  'site:linkedin.com/in "health coach" USA',
  'site:linkedin.com/in "career coach" "New York"',
  'site:linkedin.com/in "NLP coach" USA',
  'site:linkedin.com/in "personal development coach" USA',
  'site:linkedin.com/in "sales consultant" "New York"',
  'site:linkedin.com/in "marketing consultant" USA',
];

const BLOCKED_DOMAINS = /\/company\/|\/school\/|\/jobs\/|\/pulse\/|linkedin\.com\/in\/(search|help|legal|cookies|settings|feed)/i;

async function duckSearch(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`DuckDuckGo search failed: ${res.status}`);
  const html = await res.text();
  const $ = load(html);
  const results = [];
  $('.result__a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const title = $(el).text().trim();
    const match = href.match(/[?&]uddg=([^&]+)/);
    if (match) {
      try { results.push({ url: decodeURIComponent(match[1]), title }); } catch { /* skip */ }
    }
  });
  return results.slice(0, 8);
}

function cleanText(str) {
  return str.replace(/[‎‏‪-‮⁦-⁩]/g, '').trim();
}

function parseTitleForProfile(title) {
  if (!title) return { name: '', headline: '', company: '' };
  const clean = cleanText(title.replace(/\s*[|\-]\s*LinkedIn\s*$/i, ''));
  const parts = clean.split(/\s+[-|]\s+/).map(p => cleanText(p)).filter(Boolean);
  const name = parts[0] || '';
  const headline = parts[1] || '';
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
      results = await duckSearch(query);
      await new Promise(r => setTimeout(r, 2000));
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
      if (!name) continue;

      const niche = extractNiche(headline);
      const row = new Array(19).fill('');
      row[COL.NAME] = name;
      row[COL.HEADLINE] = headline;
      row[COL.LINKEDIN_URL] = url.split('?')[0].replace(/\/$/, '');
      row[COL.COMPANY] = company;
      row[COL.SOURCE] = query;
      row[COL.STATUS] = STATUS.NEW;
      row[COL.DATE_ADDED] = today();

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
