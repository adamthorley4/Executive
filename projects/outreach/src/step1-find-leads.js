import fetch from 'node-fetch';
import { load } from 'cheerio';
import { COL, STATUS, MAX_NEW_LEADS } from './config.js';
import { appendLeads, getExistingEmails, today } from './sheets.js';
import { extractName } from './name-utils.js';

// Each entry: { query, vertical }
const SEARCH_QUERIES = [
  // --- MAHARI: Luxury Real Estate ---
  { query: '"luxury property" agency site:.co.uk',                              vertical: 'MAHARI' },
  { query: '"luxury homes" "contact us" site:.co.uk',                           vertical: 'MAHARI' },
  { query: '"prime real estate" London agency site:.co.uk',                     vertical: 'MAHARI' },
  { query: '"luxury properties" agency Dubai site:.com',                        vertical: 'MAHARI' },
  { query: '"ultra luxury" real estate agency site:.com',                       vertical: 'MAHARI' },
  { query: '"luxury residential" developer site:.co.uk',                        vertical: 'MAHARI' },
  { query: '"off-plan" "luxury" property developer UK site:.co.uk',             vertical: 'MAHARI' },
  { query: '"high-end property" developer London site:.co.uk',                  vertical: 'MAHARI' },
  { query: '"luxury interior design" studio London site:.co.uk',                vertical: 'MAHARI' },
  { query: '"architecture studio" luxury residential site:.co.uk',              vertical: 'MAHARI' },
  { query: '"boutique property" agency UK "contact" site:.co.uk',               vertical: 'MAHARI' },
  { query: '"luxury apartments" developer "enquire" site:.co.uk',               vertical: 'MAHARI' },
  { query: '"prime property" agency London Marbella Monaco site:.com',          vertical: 'MAHARI' },
  { query: '"luxury villas" agency Marbella Spain site:.com',                   vertical: 'MAHARI' },

  // --- PELAGOS: Superyacht / Luxury Marine ---
  { query: '"yacht charter" company fleet site:.co.uk',                         vertical: 'PELAGOS' },
  { query: '"superyacht charter" Mediterranean "enquire" site:.com',            vertical: 'PELAGOS' },
  { query: '"luxury yacht charter" company site:.com',                          vertical: 'PELAGOS' },
  { query: '"yacht broker" sales site:.co.uk',                                  vertical: 'PELAGOS' },
  { query: '"superyacht broker" site:.com "contact"',                           vertical: 'PELAGOS' },
  { query: '"superyacht management" company site:.com',                         vertical: 'PELAGOS' },
  { query: '"yacht charter" fleet "book now" site:.com',                        vertical: 'PELAGOS' },
  { query: '"motor yacht" charter company site:.co.uk',                         vertical: 'PELAGOS' },
  { query: '"sailing yacht" charter company Mediterranean site:.com',           vertical: 'PELAGOS' },
  { query: '"luxury yacht" itinerary charter "enquiry" site:.com',              vertical: 'PELAGOS' },
  { query: '"marina" prestige berths "contact" Monaco Palma site:.com',         vertical: 'PELAGOS' },
  { query: '"private yacht charter" concierge site:.com',                       vertical: 'PELAGOS' },

  // --- KOAN: Premium Artisan / Product Brands ---
  { query: '"artisan" knives handmade brand site:.co.uk',                       vertical: 'KOAN' },
  { query: '"handmade knives" UK brand "shop" site:.co.uk',                     vertical: 'KOAN' },
  { query: '"Japanese knives" UK brand site:.co.uk',                            vertical: 'KOAN' },
  { query: '"premium kitchen knives" brand site:.com',                          vertical: 'KOAN' },
  { query: '"artisan kitchenware" brand UK site:.co.uk',                        vertical: 'KOAN' },
  { query: '"luxury olive oil" brand UK site:.co.uk',                           vertical: 'KOAN' },
  { query: '"artisan" "hand-crafted" food brand UK "shop" site:.co.uk',         vertical: 'KOAN' },
  { query: '"small batch" spirits brand UK site:.co.uk',                        vertical: 'KOAN' },
  { query: '"craft spirits" brand "buy" site:.co.uk',                           vertical: 'KOAN' },
  { query: '"premium ceramics" brand UK site:.co.uk',                           vertical: 'KOAN' },
  { query: '"artisan leather goods" brand UK site:.co.uk',                      vertical: 'KOAN' },
  { query: '"Japanese" import brand UK artisan site:.co.uk',                    vertical: 'KOAN' },
  { query: '"premium" "handmade" "shop" watchmaker brand UK site:.co.uk',       vertical: 'KOAN' },

  // --- PATROL_PAWS: Local Service Businesses ---
  { query: '"dog walker" site:.co.uk "book now"',                               vertical: 'PATROL_PAWS' },
  { query: '"dog walking service" UK "contact me" site:.co.uk',                 vertical: 'PATROL_PAWS' },
  { query: '"dog walking" "pet sitting" site:.co.uk',                           vertical: 'PATROL_PAWS' },
  { query: '"mobile dog groomer" site:.co.uk',                                  vertical: 'PATROL_PAWS' },
  { query: '"pet grooming" service site:.co.uk "book"',                         vertical: 'PATROL_PAWS' },
  { query: '"doggy daycare" site:.co.uk',                                       vertical: 'PATROL_PAWS' },
  { query: '"local personal trainer" site:.co.uk "contact"',                    vertical: 'PATROL_PAWS' },
  { query: '"mobile beautician" UK site:.co.uk',                                vertical: 'PATROL_PAWS' },
  { query: '"gardener" sole trader site:.co.uk "contact"',                      vertical: 'PATROL_PAWS' },
  { query: '"electrician" sole trader site:.co.uk "free quote"',                vertical: 'PATROL_PAWS' },
  { query: '"plumber" site:.co.uk "call me" OR "book now"',                     vertical: 'PATROL_PAWS' },
  { query: '"osteopath" site:.co.uk "book online"',                             vertical: 'PATROL_PAWS' },
  { query: '"physiotherapist" site:.co.uk "book appointment"',                  vertical: 'PATROL_PAWS' },
  { query: '"massage therapist" site:.co.uk "book"',                            vertical: 'PATROL_PAWS' },
];

