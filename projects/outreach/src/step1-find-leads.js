import fetch from 'node-fetch';
import { FIRECRAWL_API_KEY, COL, STATUS, MAX_NEW_LEADS } from './config.js';
import { appendLeads, getExistingEmails, today } from './sheets.js';

// Intent-based queries that surface individual coach/consultant websites,
// not directories or training schools
const SEARCH_QUERIES = [
  // Dubai — business & executive
  '"work with me" "business coach" Dubai',
  '"book a discovery call" coach Dubai',
  '"I help" "business coach" Dubai',
  '"free consultation" "executive coach" Dubai',
  '"book a call" consultant Dubai UAE',
  '"my clients" coach Dubai site:.com',
  '"I help entrepreneurs" Dubai',
  '"discovery call" "leadership coach" Dubai',
  '"work with me" consultant UAE site:.com',
  // Dubai — life, mindset & wellness
  '"work with me" "life coach" Dubai',
  '"work with me" "mindset coach" Dubai',
  '"work with me" "wellness coach" Dubai',
  '"book a session" coach Dubai',
  '"my approach" "life coach" Dubai',
  '"I help women" coach Dubai',
  '"I help men" coach Dubai',
  // Dubai — health & fitness
  '"book a call" "health coach" Dubai UAE',
  '"free consultation" "fitness coach" Dubai site:.com',
  '"I help" "nutrition coach" Dubai',
  '"work with me" "personal trainer" Dubai site:.com',
  // Dubai — career & performance
  '"I help" "career coach" Dubai',
  '"I help" "performance coach" UAE',
  '"my clients" "sales coach" Dubai UAE',
  '"book a call" "career consultant" Dubai',
  // Dubai — relationships & NLP
  '"book a call" "relationship coach" UAE',
  '"discovery call" "NLP coach" Dubai',
  '"work with me" "dating coach" Dubai',
  // Abu Dhabi
  '"work with me" "business coach" "Abu Dhabi"',
  '"book a call" coach "Abu Dhabi"',
  '"I help" consultant "Abu Dhabi"',
  '"free consultation" "life coach" "Abu Dhabi"',
  '"discovery call" "executive coach" "Abu Dhabi"',
  // Sharjah & general UAE
  '"work with me" coach Sharjah UAE',
  '"book a call" "business coach" UAE site:.com',
  '"I help" "wellness coach" UAE',
  '"my clients" consultant UAE site:.com',
  '"free consultation" coach UAE site:.com',
];

const EMAIL_REGEX = /[\w.+\-]+@[\w\-]+\.[a-z]{2,}/gi;

// Domains and patterns that indicate directories, schools, or aggregators
const BLOCKED_DOMAINS = /linkedin|instagram|facebook|twitter|reddit|yelp|tripadvisor|yellowpages|clutch|upwork|trustpilot|google\.com|youtube|bark\.com|thumbtack|directory|coaches\.com|coachfederation|icf\.org|coachtrainingedu|findacoach|psychology today|therapist|counsellor|counselor|noomii|coach\.me/i;

// Generic inbox prefixes that mean it's an org, not a person
const BLOCKED_PREFIXES = ['enroll', 'info', 'hello', 'contact', 'admin', 'support', 'team', 'noreply', 'no-reply', 'example', 'test', 'enquiries', 'enquiry', 'mail', 'office', 'reception', 'booking', 'bookings', 'sales'];

// File extension false-positives from image paths
const FILE_EXTENSION_REGEX = /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|css|js|woff|ttf)$/i;

// Signals that a page belongs to an individual (not a company or school)
const PERSONAL_SIGNALS = /\b(I help|I work with|my clients|work with me|book a call|discovery call|I\'m a|I am a|I\'ve helped|I have helped|my approach|my coaching|my story|about me)\b/i;

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
  return (json.data || []).map(r => r.url).filter(Boolean);
}

async function firecrawlScrape(url) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.markdown || null;
}

function extractEmails(text) {
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.map(e => e.toLowerCase()))].filter(e => {
    if (FILE_EXTENSION_REGEX.test(e)) return false;
    if (BLOCKED_PREFIXES.some(p => e.startsWith(p + '@'))) return false;
    return true;
  });
}

function extractName(markdown) {
  // Only extract if the pattern makes it unambiguous this is a person's first name
  const patterns = [
    /(?:I'm|I am|Hi,?\s+I'm|Hi,?\s+I am)\s+([A-Z][a-z]{2,})\b/,
    /My name is\s+([A-Z][a-z]{2,})\b/,
    /meet\s+([A-Z][a-z]{2,}),/,
  ];
  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match) return match[1];
  }
  return ''; // blank = email sends "Hi there" — safer than guessing
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
  const usedQueries = new Set();

  // Shuffle queries so we don't hit the same ones every day
  const shuffled = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);

  for (const query of shuffled) {
    if (found.length >= MAX_NEW_LEADS) break;
    usedQueries.add(query);
    console.log(`  Searching: "${query}"`);

    let urls;
    try {
      urls = await firecrawlSearch(query);
    } catch (err) {
      console.error(`  Search failed for "${query}":`, err.message);
      continue;
    }

    for (const url of urls) {
      if (found.length >= MAX_NEW_LEADS) break;
      if (BLOCKED_DOMAINS.test(url)) continue;

      const pagesToTry = [url, ...tryFallbackUrls(url)];
      let emails = [];
      let markdown = '';

      for (const pageUrl of pagesToTry) {
        try {
          const content = await firecrawlScrape(pageUrl);
          if (content) {
            markdown = markdown + '\n' + content;
            emails.push(...extractEmails(content));
          }
        } catch {
          // Page scrape failed — move on
        }
        if (emails.length) break;
      }

      emails = [...new Set(emails)].filter(e => !existing.has(e));
      if (!emails.length) continue;

      // Require personal signals in the content — skip orgs and schools
      if (!PERSONAL_SIGNALS.test(markdown)) {
        console.log(`  Skipped (no personal signals): ${url}`);
        continue;
      }

      const email = emails[0];
      const name = extractName(markdown);
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

// Run directly
if (process.argv[1].endsWith('step1-find-leads.js')) {
  findLeads().catch(console.error);
}
