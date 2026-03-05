/**
 * Sanitizes a user-supplied search query for safe use in Supabase `.or()` / `.ilike()` calls.
 * - Trims leading/trailing whitespace
 * - Escapes `_` (wildcard in SQL LIKE)
 * - Escapes single quotes to prevent query injection
 * - Removes `.or()` syntax characters: %, (, ), ,
 * - Collapses multiple spaces into one
 */
export function sanitizeIlikeQuery(query: string): string {
  return query
    .trim()
    .replace(/_/g, '\\_')
    .replace(/'/g, "''")
    .replace(/[%(),]/g, ' ')
    .replace(/\s+/g, ' ');
}
