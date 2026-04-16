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
