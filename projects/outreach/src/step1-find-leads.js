import fetch from 'node-fetch';
import { load } from 'cheerio';
import { COL, STATUS, MAX_NEW_LEADS_PER_VERTICAL, FIRECRAWL_API_KEY } from './config.js';
import { appendLeads, getExistingEmails, today } from './sheets.js';
import { extractName } from './name-utils.js';

const SEARCH_QUERIES = [
  // --- MAHARI: Luxury Real Estate ---
  { query: 'luxury property agency London contact site:co.uk',                    vertical: 'MAHARI' },
  { query: 'luxury homes estate agent UK enquiries site:co.uk',                   vertical: 'MAHARI' },
  { query: 'prime real estate developer London boutique site:co.uk',              vertical: 'MAHARI' },
  { query: 'luxury residential property developer UK email site:co.uk',           vertical: 'MAHARI' },
  { query: 'architecture studio luxury residential London site:co.uk',            vertical: 'MAHARI' },
  { query: 'interior design studio luxury homes London site:co.uk',               vertical: 'MAHARI' },
  { query: 'boutique property agency UK luxury contact site:co.uk',               vertical: 'MAHARI' },
  { query: 'luxury property developer off-plan apartments UK site:co.uk',         vertical: 'MAHARI' },
  { query: 'high end property agency London sales site:co.uk',                    vertical: 'MAHARI' },
  { query: 'luxury villa agency Marbella Spain email site:com',                   vertical: 'MAHARI' },
  { query: 'luxury property agency Dubai contact email site:com',                 vertical: 'MAHARI' },
  { query: 'prime London property sales boutique agency site:co.uk',              vertical: 'MAHARI' },
  { query: 'luxury new homes developer UK contact site:co.uk',                    vertical: 'MAHARI' },
  { query: 'exclusive property consultant UK site:co.uk',                         vertical: 'MAHARI' },

  // --- PELAGOS: Superyacht / Luxury Marine ---
  { query: 'yacht charter company UK contact email site:co.uk',                   vertical: 'PELAGOS' },
  { query: 'superyacht broker UK contact email site:co.uk',                       vertical: 'PELAGOS' },
  { query: 'yacht charter Mediterranean luxury contact site:com',                 vertical: 'PELAGOS' },
  { query: 'superyacht charter brokerage contact enquiry site:com',               vertical: 'PELAGOS' },
  { query: 'private yacht charter company contact site:com',                      vertical: 'PELAGOS' },
  { query: 'sailing yacht charter UK fleet email site:co.uk',                     vertical: 'PELAGOS' },
  { query: 'motor yacht charter UK contact email site:co.uk',                     vertical: 'PELAGOS' },
  { query: 'luxury yacht hire UK contact site:co.uk',                             vertical: 'PELAGOS' },
  { query: 'yacht brokerage company UK email site:co.uk',                         vertical: 'PELAGOS' },
  { query: 'superyacht management company contact site:com',                      vertical: 'PELAGOS' },
  { query: 'charter yacht broker Mediterranean email site:com',                   vertical: 'PELAGOS' },
  { query: 'sailing holiday company UK contact email site:co.uk',                 vertical: 'PELAGOS' },

  // --- KOAN: Premium Artisan / Product Brands ---
  { query: 'handmade knives UK brand shop email site:co.uk',                      vertical: 'KOAN' },
  { query: 'artisan kitchen knives maker UK site:co.uk',                          vertical: 'KOAN' },
  { query: 'Japanese knives UK supplier shop contact site:co.uk',                 vertical: 'KOAN' },
  { query: 'craft spirits small batch distillery UK shop site:co.uk',             vertical: 'KOAN' },
  { query: 'artisan food brand UK shop contact site:co.uk',                       vertical: 'KOAN' },
  { query: 'premium ceramics UK maker shop site:co.uk',                           vertical: 'KOAN' },
  { query: 'handmade leather goods UK brand shop site:co.uk',                     vertical: 'KOAN' },
  { query: 'artisan chocolate brand UK shop site:co.uk',                          vertical: 'KOAN' },
  { query: 'small batch gin distillery UK contact site:co.uk',                    vertical: 'KOAN' },
  { query: 'luxury candles UK handmade brand contact site:co.uk',                 vertical: 'KOAN' },
  { query: 'premium olive oil UK artisan brand contact site:co.uk',               vertical: 'KOAN' },
  { query: 'handcrafted goods maker UK shop contact site:co.uk',                  vertical: 'KOAN' },
  { query: 'bespoke furniture maker UK contact site:co.uk',                       vertical: 'KOAN' },

  // --- PATROL_PAWS: Local Service Businesses ---
  { query: 'dog walker UK contact email site:co.uk',                              vertical: 'PATROL_PAWS' },
  { query: 'mobile dog groomer UK contact email site:co.uk',                      vertical: 'PATROL_PAWS' },
  { query: 'dog grooming service UK contact site:co.uk',                          vertical: 'PATROL_PAWS' },
  { query: 'pet sitting service UK contact site:co.uk',                           vertical: 'PATROL_PAWS' },
  { query: 'personal trainer UK contact site:co.uk',                              vertical: 'PATROL_PAWS' },
  { query: 'massage therapist UK book contact site:co.uk',                        vertical: 'PATROL_PAWS' },
  { query: 'mobile beautician UK contact site:co.uk',                             vertical: 'PATROL_PAWS' },
  { query: 'physiotherapist UK contact book site:co.uk',                          vertical: 'PATROL_PAWS' },
  { query: 'osteopath UK book appointment site:co.uk',                            vertical: 'PATROL_PAWS' },
  { query: 'local plumber UK contact quote site:co.uk',                           vertical: 'PATROL_PAWS' },
  { query: 'local electrician UK contact quote site:co.uk',                       vertical: 'PATROL_PAWS' },
  { query: 'gardener UK contact site:co.uk',                                      vertical: 'PATROL_PAWS' },
  { query: 'doggy daycare UK contact site:co.uk',                                 vertical: 'PATROL_PAWS' },
  { query: 'dog walking service UK contact site:co.uk',                           vertical: 'PATROL_PAWS' },
];

