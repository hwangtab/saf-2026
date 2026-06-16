'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { resolveActorIdentity, writeActivityLog } from './_log-internals';
import type { Json } from '@/types/supabase';

export type { LogOptions, ActorInfo } from './_log-internals';

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>,
  _adminId?: string, // 하위호환 유지용 — 내부적으로는 항상 requireAdmin()으로 검증
  options?: Parameters<typeof writeActivityLog>[0]['options']
) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();
  const actor = await resolveActorIdentity(admin.id, 'admin');

  const { error: legacyError } = await supabase.from('admin_logs').insert({
    admin_id: admin.id,
    action,
    target_type: targetType || null,
    target_id: targetId || null,
    details: (details || null) as Json,
  });

  if (legacyError) {
    console.error('Failed to log legacy admin action:', legacyError);
  }

  await writeActivityLog({
    actor: { id: admin.id, role: 'admin', name: actor.name, email: actor.email },
    action,
    targetType: targetType || 'unknown',
    targetId: targetId || 'unknown',
    metadata: details,
    options,
  });
}

export async function logArtistAction(
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>,
  options?: Parameters<typeof writeActivityLog>[0]['options']
) {
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return;
  }

  const actor = await resolveActorIdentity(user.id, 'artist', user.email || null);

  await writeActivityLog({
    actor: {
      id: user.id,
      role: 'artist',
      name: actor.name,
      email: actor.email,
    },
    action,
    targetType,
    targetId,
    metadata: details,
    options,
  });
}

/**
 * 비로그인 구매자(셀프서비스 주문 취소·배송지 변경 등) 행위 로그.
 * 인증된 user가 없으므로 actor_role='system'으로 기록하고
 * metadata.buyer_email로 행위자를 식별한다.
 */
export async function logBuyerAction(
  action: string,
  targetType: string,
  targetId: string,
  buyerEmail: string,
  details?: Record<string, unknown>,
  options?: Parameters<typeof writeActivityLog>[0]['options']
) {
  await writeActivityLog({
    actor: {
      id: '00000000-0000-0000-0000-000000000000',
      role: 'system',
      name: '구매자(셀프서비스)',
      email: buyerEmail,
    },
    action,
    targetType,
    targetId,
    metadata: { ...(details ?? {}), buyer_email: buyerEmail },
    options,
  });
}

/**
 * 시스템 이벤트(결제 실패 등 — 인증된 actor가 없는 자동 이벤트) 로그.
 * /admin/logs 감사 추적 + 관리자 알림 벨(getAdminNotifications) 소스로 함께 쓰인다.
 * 인증을 요구하지 않으므로 route handler·webhook에서 직접 호출 가능.
 */
export async function logSystemAction(
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>,
  options?: Parameters<typeof writeActivityLog>[0]['options']
) {
  await writeActivityLog({
    actor: { id: '00000000-0000-0000-0000-000000000000', role: 'system', name: '시스템' },
    action,
    targetType,
    targetId,
    metadata: details,
    options,
  });
}

export async function logExhibitorAction(
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>,
  options?: Parameters<typeof writeActivityLog>[0]['options']
) {
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return;
  }

  const actor = await resolveActorIdentity(user.id, 'exhibitor', user.email || null);

  await writeActivityLog({
    actor: {
      id: user.id,
      role: 'exhibitor',
      name: actor.name,
      email: actor.email,
    },
    action,
    targetType,
    targetId,
    metadata: details,
    options,
  });
}
