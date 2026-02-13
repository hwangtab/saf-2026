#!/usr/bin/env node

const fs = require('fs');
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
const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'artwork-image-backups');
const PAGE_SIZE = 500;

const nowStamp = () => {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const sqlEscape = (value) => String(value).replace(/'/g, "''");

const toSqlArrayLiteral = (images) => {
  if (!Array.isArray(images)) return 'NULL';
  if (images.length === 0) return 'ARRAY[]::text[]';
  const values = images.map((url) => `'${sqlEscape(url)}'`).join(', ');
  return `ARRAY[${values}]::text[]`;
};

async function fetchAllArtworks() {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('artworks')
      .select('id, title, artist_id, images, updated_at')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const stamp = nowStamp();
  const jsonPath = path.join(BACKUP_DIR, `artwork-images-backup-${stamp}.json`);
  const sqlPath = path.join(BACKUP_DIR, `artwork-images-rollback-${stamp}.sql`);

  const artworks = await fetchAllArtworks();

  const payload = {
    createdAt: new Date().toISOString(),
    projectRef: new URL(supabaseUrl).host.split('.')[0],
    count: artworks.length,
    rows: artworks.map((row) => ({
      id: row.id,
      title: row.title,
      artist_id: row.artist_id,
      images: Array.isArray(row.images) ? row.images : [],
      updated_at: row.updated_at,
    })),
  };

  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const sqlLines = [];
  sqlLines.push(`-- Generated at: ${new Date().toISOString()}`);
  sqlLines.push('-- Purpose: rollback artworks.images after variant backfill');
  sqlLines.push('BEGIN;');
  for (const row of payload.rows) {
    const imagesLiteral = toSqlArrayLiteral(row.images);
    sqlLines.push(
      `UPDATE public.artworks SET images = ${imagesLiteral} WHERE id = '${sqlEscape(row.id)}';`
    );
  }
  sqlLines.push('COMMIT;');
  fs.writeFileSync(sqlPath, `${sqlLines.join('\n')}\n`, 'utf8');

  console.log(`backup_json=${jsonPath}`);
  console.log(`rollback_sql=${sqlPath}`);
  console.log(`artworks=${payload.count}`);
}

main().catch((error) => {
  console.error('백업 생성 실패:', error.message || error);
  process.exit(1);
});