const EMAIL_REGEX = /[\w.+\-]+@[\w\-]+\.[a-z]{2,}/gi;

const BLOCKED_DOMAINS = /linkedin|instagram|facebook|twitter|reddit|yelp|tripadvisor|yellowpages|clutch|upwork|trustpilot|google\.com|youtube|bark\.com|thumbtack|directory|rightmove|zoopla|onthemarket|primelocation|booking\.com|airbnb|viator|getaway|duckduckgo\.com|capterra|firecrawl/i;

const LUXURY_VERTICALS = new Set(['MAHARI', 'PELAGOS', 'KOAN']);

// Strict: sole traders — only personal/direct emails
const BLOCKED_PREFIXES_STRICT = ['enroll', 'info', 'hello', 'contact', 'admin', 'support', 'team', 'noreply', 'no-reply', 'example', 'test', 'enquiries', 'enquiry', 'mail', 'office', 'reception', 'booking', 'bookings', 'sales'];
// Luxury: managed inboxes — info@, hello@, contact@ are real
const BLOCKED_PREFIXES_LUXURY = ['enroll', 'admin', 'support', 'noreply', 'no-reply', 'example', 'test'];

// Known placeholder/fake emails to reject outright
const FAKE_EMAIL_PATTERN = /^(email@email\.com|test@test\.(com|co\.uk)|example@example\.com|user@domain\.com|name@domain\.com|jane\.doe@.+|john\.doe@.+|your@email\..+|yourname@.+)$/i;

// Local part patterns that indicate non-real emails (HTML entities, hashes, etc.)
const INVALID_LOCAL_PART = /^u[0-9a-f]{4}|^[a-f0-9]{32}@/i;

// Domains we should never email — includes Sentry ingest patterns
const BLOCKED_EMAIL_DOMAINS = /duckduckgo\.com|example\.com|test\.com|placeholder\.com|\.ingest$|sentry[-.]|wixpress|sentry\.io/i;

// Large aggregator/booking platforms we should skip
const LARGE_BRANDS = /dreamyachtcharter|sunsail\.co|moorings\.co|yachtworld|boats\.com|yachtcharterfleet|charterworld|rightmove|zoopla|idealhomes/i;

const FILE_EXTENSION_REGEX = /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|css|js|woff|ttf)$/i;

