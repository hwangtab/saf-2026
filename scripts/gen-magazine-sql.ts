/**
 * Generate one SQL UPSERT statement per publishable draft, using PostgreSQL
 * dollar-quoted string literals so that embedded apostrophes, backslashes, and
 * Markdown syntax pass through unchanged.
 *
 * Output goes to stdout — pipe into `psql` or execute via the Supabase MCP
 * `execute_sql` tool one statement at a time.
 *
 * Usage:
 *   npx tsx scripts/gen-magazine-sql.ts                 # is_published=false drafts
 *   npx tsx scripts/gen-magazine-sql.ts --publish       # is_published=true
 *   npx tsx scripts/gen-magazine-sql.ts --only=17       # only slug-prefix "17"
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DRAFTS_DIR = resolve(process.cwd(), 'content/magazine-drafts');
const OUT_DIR = resolve(process.cwd(), 'scripts/.magazine-sql');
const PUBLISH = process.argv.includes('--publish');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];

mkdirSync(OUT_DIR, { recursive: true });

interface Meta {
  slug?: string;
  title?: string;
  title_en?: string;
  category?: string;
  excerpt?: string;
  excerpt_en?: string;
  tags?: string[];
  author?: string;
  published_at?: string;
  display_order?: number;
  rewrite_required?: boolean;
}

function parseFrontmatter(raw: string): { meta: Meta; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error('No frontmatter');
  const [, fm, body] = m;
  const meta: Record<string, unknown> = {};
  const lines = fm.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const arrKey = line.match(/^([a-z_]+):\s*$/i);
    if (arrKey) {
      const key = arrKey[1];
      const values: string[] = [];
      let j = i + 1;
      while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
        const item = lines[j].replace(/^\s+-\s+/, '').trim();
        if (!item.startsWith('{')) values.push(unq(item));
        j += 1;
      }
      if (values.length > 0) meta[key] = values;
      i = j;
      continue;
    }
    const blockKey = line.match(/^([a-z_]+):\s*\|\s*$/i);
    if (blockKey) {
      const key = blockKey[1];
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
    const sc = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (sc) {
      const key = sc[1];
      const v = sc[2].trim();
      if (v === 'true') meta[key] = true;
      else if (v === 'false') meta[key] = false;
      else if (/^-?\d+$/.test(v)) meta[key] = Number(v);
      else meta[key] = unq(v);
    }
    i += 1;
  }
  return { meta: meta as Meta, body };
}

function unq(s: string): string {
  return s.replace(/^['"]|['"]$/g, '');
}

function extractFirstImage(body: string): string | null {
  const m = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return m?.[1] ?? null;
}

// Dollar-quote with a tag that cannot appear in the content.
function dq(s: string | null | undefined, base = 'md'): string {
  if (s === null || s === undefined) return 'NULL';
  let tag = base;
  let i = 0;
  while (s.includes(`$${tag}$`)) {
    i += 1;
    tag = `${base}${i}`;
  }
  return `$${tag}$${s}$${tag}$`;
}

function sqlArray(arr: string[] | null | undefined): string {
  if (!arr || arr.length === 0) return 'NULL';
  const items = arr.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ');
  return `ARRAY[${items}]::text[]`;
}

function sqlInt(n: number | undefined, fallback = 100): string {
  return String(typeof n === 'number' ? n : fallback);
}

function sqlDate(s: string | undefined): string {
  if (!s) return "'2026-04-24'";
  return `'${s}'`;
}

const files = readdirSync(DRAFTS_DIR)
  .filter((f) => /^\d{2}-.+\.md$/.test(f))
  .filter((f) => (ONLY ? f.startsWith(ONLY) : true))
  .sort();

let emitted = 0;
const summary: Array<{ slug: string; file: string; publish: boolean }> = [];

for (const fileName of files) {
  const raw = readFileSync(resolve(DRAFTS_DIR, fileName), 'utf-8');
  const { meta, body } = parseFrontmatter(raw);
  if (!meta.slug || !meta.title || !meta.category) {
    console.error(`[skip] ${fileName}: missing required fields`);
    continue;
  }
  if (meta.rewrite_required) {
    console.error(`[skip-rewrite] ${fileName}`);
    continue;
  }
  // Drafts with a note_to_editor typically contain placeholder data or
  // fictionalized interviews that need real-world reporting before they
  // can go live. Hold them back from the automated upload path.
  if ((meta as unknown as { note_to_editor?: string }).note_to_editor) {
    console.error(`[skip-needs-editor] ${fileName}`);
    continue;
  }

  const thumbnail = extractFirstImage(body);
  const isPublished = PUBLISH ? 'true' : 'false';

  const sql = `-- ${fileName}
INSERT INTO stories (
  slug, title, title_en, category, excerpt, excerpt_en,
  body, thumbnail, author, published_at, display_order,
  is_published, tags
) VALUES (
  ${dq(meta.slug, 'slug')},
  ${dq(meta.title, 'ttl')},
  ${dq(meta.title_en, 'tle')},
  ${dq(meta.category, 'cat')},
  ${dq(meta.excerpt, 'exc')},
  ${dq(meta.excerpt_en, 'exe')},
  ${dq(body.trim(), 'body')},
  ${dq(thumbnail, 'thm')},
  ${dq(meta.author ?? 'SAF 매거진 편집부', 'au')},
  ${sqlDate(meta.published_at)},
  ${sqlInt(meta.display_order)},
  ${isPublished},
  ${sqlArray(meta.tags)}
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  title_en = EXCLUDED.title_en,
  category = EXCLUDED.category,
  excerpt = EXCLUDED.excerpt,
  excerpt_en = EXCLUDED.excerpt_en,
  body = EXCLUDED.body,
  thumbnail = EXCLUDED.thumbnail,
  author = EXCLUDED.author,
  published_at = EXCLUDED.published_at,
  display_order = EXCLUDED.display_order,
  is_published = EXCLUDED.is_published,
  tags = EXCLUDED.tags;
`;
  const outPath = resolve(OUT_DIR, fileName.replace(/\.md$/, '.sql'));
  writeFileSync(outPath, sql, 'utf-8');
  summary.push({ slug: meta.slug!, file: fileName, publish: PUBLISH });
  emitted += 1;
}

console.log(`\nGenerated ${emitted} SQL files in ${OUT_DIR}`);
console.table(summary);
