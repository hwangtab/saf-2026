import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import { buildCaptionDraft } from './caption';
import { resolvePublicImageUrl } from './image-url';
import { getAdapter } from './registry';
import { SocialPublishError, type Platform } from './types';

type Client = SupabaseClient<Database>;

export interface ArtworkCaption {
  caption: string;
  imageUrl: string | null;
  status: string; // 'available' | 'reserved' | 'sold'
  isHidden: boolean;
}

/**
 * 작품 전체 필드를 읽어 캡션 초안 + 공개 이미지 URL + 판매상태를 만든다.
 * admin prepareSocialDraft와 자동게시 cron이 공유(캡션 로직 단일 출처).
 */
export async function buildCaptionForArtwork(
  supabase: Client,
  artworkId: string
): Promise<ArtworkCaption | null> {
  const { data, error } = await supabase
    .from('artworks')
    .select(
      'id, title, material, size, price, description, quote, images, status, is_hidden, artists(name_ko, bio)'
    )
    .eq('id', artworkId)
    .single();

  if (error || !data) return null;

  const artist = Array.isArray(data.artists) ? data.artists[0] : data.artists;
  const images = Array.isArray(data.images) ? data.images : [];
  const firstImage = typeof images[0] === 'string' ? images[0] : null;

  const caption = buildCaptionDraft({
    id: data.id,
    title: data.title,
    artistName: artist?.name_ko ?? null,
    medium: data.material,
    size: data.size,
    price: data.price,
    description: data.description,
    quote: data.quote,
    bio: artist?.bio ?? null,
  });

  return {
    caption,
    imageUrl: resolvePublicImageUrl(firstImage),
    status: data.status ?? 'available',
    isHidden: Boolean(data.is_hidden),
  };
}

export interface ExecutePublishInput {
  platform: Platform;
  artworkId: string | null;
  caption: string;
  imageUrl: string | null;
  createdBy?: string | null;
}

export interface ExecutePublishResult {
  ok: boolean;
  postId?: string;
  permalink?: string | null;
  message: string;
}

/**
 * 게시 코어: social_posts 이력 INSERT(publishing) → 어댑터 발송 → 성공/실패 UPDATE.
 * admin 액션(publishSocialPost)과 자동게시 cron이 공유. 관리자 인증·로깅·revalidate는 호출자 책임.
 */
export async function executePublish(
  supabase: Client,
  input: ExecutePublishInput
): Promise<ExecutePublishResult> {
  const { platform, artworkId, caption, imageUrl, createdBy = null } = input;

  const { data: inserted, error: insertError } = await supabase
    .from('social_posts')
    .insert({
      platform,
      artwork_id: artworkId,
      caption,
      image_url: imageUrl,
      status: 'publishing',
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('[publish-core] insert error:', insertError);
    return { ok: false, message: '게시 이력 생성에 실패했습니다.' };
  }

  const postId = inserted.id;

  try {
    const result = await getAdapter(platform).publish({
      caption,
      imageUrl: imageUrl ?? undefined,
    });
    await supabase
      .from('social_posts')
      .update({
        status: 'published',
        platform_post_id: result.platformPostId,
        permalink: result.permalink,
        published_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', postId);
    return {
      ok: true,
      postId,
      permalink: result.permalink,
      message: `${platform === 'instagram' ? 'Instagram' : 'Threads'}에 게시했습니다.`,
    };
  } catch (err) {
    const errorMessage =
      err instanceof SocialPublishError
        ? err.message
        : err instanceof Error
          ? err.message
          : '알 수 없는 오류로 게시에 실패했습니다.';
    console.error('[publish-core] publish failed:', err);
    await supabase
      .from('social_posts')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', postId);
    return { ok: false, postId, message: errorMessage };
  }
}

export interface PublishHistoryStat {
  count: number;
  lastPublishedAt: string | null;
}

/**
 * social_posts(published + 진행중 publishing) 집계 — artwork_id별 게시 횟수 + 마지막 게시 시각.
 * 후보 패널·prepareSocialDraft·자동게시가 공유. (수백 행 → JS reduce로 충분.)
 * 'publishing'(insert 후 어댑터 완료 전 중단)도 포함 — cron이 maxDuration으로 죽어 멈춘 행을
 * postCount=0으로 보고 다음 실행이 같은 작품을 재게시(SNS 중복 포스팅)하던 버그 방지.
 * published_at은 'published'에만 있으므로 lastPublishedAt 계산은 영향 없음(null은 자동 제외).
 */
export async function aggregatePublishHistory(
  supabase: Client,
  artworkIds: string[]
): Promise<Map<string, PublishHistoryStat>> {
  const result = new Map<string, PublishHistoryStat>();
  if (artworkIds.length === 0) return result;

  const { data, error } = await supabase
    .from('social_posts')
    .select('artwork_id, published_at')
    .in('status', ['published', 'publishing'])
    .in('artwork_id', artworkIds);

  if (error || !data) return result;

  for (const row of data) {
    if (!row.artwork_id) continue;
    const ts = row.published_at;
    const prev = result.get(row.artwork_id);
    if (!prev) {
      result.set(row.artwork_id, { count: 1, lastPublishedAt: ts });
    } else {
      prev.count += 1;
      if (ts && (!prev.lastPublishedAt || ts > prev.lastPublishedAt)) {
        prev.lastPublishedAt = ts;
      }
    }
  }
  return result;
}

/** 자동게시 선정용 경량 후보(이미지·작가등급·게시이력). admin 인증 없이 cron이 사용. */
export interface AutopostCandidate {
  id: string;
  title: string | null;
  artistName: string | null;
  careerTier: string | null;
  image: string | null;
  postCount: number;
  lastPublishedAt: string | null;
}

/** available + 미숨김 작품을 게시 이력과 함께 조회(자동게시 cron용). */
export async function fetchPublishCandidates(supabase: Client): Promise<AutopostCandidate[]> {
  const { data, error } = await supabase
    .from('artworks')
    .select('id, title, images, created_at, artists(name_ko, career_tier)')
    .eq('is_hidden', false)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(600);

  if (error || !data) return [];

  const history = await aggregatePublishHistory(
    supabase,
    data.map((a) => a.id)
  );

  return data.map((a) => {
    const artist = Array.isArray(a.artists) ? a.artists[0] : a.artists;
    const images = Array.isArray(a.images) ? a.images : [];
    const stat = history.get(a.id);
    return {
      id: a.id,
      title: a.title,
      artistName: artist?.name_ko ?? null,
      careerTier: artist?.career_tier ?? null,
      image: typeof images[0] === 'string' ? images[0] : null,
      postCount: stat?.count ?? 0,
      lastPublishedAt: stat?.lastPublishedAt ?? null,
    };
  });
}
