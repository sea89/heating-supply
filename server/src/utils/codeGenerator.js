// Auto-numbering generator for parts, equipment, etc.
import db from '../config/database.js';

/**
 * Generate next sequential code with format: {prefix}{YYYYMMDD}{XXX}
 * Example: P20260515001, E20260515002
 */
export async function generateNextCode(table, prefix, codeColumn = 'code') {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const todayPrefix = `${prefix}${dateStr}`;

  const last = await db(table)
    .where(codeColumn, 'like', `${todayPrefix}%`)
    .orderBy(codeColumn, 'desc')
    .first();

  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last[codeColumn].slice(-3), 10);
    seq = lastSeq + 1;
  }

  return `${todayPrefix}${seq.toString().padStart(3, '0')}`;
}
