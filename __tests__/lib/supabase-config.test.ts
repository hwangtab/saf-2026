const ORIGINAL_ENV = { ...process.env };

describe('Supabase public config guard', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('does not treat placeholder Supabase env as live config by default', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder';
    delete process.env.ALLOW_SUPABASE_PLACEHOLDER_FALLBACK;

    const mod = await import('@/lib/supabase');

    expect(mod.hasSupabaseConfig).toBe(false);
    expect(mod.supabase).toBeNull();
  });

  it('allows placeholder fallback only when CI opts in explicitly', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder';
    process.env.ALLOW_SUPABASE_PLACEHOLDER_FALLBACK = 'true';

    const mod = await import('@/lib/supabase');

    expect(mod.hasSupabaseConfig).toBe(true);
    expect(mod.supabase).not.toBeNull();
  });

  it('treats non-placeholder Supabase env as configured', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.ALLOW_SUPABASE_PLACEHOLDER_FALLBACK;

    const mod = await import('@/lib/supabase');

    expect(mod.hasSupabaseConfig).toBe(true);
    expect(mod.supabase).not.toBeNull();
  });
});
