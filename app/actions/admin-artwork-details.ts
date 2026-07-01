'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';

import {
  normalizeRevalidationArtistNames,
  resolvePublicArtworkRevalidationConfig,
} from '@/lib/admin/public-artwork-revalidation';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import {
  parseAdminArtworkCreateFormData,
  parseAdminArtworkDetailsFormData,
} from '@/lib/artworks/details-form';
import {
  createAdminArtworkRecordMutation,
  updateAdminArtworkDetailsMutation,
} from '@/lib/artworks/details-mutations';
import { notifyEmail } from '@/lib/notify';
import {
  revalidatePublicArtworkDetails,
  revalidatePublicArtworkSurfaces,
} from '@/lib/utils/revalidate';

import { logAdminAction, logSystemAction } from './activity-log-writer';

const INTERNAL_ARTWORK_REVALIDATE_PATH = '/api/internal/revalidate-artwork-surfaces';

function schedulePublicArtworkSurfaceRevalidation(
  artistNames: Array<string | null | undefined>,
  context: { artworkId?: string | null; title?: string | null } = {}
) {
  const config = resolvePublicArtworkRevalidationConfig();
  const normalizedArtistNames = normalizeRevalidationArtistNames(artistNames);

  if (!config.ok) {
    after(async () => {
      const missing = config.missing.join(', ');
      await Promise.allSettled([
        notifyEmail('error', '공개 작품 캐시 갱신 예약 실패', {
          작품ID: context.artworkId ?? '',
          작품명: context.title ?? '',
          누락설정: missing,
          참고: '작품 등록은 완료됐지만 공개 목록/작가 페이지 갱신 요청을 예약하지 못했습니다.',
        }),
        logSystemAction(
          'public_artwork_revalidation_failed',
          'artwork',
          context.artworkId ?? 'unknown',
          {
            title: context.title ?? null,
            artist_names: normalizedArtistNames,
            missing,
            stage: 'schedule_config',
          }
        ),
      ]);
    });
    return;
  }

  after(async () => {
    try {
      const response = await fetch(`${config.baseUrl}${INTERNAL_ARTWORK_REVALIDATE_PATH}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.cronSecret}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ artistNames: normalizedArtistNames }),
      });

      if (!response.ok) {
        await Promise.allSettled([
          notifyEmail('error', '공개 작품 캐시 갱신 요청 실패', {
            작품ID: context.artworkId ?? '',
            작품명: context.title ?? '',
            상태코드: String(response.status),
            참고: '작품 등록은 완료됐지만 공개 목록/작가 페이지 갱신 요청이 HTTP 실패로 끝났습니다.',
          }),
          logSystemAction(
            'public_artwork_revalidation_failed',
            'artwork',
            context.artworkId ?? 'unknown',
            {
              title: context.title ?? null,
              artist_names: normalizedArtistNames,
              status: response.status,
              stage: 'route_response',
            }
          ),
        ]);
      }
    } catch (err) {
      await Promise.allSettled([
        notifyEmail('error', '공개 작품 캐시 갱신 요청 실패', {
          작품ID: context.artworkId ?? '',
          작품명: context.title ?? '',
          에러: err instanceof Error ? err.message : String(err),
        }),
        logSystemAction(
          'public_artwork_revalidation_failed',
          'artwork',
          context.artworkId ?? 'unknown',
          {
            title: context.title ?? null,
            artist_names: normalizedArtistNames,
            error: err instanceof Error ? err.message : String(err),
            stage: 'route_fetch',
          }
        ),
      ]);
    }
  });
}

export async function updateArtworkDetails(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const details = parseAdminArtworkDetailsFormData(formData);
  const { oldArtwork, newArtwork, artistNames } = await updateAdminArtworkDetailsMutation(
    supabase,
    {
      id,
      details,
      now: new Date().toISOString(),
    }
  );

  revalidatePublicArtworkSurfaces(artistNames);
  revalidatePublicArtworkDetails([id]);
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${id}`);

  await logAdminAction('artwork_updated', 'artwork', id, { title: details.title }, admin.id, {
    summary: `작품 수정: ${details.title}`,
    beforeSnapshot: oldArtwork || null,
    afterSnapshot: newArtwork || null,
    reversible: true,
  });

  return { success: true };
}

async function createAdminArtworkRecord(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const details = parseAdminArtworkCreateFormData(formData);
  const { artwork, artistName } = await createAdminArtworkRecordMutation(supabase, { details });

  await logAdminAction(
    'artwork_created',
    'artwork',
    artwork.id,
    { title: details.title },
    admin.id,
    {
      afterSnapshot: artwork,
      reversible: true,
    }
  );

  // 등록 응답에는 관리자 목록만 가볍게 싣고, 공개면 tag/path 무효화는 응답 후 수행한다.
  // 하드 내비게이션 기반 등록 UX를 유지하면서도 KO/EN 목록·API tag·작가 경로는 같은 정책으로 갱신한다.
  revalidatePath('/admin/artworks');
  schedulePublicArtworkSurfaceRevalidation([artistName], {
    artworkId: artwork.id,
    title: artwork.title,
  });

  return artwork;
}

export async function createAdminArtwork(formData: FormData) {
  const artwork = await createAdminArtworkRecord(formData);
  return { success: true, id: artwork.id };
}
