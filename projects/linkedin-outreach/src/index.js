import { findProfiles } from './step1-find.js';
import { enrichLeads } from './step2-enrich.js';
import { generateMessages } from './step3-generate.js';

async function run() {
  console.log('=== LinkedIn Outreach Pipeline ===\n');
  await findProfiles();
  console.log('');
  await enrichLeads();
  console.log('');
  await generateMessages();
  console.log('\n=== Done. Open the LinkedIn sheet to review drafts. ===');
}

run().catch(err => {
  console.error('Pipeline failed:', err.message);
  process.exit(1);
});
