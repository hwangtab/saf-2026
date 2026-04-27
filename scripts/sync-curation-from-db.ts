/**
 * 일회성: DB의 큐레이션 4편 body를 마크다운 파일에 동기화.
 * frontmatter는 유지하고 body만 교체.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// load .env.local
const envPath = resolve(process.cwd(), '.env.local');
try {
  const raw = readFileSync(envPath, 'utf-8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    if (!process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
} catch {}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const SLUG_TO_FILE: Record<string, string> = {
  'spring-curation-saf': '45-spring-curation.md',
  'summer-curation-saf': '46-summer-curation.md',
  'autumn-curation-saf': '47-autumn-curation.md',
  'winter-curation-saf': '48-winter-curation.md',
};

(async () => {
  const { data, error } = await supabase
    .from('stories')
    .select('slug, body')
    .in('slug', Object.keys(SLUG_TO_FILE));

  if (error) {
    console.error('Fetch failed:', error);
    process.exit(1);
  }

  for (const row of data!) {
    const fileName = SLUG_TO_FILE[row.slug as string];
    const filePath = resolve(process.cwd(), 'content/magazine-drafts', fileName);
    const raw = readFileSync(filePath, 'utf-8');
    const m = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
    if (!m) {
      console.error(`No frontmatter in ${fileName}`);
      continue;
    }
    const frontmatter = m[1];
    const newContent = frontmatter + '\n' + (row.body as string).trim() + '\n';
    writeFileSync(filePath, newContent);
    console.log(`✅ Updated ${fileName} (body ${(row.body as string).length}자)`);
  }
})();
