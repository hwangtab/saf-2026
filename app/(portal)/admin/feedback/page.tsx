import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  sanitizeNullableSingleLineTextForRscPayload,
  sanitizeNullableTextForRscPayload,
  sanitizeSingleLineTextForRscPayload,
  sanitizeTextForRscPayload,
} from '@/lib/utils/text-sanitizer';
import { FeedbackManager } from './feedback-manager';

export default async function FeedbackPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: feedback } = await supabase
    .from('feedback')
    .select(
      'id, user_id, category, page_url, title, description, status, admin_note, created_at, resolved_at'
    )
    .order('created_at', { ascending: false });

  // Fetch user emails for display
  const userIds = [...new Set((feedback || []).map((f) => f.user_id))];
  const emailMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    for (const p of profiles || []) {
      if (p.email) emailMap[p.id] = p.email;
    }
  }

  const feedbackWithEmail = (feedback || []).map((f) => ({
    ...f,
    page_url: sanitizeNullableSingleLineTextForRscPayload(f.page_url),
    title: sanitizeSingleLineTextForRscPayload(f.title),
    description: sanitizeTextForRscPayload(f.description),
    admin_note: sanitizeNullableTextForRscPayload(f.admin_note),
    user_email: sanitizeSingleLineTextForRscPayload(emailMap[f.user_id] || '알 수 없음'),
  }));

  return <FeedbackManager feedback={feedbackWithEmail} />;
}
