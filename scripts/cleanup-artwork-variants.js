#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const BUCKET = 'artworks';
const LIST_PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 1000;
const DELETE_VARIANT_REGEX = /__(thumb|card|detail|hero)\.(webp|jpg|jpeg|png|avif)$/i;

const parseArgs = () => {
  const apply = process.argv.includes('--apply');
  return { apply };
};

async function listFolderEntries(folderPath) {
  let offset = 0;
  const entries = [];

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folderPath, {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw new Error(`list 실패 (${folderPath || '/'}): ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    entries.push(...data);

    if (data.length < LIST_PAGE_SIZE) {
      break;
    }

    offset += LIST_PAGE_SIZE;
  }

  return entries;
}

async function collectVariantPaths(folderPath = '') {
  const entries = await listFolderEntries(folderPath);
  const collected = [];

  for (const entry of entries) {
    const entryPath = folderPath ? `${folderPath}/${entry.name}` : entry.name;

    if (entry.id) {
      if (DELETE_VARIANT_REGEX.test(entry.name)) {
        collected.push(entryPath);
      }
      continue;
    }

    const nested = await collectVariantPaths(entryPath);
    collected.push(...nested);
  }

  return collected;
}

async function removeInBatches(paths) {
  let removed = 0;
  let failed = 0;

  for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(i, i + REMOVE_BATCH_SIZE);
    const { data, error } = await supabase.storage.from(BUCKET).remove(batch);

    if (error) {
      failed += batch.length;
      console.error(`batch ${Math.floor(i / REMOVE_BATCH_SIZE) + 1} 실패: ${error.message}`);
      continue;
    }

    const removedCount = Array.isArray(data) ? data.length : 0;
    removed += removedCount;
    failed += Math.max(0, batch.length - removedCount);
    console.log(
      `batch ${Math.floor(i / REMOVE_BATCH_SIZE) + 1}: ${removedCount}/${batch.length} 삭제`
    );
  }

  return { removed, failed };
}

async function main() {
  const { apply } = parseArgs();
  const targets = await collectVariantPaths('');

  console.log(`mode=${apply ? 'apply' : 'dry-run'}`);
  console.log(`targets=${targets.length}`);

  if (!apply) {
    targets.slice(0, 30).forEach((target) => console.log(`- ${target}`));
    if (targets.length > 30) {
      console.log(`...외 ${targets.length - 30}개`);
    }
    console.log('실제 삭제: npm run cleanup:artwork-variants:apply');
    return;
  }

  const { removed, failed } = await removeInBatches(targets);
  console.log(`removed=${removed}`);
  console.log(`failed=${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('cleanup 실행 실패:', error.message || error);
  process.exit(1);
});
