/**
 * Upload magazine drafts to Supabase stories (as unpublished drafts).
 *
 * Usage:
 *   npx tsx scripts/upload-magazine-drafts.ts
 *   npx tsx scripts/upload-magazine-drafts.ts --publish  # flips is_published=true after insert
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (service-role key is needed to write to the stories table through RLS).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// --- minimal env loader (reads .env.local without dotenv dependency) -----------
const envPath = resolve(process.cwd(), '.env.local');
try {
  const raw = readFileSync(envPath, 'utf-8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    if (!process.env[match[1]]) {
      const value = match[2].replace(/^['"]|['"]$/g, '');
      process.env[match[1]] = value;
    }
  }
} catch {
  /* .env.local optional */
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. Aborting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// --- tiny frontmatter parser ---------------------------------------------------
// We only need the subset used by our magazine drafts: scalars, arrays of strings,
// and block scalars (|). Objects-in-arrays (internal_links) are discarded because
// we don't upload them to the stories table.
interface ParsedFrontmatter {
  slug: string;
  title: string;
  title_en?: string;
  category: string;
  excerpt: string;
  excerpt_en?: string;
  tags?: string[];
  author?: string;
  published_at: string;
  display_order?: number;
  is_published?: boolean;
  rewrite_required?: boolean;
}

function parseFrontmatter(raw: string): { meta: ParsedFrontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('No frontmatter block');
  const [, fm, body] = match;
  const meta: Record<string, string | string[] | boolean | number> = {};
  const lines = fm.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Array key followed by `- item` lines
    const arrayKeyMatch = line.match(/^([a-z_]+):\s*$/i);
    if (arrayKeyMatch) {
      const key = arrayKeyMatch[1];
      const values: string[] = [];
      let j = i + 1;
      while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
        const item = lines[j].replace(/^\s+-\s+/, '').trim();
        // Multi-line object item: `- {` ... `}` (prettier-formatted) — skip until closing brace
        if (item.startsWith('{') && !item.endsWith('}')) {
          j += 1;
          while (j < lines.length && !lines[j].trim().endsWith('}')) j += 1;
          j += 1; // skip closing `}` line
          continue;
        }
        // Single-line object item: `- { ... }` — skip (not needed for upload)
        if (item.startsWith('{')) {
          j += 1;
          continue;
        }
        values.push(unquote(item));
        j += 1;
      }
      if (values.length > 0) meta[key] = values;
      i = j;
      continue;
    }
    // Block scalar: `key: |` followed by indented lines → join as string
    const blockKeyMatch = line.match(/^([a-z_]+):\s*\|\s*$/i);
    if (blockKeyMatch) {
      const key = blockKeyMatch[1];
      const parts: string[] = [];
      let j = i + 1;
      while (j < lines.length && (lines[j].startsWith('  ') || lines[j].trim() === '')) {
        parts.push(lines[j].replace(/^  /, ''));
        j += 1;
      }
      meta[key] = parts.join('\n').trim();
      i = j;
      continue;
    }
    // Scalar: `key: value`
    const scalarMatch = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (scalarMatch) {
      const key = scalarMatch[1];
      const rawVal = scalarMatch[2].trim();
      if (rawVal === 'true') meta[key] = true;
      else if (rawVal === 'false') meta[key] = false;
      else if (/^-?\d+$/.test(rawVal)) meta[key] = Number(rawVal);
      else meta[key] = unquote(rawVal);
    }
    i += 1;
  }
  return { meta: meta as unknown as ParsedFrontmatter, body };
}

function unquote(s: string): string {
  return s.replace(/^['"]|['"]$/g, '');
}

// --- thumbnail extraction (matches app/[locale]/stories/[slug]/page.tsx) ------
function extractFirstImage(body: string): string | null {
  const m = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return m?.[1] ?? null;
}

// --- main ---------------------------------------------------------------------
const DRAFTS_DIR = resolve(process.cwd(), 'content/magazine-drafts');
const PUBLISH = process.argv.includes('--publish');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_SLUGS = new Set(
  (process.argv.find((a) => a.startsWith('--skip='))?.replace('--skip=', '') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

const files = readdirSync(DRAFTS_DIR)
  .filter((f) => /^\d{2}-.+\.md$/.test(f))
  .sort();

const rows: Array<Record<string, unknown>> = [];

for (const fileName of files) {
  const full = readFileSync(resolve(DRAFTS_DIR, fileName), 'utf-8');
  const { meta, body } = parseFrontmatter(full);

  if (!meta.slug || !meta.title || !meta.category) {
    console.warn(`[skip] ${fileName}: missing required frontmatter`);
    continue;
  }

  // Skip drafts that explicitly request a rewrite — they'd duplicate existing posts.
  if ((meta as unknown as { rewrite_required?: boolean }).rewrite_required) {
    console.log(`[skip-rewrite] ${fileName}: flagged rewrite_required`);
    continue;
  }

  // Skip slugs passed via --skip=slug1,slug2,...
  if (SKIP_SLUGS.has(meta.slug)) {
    console.log(`[skip-cli] ${fileName}: slug "${meta.slug}" excluded via --skip`);
    continue;
  }

  const thumbnail = extractFirstImage(body);

  rows.push({
    slug: meta.slug,
    title: meta.title,
    title_en: meta.title_en ?? null,
    category: meta.category,
    excerpt: meta.excerpt ?? null,
    excerpt_en: meta.excerpt_en ?? null,
    body: body.trim(),
    thumbnail,
    author: meta.author ?? 'SAF 매거진 편집부',
    published_at: meta.published_at,
    display_order: meta.display_order ?? 100,
    is_published: PUBLISH,
    tags: meta.tags ?? null,
  });
}

console.log(`Prepared ${rows.length} rows (is_published=${PUBLISH}, dry_run=${DRY_RUN})`);
for (const row of rows)
  console.log(` - ${row.slug} [${row.category}] body=${(row.body as string).length}자`);

if (DRY_RUN) {
  console.log('\n🟡 DRY RUN — no DB writes performed. Re-run without --dry-run to upsert.');
  process.exit(0);
}

// --write-json=path: write rows as JSON instead of upsert (used by MCP-based fallback)
const writeJsonArg = process.argv.find((a) => a.startsWith('--write-json='));
if (writeJsonArg) {
  const out = writeJsonArg.replace('--write-json=', '');
  writeFileSync(out, JSON.stringify(rows, null, 0));
  console.log(
    `\n📁 Wrote ${rows.length} rows to ${out} (${(JSON.stringify(rows).length / 1024).toFixed(1)}KB)`
  );
  process.exit(0);
}

(async () => {
  const { data, error } = await supabase
    .from('stories')
    .upsert(rows, { onConflict: 'slug' })
    .select('slug');

  if (error) {
    console.error('Upsert failed:', error);
    process.exit(1);
  }
  console.log(`\n✅ Upserted ${data?.length ?? 0} rows.`);
})();
