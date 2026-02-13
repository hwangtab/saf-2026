import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '❌ Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 500;

type TestimonialRow = {
  id: string | number | null;
  author: string | null;
  quote: string | null;
  created_at: string | null;
};

function normalizeText(value: string | null): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getCreatedTimestamp(value: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function fetchAllTestimonials(): Promise<TestimonialRow[]> {
  const all: TestimonialRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('testimonials')
      .select('id, author, quote, created_at')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch testimonials (${from}-${to}): ${error.message}`);
    }

    if (!data || data.length === 0) break;

    all.push(...(data as TestimonialRow[]));

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

async function deleteByBatches(ids: Array<string | number>): Promise<void> {
  for (let i = 0; i < ids.length; i += DELETE_BATCH_SIZE) {
    const batch = ids.slice(i, i + DELETE_BATCH_SIZE);
    const { error } = await supabase.from('testimonials').delete().in('id', batch);

    if (error) {
      throw new Error(
        `Failed to delete batch ${i + 1}-${Math.min(i + DELETE_BATCH_SIZE, ids.length)}: ${error.message}`
      );
    }
  }
}

async function deduplicate() {
  console.log('🔍 Fetching testimonials from Supabase...');

  const testimonials = await fetchAllTestimonials();

  if (!testimonials || testimonials.length === 0) {
    console.log('ℹ️ No testimonials found in the database.');
    return;
  }

  console.log(`📊 Total testimonials found: ${testimonials.length}`);

  const sortedTestimonials = [...testimonials].sort((a, b) => {
    const aTime = getCreatedTimestamp(a.created_at);
    const bTime = getCreatedTimestamp(b.created_at);

    if (aTime !== null && bTime !== null) {
      return aTime - bTime;
    }
    if (aTime === null && bTime !== null) return 1;
    if (aTime !== null && bTime === null) return -1;
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });

  const seen = new Set<string>();
  const toDelete: Array<string | number> = [];
  let skippedWithoutId = 0;

  for (const item of sortedTestimonials) {
    if (item.id === null || item.id === undefined) {
      skippedWithoutId += 1;
      continue;
    }

    const author = normalizeText(item.author);
    const quote = normalizeText(item.quote);
    const key = `${author}|${quote}`;

    if (seen.has(key)) {
      toDelete.push(item.id);
    } else {
      seen.add(key);
    }
  }

  if (skippedWithoutId > 0) {
    console.warn(`⚠️ Skipped ${skippedWithoutId} rows without id.`);
  }

  if (toDelete.length === 0) {
    console.log('✅ No duplicate testimonials found.');
    return;
  }

  console.log(`🗑️ Found ${toDelete.length} duplicate records. Starting deletion...`);
  await deleteByBatches(toDelete);
  console.log(`✨ Successfully deleted ${toDelete.length} duplicate records.`);

  const { count, error: countError } = await supabase
    .from('testimonials')
    .select('id', { count: 'exact', head: true });

  if (!countError) {
    console.log(`📈 Remaining testimonials: ${count}`);
  }
}

deduplicate().catch((err) => {
  console.error('💥 Script failed:', err);
  process.exit(1);
});
