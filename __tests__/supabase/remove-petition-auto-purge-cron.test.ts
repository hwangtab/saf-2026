import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

describe('remove petition_auto_purge cron migration', () => {
  it('unschedules only the automatic PII purge job', () => {
    const migrationFile = readdirSync(join(ROOT, 'supabase/migrations'))
      .filter((file) => file.endsWith('_remove_petition_auto_purge_cron.sql'))
      .sort()
      .at(-1);

    expect(migrationFile).toBeTruthy();

    const migration = readFileSync(join(ROOT, 'supabase/migrations', migrationFile!), 'utf8');

    expect(migration).toContain("WHERE jobname = 'petition_auto_purge'");
    expect(migration).toContain('cron.unschedule(jobid)');
    expect(migration).not.toContain("WHERE jobname = 'petition_auto_close'");
    expect(migration).not.toContain('DELETE FROM cron.job');
    expect(migration).not.toContain("cron.schedule(\n    'petition_auto_purge'");
  });
});
