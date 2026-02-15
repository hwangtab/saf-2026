'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { logAdminAction } from './admin-logs';

const getString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return value ? String(value).trim() : '';
};

const getNumber = (formData: FormData, key: string, fallback = 0) => {
  const raw = formData.get(key);
  if (raw === null || raw === undefined || raw === '') return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
};

export async function createNews(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const id = getString(formData, 'id') || crypto.randomUUID();
  const title = getString(formData, 'title');
  const source = getString(formData, 'source');
  const date = getString(formData, 'date');
  const link = getString(formData, 'link');
  const thumbnail = getString(formData, 'thumbnail');
  const description = getString(formData, 'description');

  const { error } = await supabase.from('news').insert({
    id,
    title,
    source,
    date: date || null,
    link,
    thumbnail,
    description,
  });

  if (error) throw error;

  await logAdminAction('news_created', 'news', id, { title, source }, admin.id);

  revalidatePath('/news');
  revalidatePath('/sitemap.xml');
}

export async function updateNews(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const title = getString(formData, 'title');
  const source = getString(formData, 'source');
  const date = getString(formData, 'date');
  const link = getString(formData, 'link');
  const thumbnail = getString(formData, 'thumbnail');
  const description = getString(formData, 'description');

  const { error } = await supabase
    .from('news')
    .update({
      title,
      source,
      date: date || null,
      link,
      thumbnail,
      description,
    })
    .eq('id', id);

  if (error) throw error;

  await logAdminAction('news_updated', 'news', id, { title, source }, admin.id);

  revalidatePath('/news');
  revalidatePath('/sitemap.xml');
}

export async function deleteNews(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: news } = await supabase.from('news').select('title').eq('id', id).single();

  const { error } = await supabase.from('news').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction('news_deleted', 'news', id, { title: news?.title }, admin.id);

  revalidatePath('/news');
  revalidatePath('/sitemap.xml');
}

export async function createFaq(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const question = getString(formData, 'question');
  const answer = getString(formData, 'answer');
  const display_order = getNumber(formData, 'display_order', 0);

  const { data, error } = await supabase
    .from('faq')
    .insert({
      question,
      answer,
      display_order,
    })
    .select('id')
    .single();

  if (error) throw error;

  await logAdminAction('faq_created', 'faq', data.id, { question }, admin.id);

  revalidatePath('/');
}

export async function updateFaq(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const question = getString(formData, 'question');
  const answer = getString(formData, 'answer');
  const display_order = getNumber(formData, 'display_order', 0);

  const { error } = await supabase
    .from('faq')
    .update({
      question,
      answer,
      display_order,
    })
    .eq('id', id);

  if (error) throw error;

  await logAdminAction('faq_updated', 'faq', id, { question }, admin.id);

  revalidatePath('/');
}

export async function deleteFaq(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: faq } = await supabase.from('faq').select('question').eq('id', id).single();

  const { error } = await supabase.from('faq').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction('faq_deleted', 'faq', id, { question: faq?.question }, admin.id);

  revalidatePath('/');
}

export async function createTestimonial(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

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
    .select('id')
    .single();

  if (error) throw error;

  await logAdminAction(
    'testimonial_created',
    'testimonial',
    data.id,
    { author, category },
    admin.id
  );

  revalidatePath('/our-reality');
}

export async function updateTestimonial(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const category = getString(formData, 'category');
  const quote = getString(formData, 'quote');
  const author = getString(formData, 'author');
  const context = getString(formData, 'context');
  const display_order = getNumber(formData, 'display_order', 0);

  const { error } = await supabase
    .from('testimonials')
    .update({
      category,
      quote,
      author,
      context,
      display_order,
    })
    .eq('id', id);

  if (error) throw error;

  await logAdminAction('testimonial_updated', 'testimonial', id, { author, category }, admin.id);

  revalidatePath('/our-reality');
}

export async function deleteTestimonial(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: testimonial } = await supabase
    .from('testimonials')
    .select('author, category')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('testimonials').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction(
    'testimonial_deleted',
    'testimonial',
    id,
    { author: testimonial?.author, category: testimonial?.category },
    admin.id
  );

  revalidatePath('/our-reality');
}

export async function createVideo(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const youtube_id = getString(formData, 'youtube_id');
  const id = getString(formData, 'id') || youtube_id || crypto.randomUUID();
  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const thumbnail = getString(formData, 'thumbnail');
  const transcript = getString(formData, 'transcript');

  const { error } = await supabase.from('videos').insert({
    id,
    title,
    description,
    youtube_id,
    thumbnail,
    transcript,
  });

  if (error) throw error;

  await logAdminAction('video_created', 'video', id, { title, youtube_id }, admin.id);

  revalidatePath('/admin/content/videos');
  revalidatePath('/our-proof');
}

export async function updateVideo(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const youtube_id = getString(formData, 'youtube_id');
  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const thumbnail = getString(formData, 'thumbnail');
  const transcript = getString(formData, 'transcript');

  const { error } = await supabase
    .from('videos')
    .update({
      title,
      description,
      youtube_id,
      thumbnail,
      transcript,
    })
    .eq('id', id);

  if (error) throw error;

  await logAdminAction('video_updated', 'video', id, { title, youtube_id }, admin.id);

  revalidatePath('/admin/content/videos');
  revalidatePath('/our-proof');
}

export async function deleteVideo(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: video } = await supabase.from('videos').select('title').eq('id', id).single();

  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) throw error;

  await logAdminAction('video_deleted', 'video', id, { title: video?.title }, admin.id);

  revalidatePath('/admin/content/videos');
  revalidatePath('/our-proof');
}
