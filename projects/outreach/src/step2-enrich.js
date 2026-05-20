import fetch from 'node-fetch';
import { FIRECRAWL_API_KEY, COL, STATUS } from './config.js';
import { getLeadsByStatus, updateRowFields } from './sheets.js';

function toHomepage(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return url;
  }
}

function cleanMarkdown(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')   // strip images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // unwrap links to just text
    .replace(/\n{3,}/g, '\n\n')              // collapse excess blank lines
    .trim();
}

async function scrape(url) {
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

function findInternalLinks(markdown, baseUrl) {
  const links = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  try {
    const origin = new URL(baseUrl).origin;
    while ((match = linkRegex.exec(markdown)) !== null) {
      const href = match[2];
      if (href.startsWith('/') || href.startsWith(origin)) {
        const full = href.startsWith('/') ? origin + href : href;
        links.push({ text: match[1].toLowerCase(), url: full });
      }
    }
  } catch {
    // Invalid URL
  }
  return links;
}

function extractSection(markdown, headings) {
  const lines = markdown.split('\n');
  let inSection = false;
  const collected = [];

  for (const line of lines) {
    const isHeading = /^#{1,3}\s+(.+)/.exec(line);
    if (isHeading) {
      const text = isHeading[1].toLowerCase();
      inSection = headings.some(h => text.includes(h));
      continue;
    }
    if (inSection && line.trim()) {
      collected.push(line.trim());
      if (collected.length >= 5) break;
    }
  }
  return collected.join(' ').trim();
}

function extractPainPoints(markdown) {
  const triggers = ['struggle', 'overwhelm', 'stuck', 'frustrated', 'burnout', 'exhausted', 'drowning', 'spinning'];
  const sentences = markdown.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 20);
  const hits = sentences.filter(s => triggers.some(t => s.toLowerCase().includes(t)));
  return hits.slice(0, 3).join('. ').trim();
}

function extractBlogPosts(markdown, baseUrl) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const posts = [];
  let match;
  try {
    const origin = new URL(baseUrl).origin;
    while ((match = linkRegex.exec(markdown)) !== null) {
      const href = match[2];
      if (/\/blog\/|\/articles?\/|\/posts?\//i.test(href) && match[1].length > 10) {
        posts.push(match[1].trim());
      }
    }
  } catch {
    // Invalid URL
  }
  return [...new Set(posts)].slice(0, 5).join(', ');
}

function extractAboutSnippet(markdown) {
  const lines = markdown.split('\n');
  let inAbout = false;
  for (const line of lines) {
    const isHeading = /^#{1,3}\s+(.+)/.exec(line);
    if (isHeading && /about/i.test(isHeading[1])) {
      inAbout = true;
      continue;
    }
    if (inAbout && line.trim().length > 40) {
      return line.trim().slice(0, 300);
    }
  }
  return '';
}

// Words that look capitalised but are never first names
const NOT_A_NAME = new Set(['Business', 'Growth', 'Catalyst', 'Coach', 'Coaching', 'Consulting', 'Services', 'Solutions', 'Management', 'Leadership', 'Executive', 'Corporate', 'Professional', 'Global', 'Digital', 'Strategic', 'Creative', 'The', 'This', 'Your', 'Our', 'My', 'We', 'Join', 'Learn', 'Discover', 'Explore', 'Find', 'Get', 'Start', 'Build', 'Transform', 'Elevate', 'Unlock', 'Master', 'Achieve']);

