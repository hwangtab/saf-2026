'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { getString } from '@/lib/utils/form-helpers';
import { getActionErrorMessage } from '@/lib/utils/action-error';
import type { FeedbackCategory, FeedbackStatus } from '@/types';

const VALID_CATEGORIES: FeedbackCategory[] = ['bug', 'improvement', 'question', 'other'];
const VALID_STATUSES: FeedbackStatus[] = ['open', 'reviewing', 'resolved', 'closed'];

export async function submitFeedback(formData: FormData) {
  const user = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const category = getString(formData, 'category') as FeedbackCategory;
  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const pageUrl = getString(formData, 'page_url');

  if (!VALID_CATEGORIES.includes(category)) {
    return { error: '올바른 카테고리를 선택해주세요.' };
  }
  if (!title) {
    return { error: '제목을 입력해주세요.' };
  }
  if (!description) {
    return { error: '내용을 입력해주세요.' };
  }

  const { error } = await supabase.from('feedback').insert({
    user_id: user.id,
    category,
    title,
    description,
    page_url: pageUrl || null,
  });

  if (error) {
    return { error: getActionErrorMessage(error, '피드백 제출 중 오류가 발생했습니다.') };
  }

  revalidatePath('/admin/feedback');
  return { success: true };
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus, adminNote?: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  if (!VALID_STATUSES.includes(status)) {
    return { error: '올바른 상태값이 아닙니다.' };
  }

  const updateData: Record<string, unknown> = {
    status,
    admin_note: adminNote?.trim() || null,
  };

  if (status === 'resolved' || status === 'closed') {
    updateData.resolved_at = new Date().toISOString();
  } else {
    updateData.resolved_at = null;
  }

  const { error } = await supabase.from('feedback').update(updateData).eq('id', id);

  if (error) {
    return { error: getActionErrorMessage(error, '상태 변경 중 오류가 발생했습니다.') };
  }

  revalidatePath('/admin/feedback');
  return { success: true };
}
