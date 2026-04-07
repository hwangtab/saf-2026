/**
 * Generates SAF order numbers in the format: SAF-YYYYMMDD-XXXX
 *
 * - Date portion: current date in KST (UTC+9)
 * - Suffix: 4 alphanumeric characters (uppercase, no ambiguous chars I/O/0/1)
 */

import crypto from 'crypto';

// Excludes visually ambiguous characters: I, O, 0, 1
const SUFFIX_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateSuffix(length = 4): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => SUFFIX_CHARS[b % SUFFIX_CHARS.length])
    .join('');
}

/** Returns a unique order number like SAF-20260407-A3K9 */
export function generateOrderNumber(): string {
  // Use KST (UTC+9) for date
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `SAF-${year}${month}${day}-${generateSuffix()}`;
}