function extractName(markdown) {
  const patterns = [
    // "Hi, I'm Sarah" / "I'm Sarah"
    /(?:Hi,?\s+)?I(?:'m| am)\s+([A-Z][a-z]{2,})\b/,
    // "Meet Sarah" / "Meet Sarah Jones"
    /\bMeet\s+([A-Z][a-z]{2,})\b/,
    // "My name is Sarah"
    /My name is\s+([A-Z][a-z]{2,})\b/,
    // "About Sarah Jones" as a heading
    /^#{1,3}\s+About\s+([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}\s*$/m,
    // "Sarah Jones's journey..." / "Sarah Jones' work..." — possessive
    /\b([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}['']s\s+/,
    // "Sarah Jones is a coach/consultant/founder/mentor"
    /^([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}\s+is\s+a(?:n)?\s+(?:certified\s+)?(?:business\s+|executive\s+|life\s+|leadership\s+)?(?:coach|consultant|founder|mentor|advisor|speaker|trainer)\b/m,
    // "Sarah has..." / "Sarah is..." as a lone first name subject (at least 4 chars to avoid false positives)
    /^([A-Z][a-z]{3,})\s+(?:has|is)\s+(?:made|been|worked|dedicated|committed|helped)/m,
    // © 2024 Sarah Jones
    /©\s*(?:\d{4}\s*)?([A-Z][a-z]{2,})\s+[A-Z][a-z]{2,}/,
  ];
  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match) {
      const name = match[1];
      if (!NOT_A_NAME.has(name)) return name;
    }
  }
  return '';
}

function buildSummary(services, about) {
  if (about) return about.slice(0, 200);
  if (services) return services.slice(0, 200);
  return '';
}

export async function enrichLeads() {
  console.log('Step 2: Enriching leads...');
  const leads = await getLeadsByStatus(STATUS.NEW);
  const withWebsite = leads.filter(r => r.data[COL.WEBSITE]);

  if (!withWebsite.length) {
    console.log('  No leads to enrich.');
    return;
  }

  for (const lead of withWebsite) {
    const url = lead.data[COL.WEBSITE];
    const name = lead.data[COL.NAME] || '?';
    console.log(`  Enriching: ${url}`);

    try {
      // Always start from the homepage, not the specific page found by step 1
      const homepageUrl = toHomepage(url);
      const homeContent = await scrape(homepageUrl);
      if (!homeContent) {
        console.log(`    Could not scrape ${url}`);
        continue;
      }

      // Find relevant sub-pages to scrape
      const internalLinks = findInternalLinks(homeContent, homepageUrl);
      const linkedPages = internalLinks
        .filter(l => /about|services|work.with|programs|offerings/i.test(l.text))
        .slice(0, 2)
        .map(l => l.url);
      // Always try /about explicitly — names are almost always there
      const aboutUrl = `${new URL(homepageUrl).origin}/about`;
      const targetPages = [...new Set([aboutUrl, ...linkedPages])];

      let combined = cleanMarkdown(homeContent);
      for (const pageUrl of targetPages) {
        const content = await scrape(pageUrl);
        if (content) combined += '\n' + cleanMarkdown(content);
      }

      const services = extractSection(combined, ['services', 'work with me', 'programs', 'offerings', 'what i offer', 'what we offer']);
      const painPoints = extractPainPoints(combined);
      const blogPosts = extractBlogPosts(combined, url);
      const aboutSnippet = extractAboutSnippet(combined);
      const summary = buildSummary(services, aboutSnippet);

      const fields = {
        [COL.SUMMARY]: summary,
        [COL.SERVICES]: services,
        [COL.PAIN_POINTS]: painPoints,
        [COL.BLOG]: blogPosts,
        [COL.ABOUT]: aboutSnippet,
        [COL.STATUS]: STATUS.ENRICHED,
      };

      // Fill in name if it wasn't found during lead discovery
      if (!lead.data[COL.NAME]) {
        const name = extractName(combined);
        if (name) fields[COL.NAME] = name;
      }

      await updateRowFields(lead.rowNumber, fields);

      console.log(`    Done: ${name}`);
    } catch (err) {
      console.error(`    Failed to enrich ${url}:`, err.message);
    }
  }

  console.log('Step 2 done.');
}

if (process.argv[1].endsWith('step2-enrich.js')) {
  enrichLeads().catch(console.error);
}
