'use server';

import { revalidatePath } from 'next/cache';

import { logAdminAction } from '@/app/actions/activity-log-writer';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { buildCaptionDraft } from '@/lib/social/caption';
import { sortCandidatesForPublishing } from '@/lib/social/candidate-sort';
import { resolvePublicImageUrl } from '@/lib/social/image-url';
import { aggregatePublishHistory, executePublish } from '@/lib/social/publish-core';
import { getPlatformConfigStatuses } from '@/lib/social/registry';
import { isPlatform, SocialPublishError, type Platform } from '@/lib/social/types';
import type { ActionState } from '@/types';

export interface SocialPostListItem {
  id: string;
  platform: Platform;
  status: string;
  caption: string;
  imageUrl: string | null;
  permalink: string | null;
  platformPostId: string | null;
  errorMessage: string | null;
  artworkId: string | null;
  artworkTitle: string | null;
  artworkImage: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface PublishSocialPostInput {
  platform: string;
  artworkId?: string | null;
  caption: string;
  imageUrl?: string | null;
}

/** 작품 선택 시 캡션·가드·이력 신호를 한 번에 내려주는 초안. */
export interface SocialDraft {
  caption: string;
  imageUrl: string | null;
  status: string; // 'available' | 'reserved' | 'sold'
  isHidden: boolean;
  postCount: number;
  lastPublishedAt: string | null;
}

/** 게시 후보 카드 한 건 (추천 패널). */
export interface PublishCandidate {
  id: string;
  title: string | null;
  artistName: string | null;
  careerTier: string | null; // '신진' | '중견' | '거장'
  category: string | null;
  image: string | null; // images[0] (raw)
  createdAt: string | null;
  postCount: number;
  lastPublishedAt: string | null;
}

// 안전 상한(abuse 방지). Instagram은 어댑터가 2200자로 축약, Threads는 답글 체인으로 분할하므로
// 길이 자체는 막지 않는다(긴 작가 소개/설명 허용).
const MAX_CAPTION_LENGTH = 20000;

function normalizePlatform(value: string): Platform {
  if (!isPlatform(value)) {
    throw new SocialPublishError('알 수 없는 플랫폼입니다.');
  }
  return value;
}

/** 각 플랫폼 환경 변수 설정 여부 (UI 비활성·안내 배너). */
export async function getSocialConfigStatus() {
  await requireAdmin();
  return getPlatformConfigStatuses();
}

/** 작품 선택 시 캡션 초안 + 공개 이미지 URL + 판매상태/게시이력(가드·배지용)을 생성. */
export async function prepareSocialDraft(artworkId: string): Promise<SocialDraft> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const empty: SocialDraft = {
    caption: '',
    imageUrl: null,
    status: 'available',
    isHidden: false,
    postCount: 0,
    lastPublishedAt: null,
  };

  const { data, error } = await supabase
    .from('artworks')
    .select(
      'id, title, material, size, price, description, quote, images, status, is_hidden, artists(name_ko, bio)'
    )
    .eq('id', artworkId)
    .single();

  if (error || !data) {
    return empty;
  }

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

  const stat = (await aggregatePublishHistory(supabase, [artworkId])).get(artworkId);

  return {
    caption,
    imageUrl: resolvePublicImageUrl(firstImage),
    status: data.status ?? 'available',
    isHidden: Boolean(data.is_hidden),
    postCount: stat?.count ?? 0,
    lastPublishedAt: stat?.lastPublishedAt ?? null,
  };
}

/**
 * 게시 후보 목록 — available + 미숨김 작품을 게시 이력으로 annotate.
 * 정렬: 미게시 우선 → 가장 오래전 게시순(신선도) → 미게시끼리는 신착순.
 */
export async function listPublishCandidates(): Promise<PublishCandidate[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data, error } = await supabase
    .from('artworks')
    .select('id, title, category, images, created_at, artists(name_ko, career_tier)')
    .eq('is_hidden', false)
    .eq('status', 'available')
    .limit(600);

  if (error || !data) return [];

  const history = await aggregatePublishHistory(
    supabase,
    data.map((a) => a.id)
  );

  const candidates: PublishCandidate[] = data.map((a) => {
    const artist = Array.isArray(a.artists) ? a.artists[0] : a.artists;
    const images = Array.isArray(a.images) ? a.images : [];
    const stat = history.get(a.id);
    return {
      id: a.id,
      title: a.title,
      artistName: artist?.name_ko ?? null,
      careerTier: artist?.career_tier ?? null,
      category: a.category,
      image: typeof images[0] === 'string' ? images[0] : null,
      createdAt: a.created_at,
      postCount: stat?.count ?? 0,
      lastPublishedAt: stat?.lastPublishedAt ?? null,
    };
  });

  return sortCandidatesForPublishing(candidates);
}