const EMAIL_REGEX = /[\w.+\-]+@[\w\-]+\.[a-z]{2,}/gi;

const BLOCKED_DOMAINS = /linkedin|instagram|facebook|twitter|reddit|yelp|tripadvisor|yellowpages|clutch|upwork|trustpilot|google\.com|youtube|bark\.com|thumbtack|directory|rightmove|zoopla|onthemarket|primelocation|booking\.com|airbnb|viator|getaway|tripadvisor/i;

// Luxury verticals: allow info@, hello@, contact@ — a real person manages these inboxes
const LUXURY_VERTICALS = new Set(['MAHARI', 'PELAGOS', 'KOAN']);

const BLOCKED_PREFIXES_STRICT = ['enroll', 'info', 'hello', 'contact', 'admin', 'support', 'team', 'noreply', 'no-reply', 'example', 'test', 'enquiries', 'enquiry', 'mail', 'office', 'reception', 'booking', 'bookings', 'sales'];
const BLOCKED_PREFIXES_LUXURY = ['enroll', 'admin', 'support', 'noreply', 'no-reply', 'example', 'test', 'sales'];

const FILE_EXTENSION_REGEX = /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|css|js|woff|ttf)$/i;

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
  const urls = [];
  $('.result__a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const match = href.match(/[?&]uddg=([^&]+)/);
    if (match) {
      try { urls.push(decodeURIComponent(match[1])); } catch { /* skip */ }
    }
  });
  return [...new Set(urls)].slice(0, 8);
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      timeout: 10000,
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

function extractEmails(text, vertical) {
  const blockedPrefixes = LUXURY_VERTICALS.has(vertical) ? BLOCKED_PREFIXES_LUXURY : BLOCKED_PREFIXES_STRICT;
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.map(e => e.toLowerCase()))].filter(e => {
    if (FILE_EXTENSION_REGEX.test(e)) return false;
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

function tryFallbackUrls(baseUrl) {
  try {
    const u = new URL(baseUrl);
    return [`${u.origin}/contact`, `${u.origin}/about`];
  } catch {
    return [];
  }
}

export async function findLeads() {
  console.log('Step 1: Finding new leads...');
  const existing = await getExistingEmails();
  const found = [];
  const shuffled = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);

  for (const { query, vertical } of shuffled) {
    if (found.length >= MAX_NEW_LEADS) break;
    console.log(`  [${vertical}] Searching: "${query}"`);

    let urls;
    try {
      urls = await duckSearch(query);
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  Search failed for "${query}":`, err.message);
      continue;
    }

    for (const url of urls) {
      if (found.length >= MAX_NEW_LEADS) break;
      if (BLOCKED_DOMAINS.test(url)) continue;

      const pagesToTry = [url, ...tryFallbackUrls(url)];
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

  await appendLeads(found);
  console.log(`Step 1 done. Found ${found.length} new leads.`);
}

if (process.argv[1].endsWith('step1-find-leads.js')) {
  findLeads().catch(console.error);
}
