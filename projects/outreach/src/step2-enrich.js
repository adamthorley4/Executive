import fetch from 'node-fetch';
import { load } from 'cheerio';
import { COL, STATUS } from './config.js';
import { getLeadsByStatus, updateRowFields } from './sheets.js';
import { extractName } from './name-utils.js';

function toHomepage(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return url;
  }
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

function extractPainPoints(text) {
  const triggers = ['struggle', 'overwhelm', 'stuck', 'frustrated', 'burnout', 'exhausted', 'drowning', 'spinning'];
  const sentences = text.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 20);
  const hits = sentences.filter(s => triggers.some(t => s.toLowerCase().includes(t)));
  return hits.slice(0, 3).join('. ').trim();
}

function extractBlogPosts(html, baseUrl) {
  const $ = load(html);
  const posts = [];
  try {
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (/\/blog\/|\/articles?\/|\/posts?\//i.test(href) && text.length > 10) {
        posts.push(text);
      }
    });
  } catch {
    // Invalid URL
  }
  return [...new Set(posts)].slice(0, 5).join(', ');
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
  return '';
}

function detectPlatform(html) {
  if (/wix\.com|wixsite\.com|wixstatic/i.test(html)) return 'Wix';
  if (/squarespace\.com|sqsp\.net|squarespace-cdn/i.test(html)) return 'Squarespace';
  if (/shopify\.com|cdn\.shopify|myshopify/i.test(html)) return 'Shopify';
  if (/wp-content|wp-includes|wordpress/i.test(html)) return 'WordPress';
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
      const homepageUrl = toHomepage(url);
      const homeHtml = await fetchHtml(homepageUrl);
      if (!homeHtml) {
        console.log(`    Could not fetch ${url}`);
        continue;
      }

      const internalLinks = findInternalLinks(homeHtml, homepageUrl);
      const linkedPages = internalLinks
        .filter(l => /about|services|work.with|programs|offerings/i.test(l.text))
        .slice(0, 2)
        .map(l => l.url);
      const aboutUrl = `${new URL(homepageUrl).origin}/about`;
      const targetPages = [...new Set([aboutUrl, ...linkedPages])];

      let combinedText = htmlToText(homeHtml);
      let combinedHtml = homeHtml;

      for (const pageUrl of targetPages) {
        const html = await fetchHtml(pageUrl);
        if (html) {
          combinedText += '\n' + htmlToText(html);
          combinedHtml += html;
        }
      }

      const services = extractSection(combinedText, ['services', 'work with me', 'programs', 'offerings', 'what i offer', 'what we offer', 'what we do', 'our work', 'portfolio', 'collection', 'fleet']);
      const painPoints = extractPainPoints(combinedText);
      const blogPosts = extractBlogPosts(combinedHtml, url);
      const aboutSnippet = extractAboutSnippet(combinedText);
      const summary = buildSummary(services, aboutSnippet);
      const platform = detectPlatform(combinedHtml);

      const fields = {
        [COL.SUMMARY]: summary,
        [COL.SERVICES]: services,
        [COL.PAIN_POINTS]: painPoints,
        [COL.BLOG]: blogPosts,
        [COL.ABOUT]: aboutSnippet,
        [COL.NOTES]: platform ? `Platform: ${platform}` : '',
        [COL.STATUS]: STATUS.DRAFT_READY,
      };

      if (!lead.data[COL.NAME]) {
        const extracted = extractName(combinedText);
        if (extracted) fields[COL.NAME] = extracted;
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
