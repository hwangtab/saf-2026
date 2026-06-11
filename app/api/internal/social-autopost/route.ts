import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { MASTER_ARTISTS } from '@/lib/master-artists';
import { getActiveShowingItems } from '@/lib/now-showing';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import {
  buildCaptionForArtwork,
  executePublish,
  fetchPublishCandidates,
} from '@/lib/social/publish-core';
import { isPlatformConfigured } from '@/lib/social/registry';
import { selectAutopostArtworks } from '@/lib/social/select-autopost';
import { sleep } from '@/lib/social/sleep';
import { SOCIAL_PLATFORMS, type Platform } from '@/lib/social/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const INTER_ARTWORK_DELAY_MS = 5000;

/** 진행 중 특별전(/special/*)의 거장 작가 한글명 — 선정 가중치용. */
function getShowingArtistNames(): string[] {
  return getActiveShowingItems()
    .map((item) => item.href)
    .filter((href): href is string => href != null && href.startsWith('/special/'))
    .map((href) => href.replace('/special/', ''))
    .map((slug) => MASTER_ARTISTS.find((m) => m.specialSlug === slug)?.artistName)
    .filter((name): name is string => Boolean(name));
}

/**
 * 소셜 자동 게시 cron. 하루 N건(기본 3) 작품을 설정된 플랫폼(IG/Threads)에 자동 게시.
 * 안전장치: SOCIAL_AUTOPOST_ENABLED='true' 일 때만 동작(기본 OFF), 미게시 작품만, 거장·특별전 가중.
 */
export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  if (process.env.SOCIAL_AUTOPOST_ENABLED !== 'true') {
    return NextResponse.json({ skipped: 'SOCIAL_AUTOPOST_ENABLED가 true가 아님(자동게시 OFF)' });
  }

  const count = Math.max(1, Math.min(10, Number(process.env.SOCIAL_AUTOPOST_COUNT) || 3));
  const platforms = SOCIAL_PLATFORMS.filter((p): p is Platform => isPlatformConfigured(p));
  if (platforms.length === 0) {
    return NextResponse.json({ skipped: '설정된 플랫폼 없음' });
  }

  const supabase = createSupabaseAdminClient();
  const candidates = await fetchPublishCandidates(supabase);
  const picks = selectAutopostArtworks(candidates, {
    count,
    showingArtistNames: getShowingArtistNames(),
  });

  if (picks.length === 0) {
    return NextResponse.json({ posted: 0, note: '게시할 미게시 후보가 없습니다.' });
  }

  const results: unknown[] = [];
  for (let i = 0; i < picks.length; i += 1) {
    const pick = picks[i];
    const cap = await buildCaptionForArtwork(supabase, pick.id);
    if (!cap || !cap.imageUrl) {
      results.push({ artworkId: pick.id, title: pick.title, skipped: '캡션/이미지 없음' });
      continue;
    }

    const perPlatform: Record<string, unknown> = {};
    for (const platform of platforms) {
      const r = await executePublish(supabase, {
        platform,
        artworkId: pick.id,
        caption: cap.caption,
        imageUrl: cap.imageUrl,
        createdBy: null,
      });
      perPlatform[platform] = r.ok
        ? { ok: true, permalink: r.permalink }
        : { ok: false, error: r.message };
    }
    results.push({ artworkId: pick.id, title: pick.title, platforms: perPlatform });

    if (i < picks.length - 1) await sleep(INTER_ARTWORK_DELAY_MS);
  }

  return NextResponse.json({ posted: picks.length, results });
}
