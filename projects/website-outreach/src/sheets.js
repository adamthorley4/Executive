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

// Returns all rows as arrays, skipping header row 1
export async function getAllRows() {
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:P`,
  });
  const rows = res.data.values || [];
  return rows.slice(1).map((row, i) => ({
    rowNumber: i + 2,
    data: row,
  }));
}

// Returns rows matching a given status
export async function getLeadsByStatus(status) {
  const all = await getAllRows();
  return all.filter(r => (r.data[COL.STATUS] || '') === status);
}

// Returns all existing website URLs as a Set for deduplication
export async function getExistingWebsites() {
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!B:B`,
  });
  const vals = res.data.values || [];
  return new Set(vals.flat().map(v => v.toLowerCase().trim()).filter(Boolean));
}

// Returns all existing emails as a Set (used for reply detection)
export async function getExistingEmails() {
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!C:C`,
  });
  const vals = res.data.values || [];
  return new Set(vals.flat().map(e => e.toLowerCase().trim()).filter(Boolean));
}

// Returns all existing company names as a Set for deduplication
async function getExistingCompanyNames() {
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:A`,
  });
  const vals = res.data.values || [];
  return new Set(vals.flat().map(n => n.toLowerCase().trim()).filter(Boolean));
}

// Appends new lead rows, deduplicating on website URL (primary) or company name (secondary)
export async function appendLeads(leads) {
  if (!leads.length) return;
  const [existingWebsites, existingNames] = await Promise.all([
    getExistingWebsites(),
    getExistingCompanyNames(),
  ]);

  const toAdd = leads.filter(l => {
    const url = (l[COL.WEBSITE] || '').toLowerCase().trim();
    const name = (l[COL.COMPANY] || '').toLowerCase().trim();
    if (url && existingWebsites.has(url)) return false;
    if (name && existingNames.has(name)) return false;
    return true;
  });
  if (!toAdd.length) {
    console.log('  No new leads to append (all already in sheet)');
    return;
  }
  await sheets().spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A:P`,
    valueInputOption: 'RAW',
    requestBody: { values: toAdd },
  });
  console.log(`  Appended ${toAdd.length} new leads`);
}

// Updates a single cell
export async function updateCell(rowNumber, colIndex, value) {
  const cell = `${SHEET_TAB}!${colLetter(colIndex)}${rowNumber}`;
  await sheets().spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: cell,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
}

// Updates multiple columns in a single row in one API call
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

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
