import fetch from 'node-fetch';
import { load } from 'cheerio';
import { COL, STATUS } from './config.js';
import { getLeadsByStatus, updateRowFields } from './sheets.js';

const BLOCKED_DOMAINS = /linkedin|instagram|facebook|twitter|reddit|yelp|tripadvisor|yellowpages|clutch|upwork|youtube|bark\.com|directory|coachfederation|icf\.org|psychologytoday|therapist|justdial|sulekha|pages\.com|indiamart|thomasnet|manta\.com|hotfrog|bizify|cylex|yell\.com|yelp\.com/i;
const BLOCKED_EXTENSIONS = /\.(pdf|docx?|xlsx?|pptx?|zip|png|jpg|jpeg|gif|svg)$/i;

async function duckSearch(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) return [];
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
  return urls.slice(0, 5);
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

function findInternalLinks(html, baseUrl) {
  const $ = load(html);
  const links = [];
  try {
    const origin = new URL(baseUrl).origin;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase().trim();
      if ((href.startsWith('/') || href.startsWith(origin)) && !href.includes('#')) {
        const full = href.startsWith('/') ? origin + href : href;
        links.push({ text, url: full });
      }
    });
  } catch {
    // Invalid URL
  }
  return links;
}

function extractSection(text, headings) {
  const lines = text.split('\n');
  let inSection = false;
  const collected = [];
  for (const line of lines) {
    const isHeading = /^#{1,3}\s+(.+)/.exec(line);
    if (isHeading) {
      const heading = isHeading[1].toLowerCase();
      inSection = headings.some(h => heading.includes(h));
      continue;
    }
    if (inSection && line.trim()) {
      collected.push(line.trim());
      if (collected.length >= 5) break;
    }
  }
  return collected.join(' ').trim();
}

function extractAboutSnippet(text) {
  const lines = text.split('\n');
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
  const paras = text.split('\n\n').filter(p => p.trim().length > 60 && !p.startsWith('#'));
  return paras[0]?.trim().slice(0, 300) || '';
}

async function findPersonalWebsite(name, headline) {
  const nicheWord = headline.split(/\s+/).find(w => /coach|consult|advisor|mentor/i.test(w)) || 'coach';
  const query = `"${name}" "${nicheWord}" site:.com`;

  let urls;
  try {
    urls = await duckSearch(query);
    await new Promise(r => setTimeout(r, 2000));
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

          const homeHtml = await fetchHtml(homeUrl);
          if (homeHtml) {
            const internalLinks = findInternalLinks(homeHtml, homeUrl);
            const subPages = internalLinks
              .filter(l => /about|services|work.with|programs|offerings/i.test(l.text))
              .slice(0, 2)
              .map(l => l.url);
            const aboutUrl = `${new URL(homeUrl).origin}/about`;
            const targetPages = [...new Set([aboutUrl, ...subPages])];

            let combinedText = htmlToText(homeHtml);
            for (const pageUrl of targetPages) {
              const html = await fetchHtml(pageUrl);
              if (html) combinedText += '\n' + htmlToText(html);
            }

            services = extractSection(combinedText, ['services', 'work with me', 'programs', 'offerings', 'what i offer']);
            about = extractAboutSnippet(combinedText);
            summary = about.slice(0, 200) || services.slice(0, 200);
          }
        } catch (err) {
          console.log(`    Website scrape failed: ${err.message}`);
        }
      } else {
        console.log(`    No personal website found — using LinkedIn headline only`);
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
