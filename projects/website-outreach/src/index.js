import { findLeads } from './step1-find-leads.js';
import { scoreWebsites } from './step2-score-websites.js';
import { generateOpeners } from './step3-generate.js';
import { sendEmails } from './step4-send.js';
import { runFollowups } from './step5-followup.js';

async function run() {
  console.log('=== Website Outreach pipeline starting ===\n');

  const steps = [
    { name: 'Find leads', fn: findLeads },
    { name: 'Score websites', fn: scoreWebsites },
    { name: 'Generate openers', fn: generateOpeners },
    { name: 'Send Email 1', fn: sendEmails },
    { name: 'Follow-up sequence', fn: runFollowups },
  ];

  for (const step of steps) {
    try {
      await step.fn();
      console.log('');
    } catch (err) {
      console.error(`\n[ERROR] ${step.name} failed:`, err.message);
      console.error('Continuing to next step...\n');
    }
  }

  console.log('=== Pipeline complete ===');
}

run();
