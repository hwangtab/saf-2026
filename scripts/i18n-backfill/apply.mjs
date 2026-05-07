#!/usr/bin/env node
/**
 * Apply translation results to Supabase via REST API + service role key.
 *
 * Usage:
 *   node --env-file=.env.local scripts/i18n-backfill/apply.mjs <table> <field_en> <input.json>
 *
 * Input JSON: [{id, translation_en}, ...]
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const [, , table, fieldEn, ...inputs] = process.argv;
if (!table || !fieldEn || inputs.length === 0) {
  console.error('Usage: apply.mjs <table> <field_en> <input.json> [<input.json>...]');
  process.exit(1);
}

const fs = await import('node:fs');
let items = [];
for (const f of inputs) {
  const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
  items.push(...data);
}

console.log(`Applying ${items.length} updates → ${table}.${fieldEn}`);

let ok = 0,
  fail = 0;
const errors = [];

for (const item of items) {
  const body = JSON.stringify({ [fieldEn]: item.translation_en });
  try {
    const resp = await fetch(`${url}/rest/v1/${table}?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body,
    });
    if (resp.ok) {
      ok++;
    } else {
      fail++;
      errors.push({ id: item.id, status: resp.status, body: await resp.text() });
    }
  } catch (e) {
    fail++;
    errors.push({ id: item.id, error: String(e) });
  }
  if ((ok + fail) % 20 === 0) {
    console.log(`  progress: ${ok}/${items.length} ok, ${fail} failed`);
  }
}

console.log(`Done: ${ok}/${items.length} ok, ${fail} failed`);
if (errors.length) {
  console.error('Errors:');
  for (const e of errors.slice(0, 5)) console.error(JSON.stringify(e));
  if (errors.length > 5) console.error(`...and ${errors.length - 5} more`);
}
process.exit(fail > 0 ? 1 : 0);
