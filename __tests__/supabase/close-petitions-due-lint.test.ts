import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

describe('close_petitions_due migration lint cleanup', () => {
  it('overrides close_petitions_due without unused v_result assignment', () => {
    const migrationFile = readdirSync(join(ROOT, 'supabase/migrations'))
      .filter((file) => file.endsWith('_close_petitions_due_lint_cleanup.sql'))
      .sort()
      .at(-1);

    expect(migrationFile).toBeTruthy();

    const migration = readFileSync(join(ROOT, 'supabase/migrations', migrationFile!), 'utf8');

    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.close_petitions_due()');
    expect(migration).toContain('PERFORM public.close_petition(v_slug);');
    expect(migration).not.toContain('v_result');
  });
});
