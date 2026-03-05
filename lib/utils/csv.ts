const FORMULA_START_CHARS = new Set(['=', '+', '-', '@', '\t', '\r']);

/**
 * Escapes a value for safe CSV output, defending against CSV Formula Injection.
 * - String values starting with formula characters (=, +, -, @, \t, \r) are prefixed with a single quote.
 * - Numbers are returned as-is (no prefix, as negative numbers are valid).
 * - null/undefined returns an empty string.
 * - Applies RFC 4180 quoting when the value contains commas, double-quotes, or newlines.
 */
export function csvSafeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number') {
    return String(value);
  }

  let raw = value;
  if (raw.length > 0 && FORMULA_START_CHARS.has(raw[0])) {
    raw = `'${raw}`;
  }

  const escaped = raw.replace(/"/g, '""');
  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}
