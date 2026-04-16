'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import type { Json } from '@/types/supabase';

export type LogOptions = {
  summary?: string;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  reversible?: boolean;
};

export type ActorInfo = {
  id: string;
  role: 'admin' | 'artist' | 'system' | 'exhibitor';
  name?: string | null;
  email?: string | null;
};

const TRASH_RETENTION_DAYS = 30;
const TRASHABLE_DELETE_ACTIONS = new Set([
  'artwork_deleted',
  'artist_deleted',
  'artist_artwork_deleted',
  'batch_artwork_deleted',
]);

export async function resolveActorIdentity(
  actorId: string,
  role: 'admin' | 'artist' | 'exhibitor',
  fallbackEmail?: string | null
): Promise<{ name: string | null; email: string | null }> {
  const supabase = await createSupabaseAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', actorId)
    .maybeSingle();

  if (role === 'artist') {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('user_id', actorId)
      .maybeSingle();

    return {
      name: artist?.name_ko || profile?.name || null,
      email: profile?.email || fallbackEmail || null,
    };
  }

  return {
    name: profile?.name || null,
    email: profile?.email || fallbackEmail || null,
  };
}

function isTrashableDeleteAction(action: string) {
  return TRASHABLE_DELETE_ACTIONS.has(action);
}

function computeTrashExpiryAt(
  action: string,
  beforeSnapshot?: Record<string, unknown> | null,
  afterSnapshot?: Record<string, unknown> | null
): string | null {
  if (!isTrashableDeleteAction(action)) return null;
  if (!beforeSnapshot || afterSnapshot) return null;

  const expires = new Date();
  expires.setDate(expires.getDate() + TRASH_RETENTION_DAYS);
  return expires.toISOString();
}

export async function writeActivityLog(params: {
  actor: ActorInfo;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  options?: LogOptions;
}) {
  const supabase = await createSupabaseAdminClient();
  const trashExpiresAt = computeTrashExpiryAt(
    params.action,
    params.options?.beforeSnapshot || null,
    params.options?.afterSnapshot || null
  );

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      actor_id: params.actor.id,
      actor_role: params.actor.role,
      actor_name: params.actor.name || null,
      actor_email: params.actor.email || null,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      summary: params.options?.summary || null,
      metadata: (params.metadata || null) as Json,
      before_snapshot: (params.options?.beforeSnapshot || null) as Json,
      after_snapshot: (params.options?.afterSnapshot || null) as Json,
      reversible: params.options?.reversible || false,
      trash_expires_at: trashExpiresAt,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to write activity log:', error);
    return null;
  }

  return data?.id || null;
}

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>,
  adminId?: string,
  options?: LogOptions
) {
  const user = adminId ? { id: adminId } : await requireAdmin();
  const supabase = await createSupabaseAdminClient();
  const actor = await resolveActorIdentity(user.id, 'admin');

  const { error: legacyError } = await supabase.from('admin_logs').insert({
    admin_id: user.id,
    action,
    target_type: targetType || null,
    target_id: targetId || null,
    details: (details || null) as Json,
  });

  if (legacyError) {
    console.error('Failed to log legacy admin action:', legacyError);
  }

  await writeActivityLog({
    actor: { id: user.id, role: 'admin', name: actor.name, email: actor.email },
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
  options?: LogOptions
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
  options?: LogOptions
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
