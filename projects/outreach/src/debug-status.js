import { getAllRows } from './sheets.js';
import { COL, STATUS } from './config.js';

async function main() {
  const rows = await getAllRows();
  console.log(`Total rows: ${rows.length}`);

  const statusCounts = {};
  const colALength = {};
  for (const r of rows) {
    const s = r.data[COL.STATUS] ?? '(undefined)';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  console.log('Status counts:', JSON.stringify(statusCounts, null, 2));

  const blankNameCount = rows.filter(r => !r.data[COL.NAME]).length;
  console.log(`Rows with blank NAME (col A): ${blankNameCount} / ${rows.length}`);

  console.log('\nLast 10 rows (raw arrays):');
  for (const r of rows.slice(-10)) {
    console.log(r.rowNumber, JSON.stringify(r.data));
  }

  const newRows = rows.filter(r => (r.data[COL.STATUS] || '') === STATUS.NEW);
  console.log(`\nRows matching STATUS.NEW ('${STATUS.NEW}'): ${newRows.length}`);
  if (newRows.length) {
    console.log('First 3 NEW rows:');
    for (const r of newRows.slice(0, 3)) {
      console.log(r.rowNumber, JSON.stringify(r.data));
    }
  }
}

main().catch(e => { console.error('DEBUG SCRIPT FAILED:', e); process.exit(1); });
