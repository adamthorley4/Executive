import { google } from 'googleapis';
import { SPREADSHEET_ID, SERVICE_ACCOUNT_EMAIL, SERVICE_ACCOUNT_PRIVATE_KEY, SHEET_TAB, COL } from './config.js';

function auth() {
  return new google.auth.JWT(
    SERVICE_ACCOUNT_EMAIL,
    null,
    SERVICE_ACCOUNT_PRIVATE_KEY,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

function sheets() {
  return google.sheets({ version: 'v4', auth: auth() });
}

function colLetter(colIndex) {
  return String.fromCharCode(65 + colIndex);
}

export async function getAllRows() {
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:R`,
  });
  const rows = res.data.values || [];
  return rows.slice(1).map((row, i) => ({
    rowNumber: i + 2,
    data: row,
  }));
}

export async function getLeadsByStatus(status) {
  const all = await getAllRows();
  return all.filter(r => (r.data[COL.STATUS] || '') === status);
}

export async function getExistingLinkedInUrls() {
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!C:C`,
  });
  const vals = res.data.values || [];
  return new Set(vals.flat().map(u => normaliseUrl(u)).filter(Boolean));
}

export async function appendLeads(leads) {
  if (!leads.length) return;
  await sheets().spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:R`,
    valueInputOption: 'RAW',
    requestBody: { values: leads },
  });
  console.log(`  Appended ${leads.length} new leads`);
}

export async function updateRowFields(rowNumber, fieldMap) {
  const entries = Object.entries(fieldMap).map(([col, val]) => ({
    range: `${SHEET_TAB}!${colLetter(parseInt(col))}${rowNumber}`,
    values: [[val]],
  }));
  await sheets().spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: entries,
    },
  });
}

export function normaliseUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url.trim());
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}
