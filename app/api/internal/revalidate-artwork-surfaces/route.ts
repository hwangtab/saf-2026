import { NextRequest, NextResponse } from 'next/server';

import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const rawArtistNames = (body as { artistNames?: unknown } | null)?.artistNames;
  const artistNames = Array.isArray(rawArtistNames)
    ? rawArtistNames
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        .map((name) => name.trim())
    : [];

  revalidatePublicArtworkSurfaces(artistNames);

  return NextResponse.json({ revalidated: true, artistNames });
}
