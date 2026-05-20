import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '../../../.env');
  try {
    const contents = readFileSync(envPath, 'utf8');
    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // Running in CI — env vars injected via secrets
  }
}

loadEnv();

function require_env(key) {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const FIRECRAWL_API_KEY = require_env('FIRECRAWL_API_KEY');
export const ANTHROPIC_API_KEY = require_env('ANTHROPIC_API_KEY');

export const SPREADSHEET_ID = require_env('GOOGLE_SHEETS_SPREADSHEET_ID');
export const SERVICE_ACCOUNT_EMAIL = require_env('GOOGLE_SERVICE_ACCOUNT_EMAIL');
export const SERVICE_ACCOUNT_PRIVATE_KEY = require_env('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n');

export const SHEET_TAB = 'LinkedIn';
export const MAX_NEW_LEADS = parseInt(process.env.MAX_NEW_LEADS || '10', 10);

// Column indices (0-based)
export const COL = {
  NAME: 0,           // A
  HEADLINE: 1,       // B
  LINKEDIN_URL: 2,   // C
  COMPANY: 3,        // D
  WEBSITE: 4,        // E
  SOURCE: 5,         // F
  SUMMARY: 6,        // G
  SERVICES: 7,       // H
  ABOUT: 8,          // I
  CONN_NOTE: 9,      // J — connection request note (300 chars)
  FOLLOWUP_DM: 10,   // K — follow-up DM after acceptance
  NOTE_SENT: 11,     // L — date Adam sent connection note (manual)
  CONNECTED: 12,     // M — date they accepted (manual)
  DM_SENT: 13,       // N — date Adam sent follow-up DM (manual)
  REPLIED: 14,       // O — Y/N (manual)
  REPLY_DATE: 15,    // P — date of reply (manual)
  STATUS: 16,        // Q
  NOTES: 17,         // R — Adam's manual notes
};

export const STATUS = {
  NEW: 'New',
  ENRICHED: 'Enriched',
  DRAFT_READY: 'Draft Ready',
  NOTE_SENT: 'Note Sent',
  CONNECTED: 'Connected',
  DM_SENT: 'DM Sent',
  REPLIED: 'Replied',
  DONE: 'Done',
};
