import { google } from 'googleapis';
import https from 'https';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const today = () => new Date().toISOString().slice(0, 10);

function sheetsClient() {
  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ]);
  return google.sheets({ version: 'v4', auth });
}

async function getRows(tab) {
  const res = await sheetsClient().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A:Z`,
  });
  return (res.data.values || []).slice(1);
}

function countByCol(rows, colIndex) {
  const t = today();
  return rows.filter(r => (r[colIndex] || '') === t).length;
}

async function sendTelegram(text) {
  const data = JSON.stringify({ chat_id: CHAT_ID, text });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // AI Email Outreach (AI Leads tab)
  // DATE_ADDED=20, E1_DATE=12, E2_DATE=13, E3_DATE=14
  const aiRows = await getRows('AI Leads');
  const aiLeads = countByCol(aiRows, 20);
  const aiE1    = countByCol(aiRows, 12);
  const aiE2    = countByCol(aiRows, 13);
  const aiE3    = countByCol(aiRows, 14);

  // Website Email Outreach (Website leads tab)
  // DATE_ADDED=16, E1_DATE=8, E2_DATE=9, E3_DATE=10
  const webRows = await getRows('Website leads');
  const webLeads = countByCol(webRows, 16);
  const webE1    = countByCol(webRows, 8);
  const webE2    = countByCol(webRows, 9);
  const webE3    = countByCol(webRows, 10);

  // LinkedIn (LinkedIn tab)
  // DATE_ADDED=18
  const liRows  = await getRows('LinkedIn');
  const liLeads = countByCol(liRows, 18);

  const totalEmails = aiE1 + aiE2 + aiE3 + webE1 + webE2 + webE3;
  const totalLeads  = aiLeads + webLeads + liLeads;

  const msg = [
    `Outreach Summary — ${dateStr}`,
    '',
    'AI Email Outreach',
    `  New leads found:       ${aiLeads}`,
    `  E1 sent:               ${aiE1}`,
    `  Follow-ups (E2 + E3):  ${aiE2 + aiE3}`,
    '',
    'Website Email Outreach',
    `  New leads found:       ${webLeads}`,
    `  E1 sent:               ${webE1}`,
    `  Follow-ups (E2 + E3):  ${webE2 + webE3}`,
    '',
    'LinkedIn',
    `  New profiles found:    ${liLeads}`,
    '',
    `Total emails sent today: ${totalEmails}`,
    `Total leads found today: ${totalLeads}`,
  ].join('\n');

  await sendTelegram(msg);
  console.log('Summary sent.');
  console.log(msg);
}

main().catch(err => {
  console.error('Summary failed:', err.message);
  process.exit(1);
});
