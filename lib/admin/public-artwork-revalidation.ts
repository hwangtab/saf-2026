export type PublicArtworkRevalidationConfig =
  | { ok: true; baseUrl: string; cronSecret: string }
  | { ok: false; missing: string[] };

export function normalizeRevalidationArtistNames(
  artistNames: Array<string | null | undefined>
): string[] {
  return Array.from(
    new Set(
      artistNames
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    )
  );
}

export function resolvePublicArtworkRevalidationConfig(
  env: NodeJS.ProcessEnv = process.env
): PublicArtworkRevalidationConfig {
  const missing: string[] = [];
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl = env.VERCEL_URL?.trim();
  const cronSecret = env.CRON_SECRET?.trim();

  let baseUrl: string | null = null;
  if (siteUrl) {
    baseUrl = siteUrl.replace(/\/+$/, '');
  } else if (vercelUrl) {
    baseUrl = `https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  } else {
    missing.push('NEXT_PUBLIC_SITE_URL or VERCEL_URL');
  }

  if (!cronSecret) missing.push('CRON_SECRET');

  if (missing.length > 0 || !baseUrl || !cronSecret) {
    return { ok: false, missing };
  }

  return { ok: true, baseUrl, cronSecret };
}
