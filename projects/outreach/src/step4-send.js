import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, FROM_NAME, COL, STATUS } from './config.js';
import { getLeadsByStatus, updateRowFields, today } from './sheets.js';
import { buildEmail1 } from './templates.js';

function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // STARTTLS on port 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendEmails() {
  console.log('Step 4: Sending Email 1 to draft-ready leads...');
  const leads = await getLeadsByStatus(STATUS.DRAFT_READY);

  if (!leads.length) {
    console.log('  No leads ready to send.');
    return;
  }

  const transport = createTransport();

  for (const lead of leads) {
    const email = lead.data[COL.EMAIL];
    const name = lead.data[COL.NAME] || 'there';
    const opener = lead.data[COL.OPENER] || '';

    console.log(`  Sending to: ${email}`);

    try {
      const { subject, text } = buildEmail1(name, opener);

      const info = await transport.sendMail({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: email,
        bcc: FROM_EMAIL,
        subject,
        text,
      });

      const msgId = info.messageId || '';
      console.log(`    Sent. Message-ID: ${msgId}`);

      await updateRowFields(lead.rowNumber, {
        [COL.E1_DATE]: today(),
        [COL.E1_MSG_ID]: msgId,
        [COL.STATUS]: STATUS.SENT_E1,
      });

      // Avoid hammering SMTP
      await sleep(2000);
    } catch (err) {
      console.error(`    Failed to send to ${email}:`, err.message);
    }
  }

  transport.close();
  console.log('Step 4 done.');
}

if (process.argv[1].endsWith('step4-send.js')) {
  sendEmails().catch(console.error);
}
