import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import {
  IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS,
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  FROM_EMAIL, FROM_NAME, BCC_EMAIL, COL, STATUS,
} from './config.js';
import { getAllRows, updateRowFields, today, daysSince } from './sheets.js';
import { buildEmail2, buildEmail3 } from './templates.js';

function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getReplyAddresses() {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: IMAP_USER, pass: IMAP_PASS },
    logger: false,
  });

  const replyEmails = new Set();

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const uids = await client.search({ since }, { uid: true });
      if (uids.length) {
        for await (const msg of client.fetch(uids, { envelope: true }, { uid: true })) {
          const from = msg.envelope?.from?.[0]?.address?.toLowerCase();
          if (from) replyEmails.add(from);
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error('  IMAP error:', err.message);
  }

  return replyEmails;
}

async function sendFollowUp(lead, emailNum, transport) {
  const email = lead.data[COL.EMAIL];
  const msgId = lead.data[COL.E1_MSG_ID] || '';
  const webStatus = lead.data[COL.WEB_STATUS] || '';

  const { subject, text } = emailNum === 2 ? buildEmail2(webStatus) : buildEmail3(webStatus);

  const mailOptions = {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: email,
    bcc: BCC_EMAIL,
    subject,
    text,
  };

  if (msgId) {
    mailOptions.inReplyTo = msgId;
    mailOptions.references = msgId;
  }

  await transport.sendMail(mailOptions);
  console.log(`    Sent E${emailNum} to: ${email}`);
}

export async function runFollowups() {
  console.log('Step 5: Checking replies and sending follow-ups...');
  const allRows = await getAllRows();

  console.log('  Checking inbox for replies...');
  const replyAddresses = await getReplyAddresses();
  console.log(`  Found ${replyAddresses.size} addresses in inbox (last 30 days)`);

  const activeLeads = allRows.filter(r => {
    const s = r.data[COL.STATUS];
    return s === STATUS.SENT_E1 || s === STATUS.SENT_E2 || s === STATUS.SENT_E3;
  });

  for (const lead of activeLeads) {
    const email = (lead.data[COL.EMAIL] || '').toLowerCase();
    if (replyAddresses.has(email) && lead.data[COL.REPLY] !== 'Y') {
      console.log(`  Reply detected from: ${email}`);
      await updateRowFields(lead.rowNumber, {
        [COL.REPLY]: 'Y',
        [COL.REPLY_DATE]: today(),
        [COL.STATUS]: STATUS.REPLIED,
      });
    }
  }

  console.log('  Processing follow-up sequence...');
  const transport = createTransport();
  const refreshed = await getAllRows();

  for (const lead of refreshed) {
    const status = lead.data[COL.STATUS];
    const reply = lead.data[COL.REPLY];

    if (reply === 'Y') continue;

    try {
      if (status === STATUS.SENT_E1 && daysSince(lead.data[COL.E1_DATE]) >= 4) {
        await sendFollowUp(lead, 2, transport);
        await updateRowFields(lead.rowNumber, {
          [COL.E2_DATE]: today(),
          [COL.STATUS]: STATUS.SENT_E2,
        });
        await sleep(2000);
      } else if (status === STATUS.SENT_E2 && daysSince(lead.data[COL.E2_DATE]) >= 4) {
        await sendFollowUp(lead, 3, transport);
        await updateRowFields(lead.rowNumber, {
          [COL.E3_DATE]: today(),
          [COL.STATUS]: STATUS.SENT_E3,
        });
        await sleep(2000);
      } else if (status === STATUS.SENT_E3 && daysSince(lead.data[COL.E3_DATE]) >= 4) {
        await updateRowFields(lead.rowNumber, { [COL.STATUS]: STATUS.DONE });
        console.log(`  Closed out: ${lead.data[COL.EMAIL]}`);
      }
    } catch (err) {
      console.error(`  Follow-up failed for ${lead.data[COL.EMAIL]}:`, err.message);
    }
  }

  transport.close();
  console.log('Step 5 done.');
}

if (process.argv[1].endsWith('step5-followup.js')) {
  runFollowups().catch(console.error);
}
