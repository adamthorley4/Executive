import fetch from 'node-fetch';
import { FIRECRAWL_API_KEY, COL, STATUS } from './config.js';
import { getLeadsByStatus, updateRowFields } from './sheets.js';

const BLOCKED_DOMAINS = /linkedin|instagram|facebook|twitter|reddit|yelp|tripadvisor|yellowpages|clutch|upwork|youtube|bark\.com|directory|coachfederation|icf\.org|psychologytoday|therapist|justdial|sulekha|pages\.com|indiamart|thomasnet|manta\.com|hotfrog|bizify|cylex|yell\.com|yelp\.com/i;
const BLOCKED_EXTENSIONS = /\.(pdf|docx?|xlsx?|pptx?|zip|png|jpg|jpeg|gif|svg)$/i;

async function firecrawlSearch(query) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit: 5 }),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || []).map(r => r.url).filter(Boolean);
}

async function scrape(url) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.markdown || null;
}

function cleanMarkdown(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
    // invalid URL
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
  // Fallback: find the first substantial paragraph
  const paras = markdown.split('\n\n').filter(p => p.trim().length > 60 && !p.startsWith('#'));
  return paras[0]?.trim().slice(0, 300) || '';
}

// Search for the person's personal website — searches their name + niche
async function findPersonalWebsite(name, headline) {
  // Build a search query that targets their personal site, not social profiles
  const nicheWord = headline.split(/\s+/).find(w => /coach|consult|advisor|mentor/i.test(w)) || 'coach';
  const query = `"${name}" "${nicheWord}" Dubai site:.com`;

  let urls;
  try {
    urls = await firecrawlSearch(query);
  } catch {
    return null;
  }

  for (const url of urls) {
    if (BLOCKED_DOMAINS.test(url)) continue;
    if (BLOCKED_EXTENSIONS.test(url)) continue;
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      if (/wordpress\.com|blogspot|medium\.com|substack\.com|rackcdn\.com|amazonaws\.com|cloudfront\.net/.test(hostname)) continue;
      return url;
    } catch {
      continue;
    }
  }
  return null;
}

export async function enrichLeads() {
  console.log('Step 2: Enriching leads...');
  const leads = await getLeadsByStatus(STATUS.NEW);

  if (!leads.length) {
    console.log('  No leads to enrich.');
    return;
  }

  for (const lead of leads) {
    const name = lead.data[COL.NAME] || '';
    const headline = lead.data[COL.HEADLINE] || '';
    console.log(`  Enriching: ${name} (${headline})`);

    try {
      // Find their personal website via search
      const websiteUrl = await findPersonalWebsite(name, headline);

      let summary = '';
      let services = '';
      let about = '';

      if (websiteUrl) {
        console.log(`    Found website: ${websiteUrl}`);
        try {
          const homeUrl = (() => {
            const u = new URL(websiteUrl);
            return `${u.protocol}//${u.hostname}`;
          })();

          const homeContent = await scrape(homeUrl);
          if (homeContent) {
            const internalLinks = findInternalLinks(homeContent, homeUrl);
            const subPages = internalLinks
              .filter(l => /about|services|work.with|programs|offerings/i.test(l.text))
              .slice(0, 2)
              .map(l => l.url);
            const aboutUrl = `${new URL(homeUrl).origin}/about`;
            const targetPages = [...new Set([aboutUrl, ...subPages])];

            let combined = cleanMarkdown(homeContent);
            for (const pageUrl of targetPages) {
              const content = await scrape(pageUrl);
              if (content) combined += '\n' + cleanMarkdown(content);
            }

            services = extractSection(combined, ['services', 'work with me', 'programs', 'offerings', 'what i offer']);
            about = extractAboutSnippet(combined);
            summary = about.slice(0, 200) || services.slice(0, 200);
          }
        } catch (err) {
          console.log(`    Website scrape failed: ${err.message}`);
        }
      } else {
        console.log(`    No personal website found — using LinkedIn headline only`);
        // Use headline as minimal summary so we can still generate a message
        summary = headline;
      }

      await updateRowFields(lead.rowNumber, {
        [COL.WEBSITE]: websiteUrl || '',
        [COL.SUMMARY]: summary,
        [COL.SERVICES]: services,
        [COL.ABOUT]: about,
        [COL.STATUS]: STATUS.ENRICHED,
      });

      console.log(`    Done: ${name}`);
    } catch (err) {
      console.error(`    Failed for ${name}:`, err.message);
    }
  }

  console.log('Step 2 done.');
}

if (process.argv[1].endsWith('step2-enrich.js')) {
  enrichLeads().catch(console.error);
}
