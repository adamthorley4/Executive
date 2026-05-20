import fetch from 'node-fetch';
import { FIRECRAWL_API_KEY, COL, STATUS, WEB_STATUS } from './config.js';
import { getLeadsByStatus, updateRowFields } from './sheets.js';

const EMAIL_REGEX = /[\w.+\-]+@[\w\-]+\.[a-z]{2,}/gi;
const FILE_EXT_REGEX = /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|css|js|woff|ttf)$/i;
const BLOCKED_EMAIL_PREFIXES = ['noreply', 'no-reply', 'example', 'test', 'webmaster', 'postmaster'];

// Social media and major portals — not company pages
const SOCIAL_URL = /^https?:\/\/(www\.)?(facebook|instagram|twitter|x|linkedin|youtube|tiktok)\./i;

async function scrape(url, includeHtml = false) {
  const formats = includeHtml ? ['markdown', 'html'] : ['markdown'];
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats, onlyMainContent: false }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return {
    markdown: json.data?.markdown || '',
    html: json.data?.html || '',
  };
}

function scoreWebsite(url, markdown, html) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Free builder: subdomain giveaways
    if (/\.wixsite\.com$|\.wix\.com$/.test(hostname)) return { status: WEB_STATUS.FREE_BUILDER, notes: 'Wix free subdomain' };
    if (/\.weebly\.com$|\.weeblysite\.com$/.test(hostname)) return { status: WEB_STATUS.FREE_BUILDER, notes: 'Weebly subdomain' };
    if (/\.carrd\.co$/.test(hostname)) return { status: WEB_STATUS.FREE_BUILDER, notes: 'Carrd subdomain' };
    if (/\.godaddysites\.com$/.test(hostname)) return { status: WEB_STATUS.FREE_BUILDER, notes: 'GoDaddy free site' };
    if (/\.sites\.google\.com$/.test(hostname)) return { status: WEB_STATUS.FREE_BUILDER, notes: 'Google Sites' };
    if (/\.squarespace\.com$/.test(hostname)) return { status: WEB_STATUS.FREE_BUILDER, notes: 'Squarespace subdomain' };
  } catch {
    // Invalid URL
  }

  // Free builder: HTML body fingerprints (Firecrawl returns body only, not <head>)
  if (html.includes('data-mesh-id') || /powered\s+by\s+wix/i.test(html) || html.includes('wix-thunderbolt')) {
    return { status: WEB_STATUS.FREE_BUILDER, notes: 'Wix site (custom domain)' };
  }
  if (/powered\s+by\s+weebly/i.test(html) || html.includes('weebly-footer')) {
    return { status: WEB_STATUS.FREE_BUILDER, notes: 'Weebly site (custom domain)' };
  }
  if (/powered\s+by\s+carrd/i.test(html) || html.includes('carrd-site')) {
    return { status: WEB_STATUS.FREE_BUILDER, notes: 'Carrd site' };
  }

  // Outdated: copyright year before 2021 — check both markdown (footer text) and html
  const copyrightMatch = markdown.match(/©\s*(?:copyright\s*)?(\d{4})/i) || html.match(/©\s*(?:copyright\s*)?(\d{4})/i);
  if (copyrightMatch) {
    const year = parseInt(copyrightMatch[1], 10);
    if (year < 2021 && year > 2000) {
      return { status: WEB_STATUS.OUTDATED, notes: `© ${year} in footer` };
    }
  }

  // Poor quality: under construction / placeholder
  if (/under\s+construction|coming\s+soon|lorem\s+ipsum/i.test(markdown)) {
    return { status: WEB_STATUS.POOR, notes: 'Under construction or placeholder content' };
  }

  // Poor quality: essentially empty page (broken or parked domain)
  if (markdown.length < 150) {
    return { status: WEB_STATUS.POOR, notes: 'Minimal content — likely parked domain' };
  }

  return { status: WEB_STATUS.GOOD, notes: '' };
}

function extractEmails(text) {
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.map(e => e.toLowerCase()))].filter(e => {
    if (FILE_EXT_REGEX.test(e)) return false;
    if (BLOCKED_EMAIL_PREFIXES.some(p => e.startsWith(p + '@'))) return false;
    return true;
  });
}

