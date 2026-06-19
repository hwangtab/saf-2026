/**
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import path from 'path';

describe('manual sold override migration', () => {
  const migration = readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260619010059_manual_sold_override.sql'),
    'utf8'
  );

  it('adds the manual_sold_override column and restores Kalnorae as manually sold', () => {
    expect(migration).toContain('manual_sold_override boolean NOT NULL DEFAULT false');
    expect(migration).toContain("id = '4c920878-32dd-4727-ab03-6eda996597d5'");
    expect(migration).toContain('manual_sold_override = true');
  });

  it('prevents sale-sync triggers from clearing a manual sold override', () => {
    expect(migration).toContain('artwork_manual_sold_override boolean');
    expect(migration).toContain('IF COALESCE(artwork_manual_sold_override, false) THEN');
    expect(migration).toContain("SET status = 'sold'");
  });

  it('keeps sold_at synced only for artworks that are actually sold', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.sync_artwork_sold_at()');
    expect(migration).toContain("AND status = 'sold'");
  });
});
