'use server';

import { revalidatePath } from 'next/cache';

import { logAdminAction } from '@/app/actions/activity-log-writer';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { buildCaptionDraft } from '@/lib/social/caption';
import { resolvePublicImageUrl } from '@/lib/social/image-url';
import { getAdapter, getPlatformConfigStatuses } from '@/lib/social/registry';
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

const MAX_CAPTION_LENGTH = 2200; // Instagram caption 상한

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

/** 작품 선택 시 캡션 초안 + 공개 이미지 URL을 생성. */
export async function prepareSocialDraft(
  artworkId: string
): Promise<{ caption: string; imageUrl: string | null }> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data, error } = await supabase
    .from('artworks')
    .select('id, title, material, size, price, images, artists(name_ko)')
    .eq('id', artworkId)
    .single();

  if (error || !data) {
    return { caption: '', imageUrl: null };
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
  });

  return { caption, imageUrl: resolvePublicImageUrl(firstImage) };
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

  // 1) 이력 행 생성 (publishing)
  const { data: inserted, error: insertError } = await supabase
    .from('social_posts')
    .insert({
      platform,
      artwork_id: input.artworkId ?? null,
      caption,
      image_url: imageUrl,
      status: 'publishing',
      created_by: admin.id,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('[admin-social] insert error:', insertError);
    return { message: '게시 이력 생성에 실패했습니다.', error: true };
  }

  const postId = inserted.id;

  // 2) 발송
  try {
    const adapter = getAdapter(platform);
    const result = await adapter.publish({ caption, imageUrl: imageUrl ?? undefined });

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

    await logAdminAction('social_publish', 'social_post', postId, {
      platform,
      artworkId: input.artworkId ?? null,
      platformPostId: result.platformPostId,
    });

    revalidatePath('/admin/social');
    return {
      message: `${platform === 'instagram' ? 'Instagram' : 'Threads'}에 게시했습니다.`,
      postId,
      permalink: result.permalink,
    };
  } catch (err) {
    const errorMessage =
      err instanceof SocialPublishError
        ? err.message
        : err instanceof Error
          ? err.message
          : '알 수 없는 오류로 게시에 실패했습니다.';
    console.error('[admin-social] publish failed:', err);

    await supabase
      .from('social_posts')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', postId);

    await logAdminAction('social_publish_failed', 'social_post', postId, {
      platform,
      error: errorMessage,
    });

    revalidatePath('/admin/social');
    return { message: errorMessage, error: true, postId };
  }
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