async function findEmail(url, markdown) {
  // Try from homepage content first
  let emails = extractEmails(markdown);
  if (emails.length) return emails[0];

  // Try /contact page
  try {
    const origin = new URL(url).origin;
    const contact = await scrape(`${origin}/contact`);
    if (contact) {
      emails = extractEmails(contact.markdown);
      if (emails.length) return emails[0];
    }
    // Try /about page
    const about = await scrape(`${origin}/about`);
    if (about) {
      emails = extractEmails(about.markdown);
      if (emails.length) return emails[0];
    }
  } catch {
    // Invalid URL
  }

  return '';
}

export async function scoreWebsites() {
  console.log('Step 2: Scoring websites...');
  const leads = await getLeadsByStatus(STATUS.NEW);

  if (!leads.length) {
    console.log('  No new leads to score.');
    return;
  }

  for (const lead of leads) {
    const url = lead.data[COL.WEBSITE];
    const existingEmail = lead.data[COL.EMAIL] || '';
    const company = lead.data[COL.COMPANY] || url || 'Unknown';
    console.log(`  Processing: ${company}`);

    try {
      // No website listed in directory — already know it's a no-website lead
      if (!url || SOCIAL_URL.test(url)) {
        // If we already have an email from the directory listing, move to Scored immediately
        if (existingEmail) {
          await updateRowFields(lead.rowNumber, {
            [COL.WEB_STATUS]: WEB_STATUS.NONE,
            [COL.WEB_NOTES]: 'No website found in directory listing',
            [COL.STATUS]: STATUS.SCORED,
          });
          console.log(`    Scored: None (no website) — email already captured`);
        } else {
          await updateRowFields(lead.rowNumber, {
            [COL.WEB_STATUS]: WEB_STATUS.NONE,
            [COL.WEB_NOTES]: 'No website found in directory listing',
            [COL.STATUS]: STATUS.SKIPPED,
            [COL.NOTES]: 'No email found',
          });
          console.log(`    Skipped: no website and no email`);
        }
        continue;
      }

      const result = await scrape(url, true);

      if (!result || (!result.markdown && !result.html)) {
        // Page failed to load — treat as no website if we have an email
        if (existingEmail) {
          await updateRowFields(lead.rowNumber, {
            [COL.WEB_STATUS]: WEB_STATUS.NONE,
            [COL.WEB_NOTES]: 'Could not load page',
            [COL.STATUS]: STATUS.SCORED,
          });
          console.log(`    Scored: None (unscrapable) — email already captured`);
        } else {
          await updateRowFields(lead.rowNumber, {
            [COL.WEB_STATUS]: WEB_STATUS.NONE,
            [COL.WEB_NOTES]: 'Could not load page',
            [COL.STATUS]: STATUS.SKIPPED,
          });
          console.log(`    Skipped: page unscrapable, no email`);
        }
        continue;
      }

      const { markdown, html } = result;
      const { status: webStatus, notes: webNotes } = scoreWebsite(url, markdown, html);

      // Skip companies with good websites
      if (webStatus === WEB_STATUS.GOOD) {
        await updateRowFields(lead.rowNumber, {
          [COL.WEB_STATUS]: webStatus,
          [COL.STATUS]: STATUS.SKIPPED,
        });
        console.log(`    Skipped: website looks good`);
        continue;
      }

      // Find email — use existing one from directory listing, or scrape from site
      const email = existingEmail || await findEmail(url, markdown);
      if (!email) {
        await updateRowFields(lead.rowNumber, {
          [COL.WEB_STATUS]: webStatus,
          [COL.WEB_NOTES]: webNotes,
          [COL.STATUS]: STATUS.SKIPPED,
          [COL.NOTES]: 'No email found',
        });
        console.log(`    Skipped: no email found (${webStatus})`);
        continue;
      }

      await updateRowFields(lead.rowNumber, {
        [COL.EMAIL]: email,
        [COL.WEB_STATUS]: webStatus,
        [COL.WEB_NOTES]: webNotes,
        [COL.STATUS]: STATUS.SCORED,
      });
      console.log(`    Scored: ${webStatus} — ${email}`);
    } catch (err) {
      console.error(`    Failed for ${company}:`, err.message);
    }
  }

  console.log('Step 2 done.');
}

if (process.argv[1].endsWith('step2-score-websites.js')) {
  scoreWebsites().catch(console.error);
}
