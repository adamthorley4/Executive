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

export const SMTP_HOST = require_env('SMTP_HOST');
export const SMTP_PORT = parseInt(require_env('SMTP_PORT'), 10);
export const SMTP_USER = require_env('SMTP_USER');
export const SMTP_PASS = require_env('SMTP_PASS');

export const IMAP_HOST = require_env('IMAP_HOST');
export const IMAP_PORT = parseInt(process.env.IMAP_PORT || '993', 10);
export const IMAP_USER = require_env('IMAP_USER');
export const IMAP_PASS = require_env('IMAP_PASS');

export const FROM_EMAIL = 'adam@adamthor.co.uk';
export const FROM_NAME = 'Adam';
export const BCC_EMAIL = 'adamthor.outreach@gmail.com';
export const SHEET_TAB = 'Website leads';
export const MAX_NEW_LEADS = parseInt(process.env.MAX_NEW_LEADS || '35', 10);
export const SEND_DELAY_MIN_MS = 120_000;  // 2 min
export const SEND_DELAY_MAX_MS = 240_000;  // 4 min

// Column indices (0-based), 16 columns A-P
export const COL = {
  COMPANY:    0,  // A
  WEBSITE:    1,  // B
  EMAIL:      2,  // C
  PHONE:      3,  // D
  SOURCE:     4,  // E
  WEB_STATUS: 5,  // F
  WEB_NOTES:  6,  // G
  OPENER:     7,  // H
  E1_DATE:    8,  // I
  E2_DATE:    9,  // J
  E3_DATE:    10, // K
  REPLY:      11, // L
  REPLY_DATE: 12, // M
  STATUS:     13, // N
  NOTES:      14, // O
  E1_MSG_ID:  15, // P
};

export const WEB_STATUS = {
  NONE:         'None',
  FREE_BUILDER: 'Free Builder',
  OUTDATED:     'Outdated',
  POOR:         'Poor Quality',
  GOOD:         'Good',
};

export const STATUS = {
  NEW:        'New',
  SCORED:     'Scored',
  SKIPPED:    'Skipped',
  DRAFT_READY:'Draft Ready',
  SENT_E1:    'Sent E1',
  SENT_E2:    'Sent E2',
  SENT_E3:    'Sent E3',
  REPLIED:    'Replied',
  DONE:       'Done',
};
