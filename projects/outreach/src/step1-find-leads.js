import fetch from 'node-fetch';
import { load } from 'cheerio';
import { COL, STATUS, MAX_NEW_LEADS } from './config.js';
import { appendLeads, getExistingEmails, today } from './sheets.js';
import { extractName } from './name-utils.js';

const SEARCH_QUERIES = [
  // UK — business & executive
  '"work with me" "business coach" UK site:.co.uk',
  '"book a discovery call" coach London',
  '"I help" "business coach" UK site:.co.uk',
  '"free consultation" "executive coach" UK',
  '"book a call" consultant UK site:.co.uk',
  '"my clients" coach Manchester site:.co.uk',
  '"I help entrepreneurs" UK site:.co.uk',
  '"discovery call" "leadership coach" UK',
  '"work with me" consultant UK site:.co.uk',
  // UK — life, mindset & wellness
  '"work with me" "life coach" UK site:.co.uk',
  '"work with me" "mindset coach" UK',
  '"book a session" coach London site:.co.uk',
  '"I help women" coach UK',
  '"I help men" coach UK',
  // UK — health & career
  '"book a call" "health coach" UK',
  '"I help" "career coach" UK site:.co.uk',
  '"I help" "performance coach" UK',
  '"book a call" "career consultant" London',
  '"discovery call" "NLP coach" UK',
  // US — business & executive
  '"work with me" "business coach" USA site:.com',
  '"book a discovery call" "business coach" "United States"',
  '"I help" "business coach" "New York" site:.com',
  '"free consultation" "executive coach" USA',
  '"book a call" consultant USA site:.com',
  '"my clients" coach "Los Angeles" site:.com',
  '"I help entrepreneurs" USA site:.com',
  '"discovery call" "leadership coach" USA',
  '"work with me" consultant "United States" site:.com',
  // US — life, mindset & wellness
  '"work with me" "life coach" USA site:.com',
  '"work with me" "mindset coach" USA',
  '"book a session" coach "United States"',
  '"I help women" coach USA',
  '"I help men" coach USA',
  // US — health & career
  '"book a call" "health coach" USA',
  '"I help" "career coach" USA site:.com',
  '"I help" "performance coach" USA',
  '"book a call" "career consultant" "New York"',
  '"discovery call" "NLP coach" USA',
  '"work with me" "business coach" Chicago',
  '"I help" "executive coach" "San Francisco"',
];

const EMAIL_REGEX = /[\w.+\-]+@[\w\-]+\.[a-z]{2,}/gi;

const BLOCKED_DOMAINS = /linkedin|instagram|facebook|twitter|reddit|yelp|tripadvisor|yellowpages|clutch|upwork|trustpilot|google\.com|youtube|bark\.com|thumbtack|directory|coaches\.com|coachfederation|icf\.org|coachtrainingedu|findacoach|psychologytoday|therapist|counsellor|counselor|noomii|coach\.me/i;

const BLOCKED_PREFIXES = ['enroll', 'info', 'hello', 'contact', 'admin', 'support', 'team', 'noreply', 'no-reply', 'example', 'test', 'enquiries', 'enquiry', 'mail', 'office', 'reception', 'booking', 'bookings', 'sales'];

const FILE_EXTENSION_REGEX = /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|css|js|woff|ttf)$/i;

const PERSONAL_SIGNALS = /\b(I help|I work with|my clients|work with me|book a call|discovery call|I\'m a|I am a|I\'ve helped|I have helped|my approach|my coaching|my story|about me)\b/i;

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
  root.find('h1').each((_, el) => $(el).replaceWith(`\n# ${$(el).text().trim()}\n`));
  root.find('h2').each((_, el) => $(el).replaceWith(`\n## ${$(el).text().trim()}\n`));
  root.find('h3, h4').each((_, el) => $(el).replaceWith(`\n### ${$(el).text().trim()}\n`));
  root.find('p, li').each((_, el) => $(el).after('\n'));
  return root.text().replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function extractEmails(text) {
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.map(e => e.toLowerCase()))].filter(e => {
    if (FILE_EXTENSION_REGEX.test(e)) return false;
    if (BLOCKED_PREFIXES.some(p => e.startsWith(p + '@'))) return false;
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

  for (const query of shuffled) {
    if (found.length >= MAX_NEW_LEADS) break;
    console.log(`  Searching: "${query}"`);

    let urls;
    try {
      urls = await duckSearch(query);
      await new Promise(r => setTimeout(r, 2000)); // avoid rate limiting
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
          emails.push(...extractEmails(html));
        }
        if (emails.length) break;
      }

      emails = [...new Set(emails)].filter(e => !existing.has(e));
      if (!emails.length) continue;

      if (!PERSONAL_SIGNALS.test(text)) {
        console.log(`  Skipped (no personal signals): ${url}`);
        continue;
      }

      const email = emails[0];
      const name = extractName(text);
      const company = extractCompany(url);

      const row = new Array(21).fill('');
      row[COL.NAME] = name;
      row[COL.COMPANY] = company;
      row[COL.WEBSITE] = url;
      row[COL.EMAIL] = email;
      row[COL.NICHE] = query;
      row[COL.SOURCE] = query;
      row[COL.STATUS] = STATUS.NEW;
      row[COL.DATE_ADDED] = today();

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
