import { getSupabaseRequestTimeoutMs } from '../../lib/supabase';

describe('supabase client timeout', () => {
  it('uses a longer timeout during production builds', () => {
    expect(getSupabaseRequestTimeoutMs('phase-production-build')).toBe(30_000);
  });

  it('keeps the shorter timeout outside production builds', () => {
    expect(getSupabaseRequestTimeoutMs('phase-development-server')).toBe(8_000);
    expect(getSupabaseRequestTimeoutMs(undefined)).toBe(8_000);
  });
});