async function firecrawlSearch(query) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit: 10 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl search failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return (data.data || []).map(r => r.url).filter(Boolean);
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function htmlToText(html) {
  const $ = load(html);
  $('script, style, nav, footer, header, noscript, iframe, [role="navigation"]').remove();
  const main = $('main, article, [role="main"], .content, #content').first();
  const root = main.length ? main : $('body');
  root.find('p, li').each((_, el) => $(el).after('\n'));
  return root.text().replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function extractEmails(html, vertical) {
  const blockedPrefixes = LUXURY_VERTICALS.has(vertical) ? BLOCKED_PREFIXES_LUXURY : BLOCKED_PREFIXES_STRICT;
  const matches = html.match(EMAIL_REGEX) || [];
  return [...new Set(matches.map(e => e.toLowerCase()))].filter(e => {
    if (FILE_EXTENSION_REGEX.test(e)) return false;
    if (FAKE_EMAIL_PATTERN.test(e)) return false;
    if (INVALID_LOCAL_PART.test(e)) return false;
    if (BLOCKED_EMAIL_DOMAINS.test(e.split('@')[1])) return false;
    if (blockedPrefixes.some(p => e.startsWith(p + '@'))) return false;
    return true;
  });
}

function extractCompany(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname.split('.')[0];
  } catch {
    return '';
  }
}

function fallbackContactUrls(baseUrl) {
  try {
    const origin = new URL(baseUrl).origin;
    return [
      `${origin}/contact`,
      `${origin}/contact-us`,
      `${origin}/get-in-touch`,
      `${origin}/enquire`,
      `${origin}/enquiry`,
      `${origin}/about`,
    ];
  } catch {
    return [];
  }
}

async function findLeadsForVertical(vertical, queries, existing, cap) {
  const found = [];
  const shuffled = [...queries].sort(() => Math.random() - 0.5);

  for (const query of shuffled) {
    if (found.length >= cap) break;
    console.log(`  [${vertical}] Searching: "${query}"`);

    let urls;
    try {
      urls = await firecrawlSearch(query);
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  Search failed for "${query}":`, err.message);
      continue;
    }

    for (const url of urls) {
      if (found.length >= cap) break;
      if (BLOCKED_DOMAINS.test(url)) continue;
      if (LARGE_BRANDS.test(url)) continue;
      // Skip blog/article/news pages — we want the homepage of a business, not a listicle
      if (/\/(blog|article|articles|news|post|posts|guide|guides|tips|advice|inspiration)\//i.test(url)) continue;

      const pagesToTry = [url, ...fallbackContactUrls(url)];
      let emails = [];
      let text = '';

      for (const pageUrl of pagesToTry) {
        const html = await fetchHtml(pageUrl);
        if (html) {
          text += '\n' + htmlToText(html);
          emails.push(...extractEmails(html, vertical));
        }
        if (emails.length) break;
      }

      emails = [...new Set(emails)].filter(e => !existing.has(e));
      if (!emails.length) continue;

      const email = emails[0];
      const name = extractName(text);
      const company = extractCompany(url);

      const row = new Array(22).fill('');
      row[COL.NAME] = name;
      row[COL.COMPANY] = company;
      row[COL.WEBSITE] = url;
      row[COL.EMAIL] = email;
      row[COL.NICHE] = vertical;
      row[COL.SOURCE] = query;
      row[COL.STATUS] = STATUS.NEW;
      row[COL.DATE_ADDED] = today();
      row[COL.VERTICAL] = vertical;

      found.push(row);
      existing.add(email);
      console.log(`  Found: ${email} (${url})`);
    }
  }

  return found;
}

export async function findLeads() {
  console.log('Step 1: Finding new leads...');
  const existing = await getExistingEmails();

  const byVertical = {};
  for (const { query, vertical } of SEARCH_QUERIES) {
    if (!byVertical[vertical]) byVertical[vertical] = [];
    byVertical[vertical].push(query);
  }

  const allFound = [];
  for (const [vertical, queries] of Object.entries(byVertical)) {
    console.log(`\n  --- ${vertical} (target: ${MAX_NEW_LEADS_PER_VERTICAL}) ---`);
    const found = await findLeadsForVertical(vertical, queries, existing, MAX_NEW_LEADS_PER_VERTICAL);
    console.log(`  ${vertical}: found ${found.length} leads`);
    allFound.push(...found);
  }

  await appendLeads(allFound);
  console.log(`\nStep 1 done. Found ${allFound.length} new leads total.`);
}

if (process.argv[1].endsWith('step1-find-leads.js')) {
  findLeads().catch(console.error);
}
