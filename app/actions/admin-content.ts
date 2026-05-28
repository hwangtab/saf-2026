'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { logAdminAction } from './activity-log-writer';
import { getString, getNumber } from '@/lib/utils/form-helpers';
import { validateUrl, validateTextLength } from '@/lib/utils/input-validation';

// admin 운영자 paste 사고(MB 단위 텍스트) 방어용 상한. 위협 모델은 권한 있는 admin이지
// 외부 공격자가 아니므로 관대한 한도 적용. RSC payload OOM + DB row bloat 차단이 목적.
// MAX_AUTHOR, MAX_QUOTE는 createTestimonial 등 추가 적용 대상 — 점진 확대.
const MAX_TITLE = 500;
const MAX_DESCRIPTION = 5000;
const MAX_TRANSCRIPT = 100_000;

const normalizeStoryTitleColonSpacing = (value: string) => value.replace(/[^\S\r\n]+:/g, ':');

export async function createNews(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const id = getString(formData, 'id') || crypto.randomUUID();
  const title = getString(formData, 'title');
  const source = getString(formData, 'source');
  const date = getString(formData, 'date');
  const link = validateUrl(getString(formData, 'link'), '링크');
  const thumbnail = validateUrl(getString(formData, 'thumbnail'), '썸네일');
  const description = getString(formData, 'description');

  const { data: news, error } = await supabase
    .from('news')
    .insert({
      id,
      title,
      source,
      date: date || null,
      link,
      thumbnail,
      description,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('news_created', 'news', id, { title, source }, admin.id, {
    afterSnapshot: news,
  });

  revalidatePath('/news');
  revalidatePath('/en/news');
  revalidatePath('/sitemap.xml');
  revalidateTag('news', 'max');
}

export async function updateNews(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: oldNews } = await supabase.from('news').select('*').eq('id', id).single();

  const title = getString(formData, 'title');
  const source = getString(formData, 'source');
  const date = getString(formData, 'date');
  const link = validateUrl(getString(formData, 'link'), '링크');
  const thumbnail = validateUrl(getString(formData, 'thumbnail'), '썸네일');
  const description = getString(formData, 'description');

  const { data: newNews, error } = await supabase
    .from('news')
    .update({
      title,
      source,
      date: date || null,
      link,
      thumbnail,
      description,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('news_updated', 'news', id, { title, source }, admin.id, {
    beforeSnapshot: oldNews,
    afterSnapshot: newNews,
    reversible: true,
  });

  revalidatePath('/news');
  revalidatePath('/en/news');
  revalidatePath('/sitemap.xml');
  revalidateTag('news', 'max');
}

export async function deleteNews(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: news } = await supabase.from('news').select('*').eq('id', id).single();

  const { error } = await supabase.from('news').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction('news_deleted', 'news', id, { title: news?.title }, admin.id, {
    beforeSnapshot: news,
    afterSnapshot: null,
    reversible: true,
  });

  revalidatePath('/news');
  revalidatePath('/en/news');
  revalidatePath('/sitemap.xml');
  revalidateTag('news', 'max');
}

export async function createFaq(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const question = getString(formData, 'question');
  const answer = getString(formData, 'answer');
  const question_en = getString(formData, 'question_en') || null;
  const answer_en = getString(formData, 'answer_en') || null;
  const display_order = getNumber(formData, 'display_order', 0);

  const { data, error } = await supabase
    .from('faq')
    .insert({
      question,
      answer,
      question_en,
      answer_en,
      display_order,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('faq_created', 'faq', data.id, { question, question_en }, admin.id, {
    afterSnapshot: data,
  });

  revalidatePath('/');
  revalidatePath('/en');
  revalidateTag('faqs', 'max');
}

export async function updateFaq(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: oldFaq } = await supabase.from('faq').select('*').eq('id', id).single();

  const question = getString(formData, 'question');
  const answer = getString(formData, 'answer');
  const question_en = getString(formData, 'question_en') || null;
  const answer_en = getString(formData, 'answer_en') || null;
  const display_order = getNumber(formData, 'display_order', 0);

  const { data: newFaq, error } = await supabase
    .from('faq')
    .update({
      question,
      answer,
      question_en,
      answer_en,
      display_order,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('faq_updated', 'faq', id, { question, question_en }, admin.id, {
    beforeSnapshot: oldFaq,
    afterSnapshot: newFaq,
    reversible: true,
  });

  revalidatePath('/');
  revalidatePath('/en');
  revalidateTag('faqs', 'max');
}

export async function deleteFaq(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: faq } = await supabase.from('faq').select('*').eq('id', id).single();

  const { error } = await supabase.from('faq').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction(
    'faq_deleted',
    'faq',
    id,
    { question: faq?.question, question_en: faq?.question_en },
    admin.id,
    {
      beforeSnapshot: faq,
      afterSnapshot: null,
      reversible: true,
    }
  );

  revalidatePath('/');
  revalidatePath('/en');
  revalidateTag('faqs', 'max');
}

export async function createTestimonial(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const category = getString(formData, 'category');
  const quote = getString(formData, 'quote');
  const author = getString(formData, 'author');
  const context = getString(formData, 'context');
  const display_order = getNumber(formData, 'display_order', 0);

  const { data, error } = await supabase
    .from('testimonials')
    .insert({
      category,
      quote,
      author,
      context,
      display_order,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(
    'testimonial_created',
    'testimonial',
    data.id,
    { author, category },
    admin.id,
    {
      afterSnapshot: data,
    }
  );

  revalidatePath('/our-reality');
  revalidatePath('/en/our-reality');
  revalidateTag('testimonials', 'max');
}

export async function updateTestimonial(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: oldTestimonial } = await supabase
    .from('testimonials')
    .select('*')
    .eq('id', id)
    .single();

  const category = getString(formData, 'category');
  const quote = getString(formData, 'quote');
  const author = getString(formData, 'author');
  const context = getString(formData, 'context');
  const display_order = getNumber(formData, 'display_order', 0);

  const { data: newTestimonial, error } = await supabase
    .from('testimonials')
    .update({
      category,
      quote,
      author,
      context,
      display_order,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('testimonial_updated', 'testimonial', id, { author, category }, admin.id, {
    beforeSnapshot: oldTestimonial,
    afterSnapshot: newTestimonial,
    reversible: true,
  });

  revalidatePath('/our-reality');
  revalidatePath('/en/our-reality');
  revalidateTag('testimonials', 'max');
}

export async function deleteTestimonial(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: testimonial } = await supabase
    .from('testimonials')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('testimonials').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction(
    'testimonial_deleted',
    'testimonial',
    id,
    { author: testimonial?.author, category: testimonial?.category },
    admin.id,
    {
      beforeSnapshot: testimonial,
      afterSnapshot: null,
      reversible: true,
    }
  );

  revalidatePath('/our-reality');
  revalidatePath('/en/our-reality');
  revalidateTag('testimonials', 'max');
}

export async function createVideo(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const youtube_id = getString(formData, 'youtube_id');
  const id = getString(formData, 'id') || youtube_id || crypto.randomUUID();
  const title = validateTextLength(getString(formData, 'title'), MAX_TITLE, '제목');
  const description = validateTextLength(
    getString(formData, 'description'),
    MAX_DESCRIPTION,
    '설명'
  );
  const thumbnail = validateUrl(getString(formData, 'thumbnail'), '썸네일');
  const transcript = validateTextLength(
    getString(formData, 'transcript'),
    MAX_TRANSCRIPT,
    '스크립트'
  );

  const { data: video, error } = await supabase
    .from('videos')
    .insert({
      id,
      title,
      description,
      youtube_id,
      thumbnail,
      transcript,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('video_created', 'video', id, { title, youtube_id }, admin.id, {
    afterSnapshot: video,
  });

  revalidatePath('/admin/content/videos');
  revalidatePath('/our-proof');
  revalidatePath('/en/our-proof');
}

export async function updateVideo(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: oldVideo } = await supabase.from('videos').select('*').eq('id', id).single();

  const youtube_id = getString(formData, 'youtube_id');
  const title = validateTextLength(getString(formData, 'title'), MAX_TITLE, '제목');
  const description = validateTextLength(
    getString(formData, 'description'),
    MAX_DESCRIPTION,
    '설명'
  );
  const thumbnail = validateUrl(getString(formData, 'thumbnail'), '썸네일');
  const transcript = validateTextLength(
    getString(formData, 'transcript'),
    MAX_TRANSCRIPT,
    '스크립트'
  );

  const { data: newVideo, error } = await supabase
    .from('videos')
    .update({
      title,
      description,
      youtube_id,
      thumbnail,
      transcript,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('video_updated', 'video', id, { title, youtube_id }, admin.id, {
    beforeSnapshot: oldVideo,
    afterSnapshot: newVideo,
    reversible: true,
  });

  revalidatePath('/admin/content/videos');
  revalidatePath('/our-proof');
  revalidatePath('/en/our-proof');
}

export async function deleteVideo(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: video } = await supabase.from('videos').select('*').eq('id', id).single();

  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction('video_deleted', 'video', id, { title: video?.title }, admin.id, {
    beforeSnapshot: video,
    afterSnapshot: null,
    reversible: true,
  });

  revalidatePath('/admin/content/videos');
  revalidatePath('/our-proof');
  revalidatePath('/en/our-proof');
}

// ─── Stories (매거진) ───

/**
 * Story 변경 시 그 story의 tags(작가 이름)에 매칭되는 모든 artwork detail 페이지를 revalidate.
 *
 * 배경: artwork detail 페이지의 "관련 매거진" 섹션은 allStories.filter(s => s.tags?.includes(artwork.artist))
 * 로 매칭. story 추가/수정/삭제 시 그 작가의 작품 detail은 ISR 캐시(revalidate=3600)에 stale로 남아
 * 매거진 변경이 1시간 동안 반영 안 됨. 더 심각한 건 dynamicParams=true로 first-request SSG라 작품마다
 * 다른 시점에 prerender → 같은 작가의 두 작품에서 한쪽만 매거진이 보이는 inconsistency 발생.
 *
 * 본 helper는 story.tags를 작가 이름으로 보고, 매칭되는 artists 레코드 → 그 작가의 모든 artwork id를
 * 모아 일괄 revalidate. 일반적으로 작가당 작품 5~15개라 호출 부담 작음.
 */
async function revalidateArtworksForStoryTags(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>,
  tags: string[] | null | undefined
): Promise<void> {
  if (!tags?.length) return;
  const trimmed = tags.map((t) => t?.trim()).filter((t): t is string => Boolean(t));
  if (!trimmed.length) return;

  const { data: artists } = await supabase.from('artists').select('id').in('name_ko', trimmed);
  if (!artists?.length) return;

  const artistIds = artists.map((a) => a.id);
  const { data: artworks } = await supabase
    .from('artworks')
    .select('id')
    .in('artist_id', artistIds);
  if (!artworks?.length) return;

  for (const artwork of artworks) {
    revalidatePath(`/artworks/${artwork.id}`);
    revalidatePath(`/en/artworks/${artwork.id}`);
  }
}

export async function createStory(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const title = normalizeStoryTitleColonSpacing(getString(formData, 'title'));
  const slug = getString(formData, 'slug');
  const title_en = normalizeStoryTitleColonSpacing(getString(formData, 'title_en')) || null;
  const category = getString(formData, 'category') || 'artist-story';
  const excerpt = getString(formData, 'excerpt') || null;
  const excerpt_en = getString(formData, 'excerpt_en') || null;
  const body = getString(formData, 'body');
  const body_en = getString(formData, 'body_en') || null;
  const thumbnail = validateUrl(getString(formData, 'thumbnail'), '썸네일');
  const author = getString(formData, 'author') || null;
  const published_at = getString(formData, 'published_at') || null;
  const is_published = formData.get('is_published') === 'on';
  const display_order = getNumber(formData, 'display_order', 0);

  const { data: story, error } = await supabase
    .from('stories')
    .insert({
      title,
      slug,
      title_en,
      category,
      excerpt,
      excerpt_en,
      body,
      body_en,
      thumbnail,
      author,
      published_at: published_at || undefined,
      is_published,
      display_order,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('story_created', 'story', story.id, { title, slug }, admin.id, {
    afterSnapshot: story,
  });

  revalidatePath('/stories');
  revalidatePath('/en/stories');
  revalidatePath('/sitemap.xml');
  revalidateTag('stories', 'max');
  await revalidateArtworksForStoryTags(supabase, story?.tags);
}

export async function updateStory(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: oldStory } = await supabase.from('stories').select('*').eq('id', id).single();

  const title = normalizeStoryTitleColonSpacing(getString(formData, 'title'));
  const slug = getString(formData, 'slug');
  const title_en = normalizeStoryTitleColonSpacing(getString(formData, 'title_en')) || null;
  const category = getString(formData, 'category') || 'artist-story';
  const excerpt = getString(formData, 'excerpt') || null;
  const excerpt_en = getString(formData, 'excerpt_en') || null;
  const body = getString(formData, 'body');
  const body_en = getString(formData, 'body_en') || null;
  const thumbnail = validateUrl(getString(formData, 'thumbnail'), '썸네일');
  const author = getString(formData, 'author') || null;
  const published_at = getString(formData, 'published_at') || null;
  const is_published = formData.get('is_published') === 'on';
  const display_order = getNumber(formData, 'display_order', 0);

  const { data: newStory, error } = await supabase
    .from('stories')
    .update({
      title,
      slug,
      title_en,
      category,
      excerpt,
      excerpt_en,
      body,
      body_en,
      thumbnail,
      author,
      published_at: published_at || undefined,
      is_published,
      display_order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('story_updated', 'story', id, { title, slug }, admin.id, {
    beforeSnapshot: oldStory,
    afterSnapshot: newStory,
    reversible: true,
  });

  revalidatePath('/stories');
  revalidatePath('/en/stories');
  revalidatePath('/sitemap.xml');
  revalidateTag('stories', 'max');
  // tags가 변경됐을 수도 있어 이전 + 신규 tags 모두 revalidate
  // (예: 작가 A → 작가 B로 tag 변경 시 양쪽 작가 작품 모두 갱신 필요)
  const allTags = [...(oldStory?.tags ?? []), ...(newStory?.tags ?? [])];
  await revalidateArtworksForStoryTags(supabase, allTags);
}

export async function deleteStory(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: story } = await supabase.from('stories').select('*').eq('id', id).single();

  const { error } = await supabase.from('stories').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction('story_deleted', 'story', id, { title: story?.title }, admin.id, {
    beforeSnapshot: story,
    afterSnapshot: null,
    reversible: true,
  });

  revalidatePath('/stories');
  revalidatePath('/en/stories');
  revalidatePath('/sitemap.xml');
  revalidateTag('stories', 'max');
  await revalidateArtworksForStoryTags(supabase, story?.tags);
}
