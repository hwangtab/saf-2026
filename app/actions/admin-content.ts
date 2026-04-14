'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { logAdminAction } from './admin-logs';
import { getString, getNumber } from '@/lib/utils/form-helpers';

const normalizeStoryTitleColonSpacing = (value: string) => value.replace(/[^\S\r\n]+:/g, ':');

export async function createNews(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const id = getString(formData, 'id') || crypto.randomUUID();
  const title = getString(formData, 'title');
  const source = getString(formData, 'source');
  const date = getString(formData, 'date');
  const link = getString(formData, 'link');
  const thumbnail = getString(formData, 'thumbnail');
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
  revalidatePath('/sitemap.xml');
  revalidateTag('news', 'max');
}

export async function updateNews(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: oldNews } = await supabase.from('news').select('*').eq('id', id).single();

  const title = getString(formData, 'title');
  const source = getString(formData, 'source');
  const date = getString(formData, 'date');
  const link = getString(formData, 'link');
  const thumbnail = getString(formData, 'thumbnail');
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
  revalidatePath('/sitemap.xml');
  revalidateTag('news', 'max');
}

export async function deleteNews(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: news } = await supabase.from('news').select('*').eq('id', id).single();

  const { error } = await supabase.from('news').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction('news_deleted', 'news', id, { title: news?.title }, admin.id, {
    beforeSnapshot: news,
    afterSnapshot: null,
    reversible: true,
  });

  revalidatePath('/news');
  revalidatePath('/sitemap.xml');
  revalidateTag('news', 'max');
}

export async function createFaq(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

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
  const supabase = await createSupabaseAdminClient();

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
  const supabase = await createSupabaseAdminClient();

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
  const supabase = await createSupabaseAdminClient();

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
  revalidateTag('testimonials', 'max');
}

export async function updateTestimonial(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

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
  revalidateTag('testimonials', 'max');
}

export async function deleteTestimonial(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

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
  revalidateTag('testimonials', 'max');
}

export async function createVideo(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const youtube_id = getString(formData, 'youtube_id');
  const id = getString(formData, 'id') || youtube_id || crypto.randomUUID();
  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const thumbnail = getString(formData, 'thumbnail');
  const transcript = getString(formData, 'transcript');

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
}

export async function updateVideo(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: oldVideo } = await supabase.from('videos').select('*').eq('id', id).single();

  const youtube_id = getString(formData, 'youtube_id');
  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const thumbnail = getString(formData, 'thumbnail');
  const transcript = getString(formData, 'transcript');

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
}

export async function deleteVideo(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

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
}

// ─── Stories (매거진) ───

export async function createStory(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const title = normalizeStoryTitleColonSpacing(getString(formData, 'title'));
  const slug = getString(formData, 'slug');
  const title_en = normalizeStoryTitleColonSpacing(getString(formData, 'title_en')) || null;
  const category = getString(formData, 'category') || 'artist-story';
  const excerpt = getString(formData, 'excerpt') || null;
  const excerpt_en = getString(formData, 'excerpt_en') || null;
  const body = getString(formData, 'body');
  const body_en = getString(formData, 'body_en') || null;
  const thumbnail = getString(formData, 'thumbnail') || null;
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
  revalidatePath('/sitemap.xml');
  revalidateTag('stories', 'max');
}

export async function updateStory(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: oldStory } = await supabase.from('stories').select('*').eq('id', id).single();

  const title = normalizeStoryTitleColonSpacing(getString(formData, 'title'));
  const slug = getString(formData, 'slug');
  const title_en = normalizeStoryTitleColonSpacing(getString(formData, 'title_en')) || null;
  const category = getString(formData, 'category') || 'artist-story';
  const excerpt = getString(formData, 'excerpt') || null;
  const excerpt_en = getString(formData, 'excerpt_en') || null;
  const body = getString(formData, 'body');
  const body_en = getString(formData, 'body_en') || null;
  const thumbnail = getString(formData, 'thumbnail') || null;
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
  revalidatePath('/sitemap.xml');
  revalidateTag('stories', 'max');
}

export async function deleteStory(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: story } = await supabase.from('stories').select('*').eq('id', id).single();

  const { error } = await supabase.from('stories').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction('story_deleted', 'story', id, { title: story?.title }, admin.id, {
    beforeSnapshot: story,
    afterSnapshot: null,
    reversible: true,
  });

  revalidatePath('/stories');
  revalidatePath('/sitemap.xml');
  revalidateTag('stories', 'max');
}