/**
 * 단일 플랫폼에 게시. social_posts에 이력을 남기고 어댑터로 발송한다.
 * 성공/실패 모두 행으로 기록되어 이력·재시도에 사용된다.
 */
export async function publishSocialPost(
  input: PublishSocialPostInput
): Promise<ActionState & { postId?: string; permalink?: string | null }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  let platform: Platform;
  try {
    platform = normalizePlatform(input.platform);
  } catch (err) {
    return { message: err instanceof Error ? err.message : '잘못된 요청입니다.', error: true };
  }

  const caption = (input.caption ?? '').trim();
  if (!caption) {
    return { message: '캡션을 입력해 주세요.', error: true };
  }
  if (caption.length > MAX_CAPTION_LENGTH) {
    return { message: `캡션은 최대 ${MAX_CAPTION_LENGTH}자까지 가능합니다.`, error: true };
  }

  const imageUrl = input.imageUrl?.trim() || null;
  if (platform === 'instagram' && !imageUrl) {
    return { message: 'Instagram 게시에는 이미지가 필요합니다.', error: true };
  }

  // 게시 코어(이력 INSERT → 발송 → UPDATE)는 cron과 공유.
  const result = await executePublish(supabase, {
    platform,
    artworkId: input.artworkId ?? null,
    caption,
    imageUrl,
    createdBy: admin.id,
  });

  if (result.ok && result.postId) {
    await logAdminAction('social_publish', 'social_post', result.postId, {
      platform,
      artworkId: input.artworkId ?? null,
    });
  } else if (result.postId) {
    await logAdminAction('social_publish_failed', 'social_post', result.postId, {
      platform,
      error: result.message,
    });
  }

  revalidatePath('/admin/social');
  return {
    message: result.message,
    error: !result.ok,
    postId: result.postId,
    permalink: result.permalink,
  };
}

/** 실패/완료 게시를 같은 입력으로 재발송 (원본 이력은 유지, 새 행 생성). */
export async function retrySocialPost(
  id: string
): Promise<ActionState & { postId?: string; permalink?: string | null }> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data, error } = await supabase
    .from('social_posts')
    .select('platform, artwork_id, caption, image_url')
    .eq('id', id)
    .single();

  if (error || !data) {
    return { message: '재시도할 게시를 찾을 수 없습니다.', error: true };
  }

  return publishSocialPost({
    platform: data.platform,
    artworkId: data.artwork_id,
    caption: data.caption,
    imageUrl: data.image_url,
  });
}

/** 이력 행 삭제 (실제 게시물은 삭제하지 않음). */
export async function deleteSocialPost(id: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { error } = await supabase.from('social_posts').delete().eq('id', id);
  if (error) {
    return { message: '이력 삭제에 실패했습니다.', error: true };
  }

  await logAdminAction('social_post_delete', 'social_post', id);
  revalidatePath('/admin/social');
  return { message: '이력을 삭제했습니다.' };
}

/** 최근 게시 이력 (작품 제목·썸네일 포함). */
export async function listSocialPosts(limit = 50): Promise<SocialPostListItem[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data, error } = await supabase
    .from('social_posts')
    .select(
      'id, platform, status, caption, image_url, permalink, platform_post_id, error_message, artwork_id, created_at, published_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('[admin-social] list error:', error);
    return [];
  }

  // 작품 제목·썸네일 보강 (FK embed 대신 별도 조회로 단순화).
  const artworkIds = Array.from(
    new Set(data.map((row) => row.artwork_id).filter((v): v is string => Boolean(v)))
  );
  const artworkMap = new Map<string, { title: string | null; image: string | null }>();
  if (artworkIds.length > 0) {
    const { data: artworks } = await supabase
      .from('artworks')
      .select('id, title, images')
      .in('id', artworkIds);
    for (const art of artworks ?? []) {
      const images = Array.isArray(art.images) ? art.images : [];
      artworkMap.set(art.id, {
        title: art.title,
        image: typeof images[0] === 'string' ? images[0] : null,
      });
    }
  }

  return data.map((row) => {
    const art = row.artwork_id ? artworkMap.get(row.artwork_id) : undefined;
    return {
      id: row.id,
      platform: (isPlatform(row.platform) ? row.platform : 'instagram') as Platform,
      status: row.status,
      caption: row.caption,
      imageUrl: row.image_url,
      permalink: row.permalink,
      platformPostId: row.platform_post_id,
      errorMessage: row.error_message,
      artworkId: row.artwork_id,
      artworkTitle: art?.title ?? null,
      artworkImage: art?.image ?? null,
      createdAt: row.created_at,
      publishedAt: row.published_at,
    };
  });
}
