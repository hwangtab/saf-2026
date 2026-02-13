'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient, createSupabaseServerClient } from '@/lib/auth/server';

export type ActivityLogEntry = {
  id: string;
  actor_id: string;
  actor_role: 'admin' | 'artist' | 'system';
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  reversible: boolean;
  reverted_by: string | null;
  reverted_at: string | null;
  revert_reason: string | null;
  reverted_log_id: string | null;
  created_at: string;
};

type LogOptions = {
  summary?: string;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  reversible?: boolean;
};

type ActorInfo = {
  id: string;
  role: 'admin' | 'artist' | 'system';
  name?: string | null;
  email?: string | null;
};

async function resolveActorIdentity(
  actorId: string,
  role: 'admin' | 'artist',
  fallbackEmail?: string | null
): Promise<{ name: string | null; email: string | null }> {
  const supabase = await createSupabaseAdminOrServerClient();

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

type ActivityLogFilters = {
  page?: number;
  limit?: number;
  q?: string;
  actorRole?: 'admin' | 'artist' | 'all';
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  reversibleOnly?: boolean;
};

type LegacyAdminLogEntry = {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin?: {
    name: string | null;
    email: string | null;
  } | null;
};

const ARTWORK_REVERT_KEYS = [
  'title',
  'description',
  'size',
  'material',
  'year',
  'edition',
  'price',
  'status',
  'is_hidden',
  'images',
  'shop_url',
  'artist_id',
] as const;

const ARTIST_REVERT_KEYS = [
  'name_ko',
  'name_en',
  'bio',
  'history',
  'profile_image',
  'contact_phone',
  'contact_email',
  'instagram',
  'homepage',
] as const;

function asSnapshotObject(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asSnapshotList(value: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    );
  }

  const objectValue = asSnapshotObject(value);
  if (!objectValue) return null;

  const items = objectValue.items;
  if (!Array.isArray(items)) return null;

  return items.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === 'object'
  );
}

function buildPatch(snapshot: Record<string, unknown>, keys: readonly string[]) {
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in snapshot) {
      patch[key] = snapshot[key];
    }
  }
  patch.updated_at = new Date().toISOString();
  return patch;
}

async function enrichActivityLogActors(logs: ActivityLogEntry[]): Promise<ActivityLogEntry[]> {
  if (logs.length === 0) return logs;

  const unresolvedLogs = logs.filter(
    (log) =>
      !log.actor_name &&
      !log.actor_email &&
      (log.actor_role === 'admin' || log.actor_role === 'artist')
  );

  if (unresolvedLogs.length === 0) return logs;

  const actorIds = Array.from(new Set(unresolvedLogs.map((log) => log.actor_id).filter(Boolean)));
  if (actorIds.length === 0) return logs;

  const supabase = await createSupabaseAdminOrServerClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', actorIds);

  const artistIds = Array.from(
    new Set(unresolvedLogs.filter((log) => log.actor_role === 'artist').map((log) => log.actor_id))
  );

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const artistNameByUserId = new Map<string, string>();

  if (artistIds.length > 0) {
    const { data: artists } = await supabase
      .from('artists')
      .select('user_id, name_ko')
      .in('user_id', artistIds);

    for (const artist of artists || []) {
      if (artist.user_id && artist.name_ko) {
        artistNameByUserId.set(artist.user_id, artist.name_ko);
      }
    }
  }

  return logs.map((log) => {
    if (log.actor_name || log.actor_email) return log;
    if (log.actor_role !== 'admin' && log.actor_role !== 'artist') return log;

    const profile = profileMap.get(log.actor_id);
    if (!profile && log.actor_role !== 'artist') return log;

    const actorName =
      log.actor_role === 'artist'
        ? artistNameByUserId.get(log.actor_id) || profile?.name || null
        : profile?.name || null;

    const actorEmail = profile?.email || null;

    if (!actorName && !actorEmail) return log;

    return {
      ...log,
      actor_name: actorName,
      actor_email: actorEmail,
    };
  });
}

function parseTargetIds(log: ActivityLogEntry): string[] {
  const ids = new Set<string>();

  if (log.target_id) {
    for (const id of log.target_id
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)) {
      ids.add(id);
    }
  }

  const collectFromSnapshot = (snapshot: Record<string, unknown> | null) => {
    if (!snapshot) return;
    const items = snapshot.items;
    if (!Array.isArray(items)) return;

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const itemId = (item as Record<string, unknown>).id;
      if (typeof itemId === 'string' && itemId) {
        ids.add(itemId);
      }
    }
  };

  collectFromSnapshot(log.before_snapshot);
  collectFromSnapshot(log.after_snapshot);

  return Array.from(ids);
}

async function enrichActivityLogTargets(logs: ActivityLogEntry[]): Promise<ActivityLogEntry[]> {
  if (logs.length === 0) return logs;

  const artworkIds = new Set<string>();
  const artistIds = new Set<string>();

  for (const log of logs) {
    const ids = parseTargetIds(log);
    if (ids.length === 0) continue;

    if (log.target_type === 'artwork') {
      ids.forEach((id) => artworkIds.add(id));
    }
    if (log.target_type === 'artist') {
      ids.forEach((id) => artistIds.add(id));
    }
  }

  if (artworkIds.size === 0 && artistIds.size === 0) return logs;

  const supabase = await createSupabaseAdminOrServerClient();

  const [artworkResult, artistResult] = await Promise.all([
    artworkIds.size > 0
      ? supabase.from('artworks').select('id, title').in('id', Array.from(artworkIds))
      : Promise.resolve({ data: [] as { id: string; title: string | null }[] }),
    artistIds.size > 0
      ? supabase.from('artists').select('id, name_ko').in('id', Array.from(artistIds))
      : Promise.resolve({ data: [] as { id: string; name_ko: string | null }[] }),
  ]);

  const artworkNameById = new Map((artworkResult.data || []).map((item) => [item.id, item.title]));
  const artistNameById = new Map((artistResult.data || []).map((item) => [item.id, item.name_ko]));

  return logs.map((log) => {
    if (log.target_type !== 'artwork' && log.target_type !== 'artist') return log;

    const ids = parseTargetIds(log);
    if (ids.length === 0) return log;

    const targetNames: Record<string, string> = {};
    for (const id of ids) {
      const name =
        log.target_type === 'artwork'
          ? artworkNameById.get(id) || null
          : artistNameById.get(id) || null;
      if (name) targetNames[id] = name;
    }

    if (Object.keys(targetNames).length === 0) return log;

    const targetName = log.target_id.includes(',') ? null : targetNames[log.target_id] || null;

    return {
      ...log,
      metadata: {
        ...(log.metadata || {}),
        target_name: targetName,
        target_names: targetNames,
      },
    };
  });
}

async function writeActivityLog(params: {
  actor: ActorInfo;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  options?: LogOptions;
}) {
  const supabase = await createSupabaseAdminOrServerClient();

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
      metadata: params.metadata || null,
      before_snapshot: params.options?.beforeSnapshot || null,
      after_snapshot: params.options?.afterSnapshot || null,
      reversible: params.options?.reversible || false,
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
  const supabase = await createSupabaseAdminOrServerClient();
  const actor = await resolveActorIdentity(user.id, 'admin');

  const { error: legacyError } = await supabase.from('admin_logs').insert({
    admin_id: user.id,
    action,
    target_type: targetType || null,
    target_id: targetId || null,
    details: details || null,
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

async function getLegacyAdminLogs(
  page = 1,
  limit = 50
): Promise<{ logs: ActivityLogEntry[]; total: number }> {
  const supabase = await createSupabaseAdminOrServerClient();
  const offset = (page - 1) * limit;

  const { count } = await supabase.from('admin_logs').select('id', { count: 'exact', head: true });

  const { data: logs, error } = await supabase
    .from('admin_logs')
    .select('*, admin:profiles!admin_logs_admin_id_fkey(name, email)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const mapped = (logs || []).map((log: LegacyAdminLogEntry) => ({
    id: log.id,
    actor_id: log.admin_id || '',
    actor_role: 'admin' as const,
    actor_name: log.admin?.name || null,
    actor_email: log.admin?.email || null,
    action: log.action,
    target_type: log.target_type || 'unknown',
    target_id: log.target_id || 'unknown',
    summary: null,
    metadata: log.details,
    before_snapshot: null,
    after_snapshot: null,
    reversible: false,
    reverted_by: null,
    reverted_at: null,
    revert_reason: null,
    reverted_log_id: null,
    created_at: log.created_at,
  }));

  return { logs: mapped, total: count || 0 };
}

export async function getActivityLogs(filters: ActivityLogFilters = {}) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;
  const offset = (page - 1) * limit;

  let query = supabase.from('activity_logs').select('*', { count: 'exact' });

  if (filters.actorRole && filters.actorRole !== 'all') {
    query = query.eq('actor_role', filters.actorRole);
  }
  if (filters.action) {
    query = query.eq('action', filters.action);
  }
  if (filters.targetType) {
    query = query.eq('target_type', filters.targetType);
  }
  if (filters.reversibleOnly) {
    query = query.eq('reversible', true);
  }
  if (filters.from) {
    const fromDate = new Date(filters.from);
    if (!Number.isNaN(fromDate.getTime())) {
      query = query.gte('created_at', fromDate.toISOString());
    }
  }
  if (filters.to) {
    const toDate = new Date(filters.to);
    if (!Number.isNaN(toDate.getTime())) {
      query = query.lte('created_at', toDate.toISOString());
    }
  }
  if (filters.q) {
    const q = filters.q.trim();
    if (q) {
      query = query.or(
        `summary.ilike.%${q}%,actor_name.ilike.%${q}%,actor_email.ilike.%${q}%,target_id.ilike.%${q}%,action.ilike.%${q}%`
      );
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if ((error as { code?: string }).code === '42P01') {
      return getLegacyAdminLogs(page, limit);
    }
    throw error;
  }

  const logs = (data || []) as ActivityLogEntry[];
  const actorEnrichedLogs = await enrichActivityLogActors(logs);
  const targetEnrichedLogs = await enrichActivityLogTargets(actorEnrichedLogs);

  return { logs: targetEnrichedLogs, total: count || 0 };
}

export async function getAdminLogs(
  page = 1,
  limit = 50
): Promise<{ logs: ActivityLogEntry[]; total: number }> {
  return getActivityLogs({ page, limit });
}

export async function revertActivityLog(logId: string, reason: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();
  const actor = await resolveActorIdentity(admin.id, 'admin');

  const { data: log, error: logError } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('id', logId)
    .single();

  if (logError || !log) {
    throw new Error('복구할 로그를 찾을 수 없습니다.');
  }

  if (!log.reversible) {
    throw new Error('해당 로그는 복구를 지원하지 않습니다.');
  }

  if (log.reverted_at) {
    throw new Error('이미 복구가 완료된 로그입니다.');
  }

  if (!log.before_snapshot) {
    throw new Error('복구 스냅샷 정보가 없습니다.');
  }

  if (log.target_type === 'artwork') {
    const beforeList = asSnapshotList(log.before_snapshot);
    const afterList = asSnapshotList(log.after_snapshot);

    if (beforeList && beforeList.length > 0) {
      const targetIds = beforeList
        .map((item) => (typeof item.id === 'string' ? item.id : null))
        .filter((id): id is string => !!id);

      if (targetIds.length === 0) {
        throw new Error('복구 대상 작품 정보를 찾을 수 없습니다.');
      }

      const { data: currentRows } = await supabase
        .from('artworks')
        .select('id, updated_at')
        .in('id', targetIds);

      if (!currentRows || currentRows.length !== targetIds.length) {
        throw new Error('복구 대상 작품 중 일부를 찾을 수 없어 복구를 중단합니다.');
      }

      const currentMap = new Map((currentRows || []).map((row) => [row.id, row.updated_at]));
      const afterMap = new Map(
        (afterList || [])
          .map((item) => {
            const id = typeof item.id === 'string' ? item.id : null;
            const updatedAt = typeof item.updated_at === 'string' ? item.updated_at : null;
            return id && updatedAt ? [id, updatedAt] : null;
          })
          .filter((pair): pair is [string, string] => !!pair)
      );

      for (const id of targetIds) {
        const afterUpdatedAt = afterMap.get(id);
        const currentUpdatedAt = currentMap.get(id);
        if (!currentUpdatedAt) {
          throw new Error('복구 대상 작품 중 일부를 찾을 수 없어 복구를 중단합니다.');
        }
        if (afterUpdatedAt && currentUpdatedAt && currentUpdatedAt !== afterUpdatedAt) {
          throw new Error('현재 데이터가 추가로 변경되어 복구를 중단합니다.');
        }
      }

      const { data: rollbackRows } = await supabase
        .from('artworks')
        .select(
          'id, title, description, size, material, year, edition, price, status, is_hidden, images, shop_url, artist_id, updated_at'
        )
        .in('id', targetIds);
      const rollbackMap = new Map((rollbackRows || []).map((row) => [row.id, row]));

      const appliedIds: string[] = [];

      try {
        for (const snapshot of beforeList) {
          const id = typeof snapshot.id === 'string' ? snapshot.id : null;
          if (!id) continue;

          const patch = buildPatch(snapshot, ARTWORK_REVERT_KEYS);
          const { data: updatedRows, error: revertError } = await supabase
            .from('artworks')
            .update(patch)
            .eq('id', id)
            .select('id');
          if (revertError) throw revertError;
          if (!updatedRows || updatedRows.length !== 1) {
            throw new Error('복구 적용 중 일부 작품의 반영 결과를 확인하지 못했습니다.');
          }
          appliedIds.push(id);
        }
      } catch (error) {
        for (const appliedId of appliedIds.reverse()) {
          const rollbackSnapshot = rollbackMap.get(appliedId);
          if (!rollbackSnapshot) continue;
          const rollbackPatch = buildPatch(
            rollbackSnapshot as Record<string, unknown>,
            ARTWORK_REVERT_KEYS
          );
          await supabase.from('artworks').update(rollbackPatch).eq('id', appliedId);
        }
        throw error;
      }
    } else {
      const { data: current } = await supabase
        .from('artworks')
        .select('updated_at')
        .eq('id', log.target_id)
        .single();

      const afterUpdatedAt = (log.after_snapshot as { updated_at?: string } | null)?.updated_at;
      if (afterUpdatedAt && current?.updated_at && current.updated_at !== afterUpdatedAt) {
        throw new Error('현재 데이터가 추가로 변경되어 복구를 중단합니다.');
      }

      const snapshot = asSnapshotObject(log.before_snapshot);
      if (!snapshot) {
        throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
      }

      const patch = buildPatch(snapshot, ARTWORK_REVERT_KEYS);
      const { data: updatedRows, error: revertError } = await supabase
        .from('artworks')
        .update(patch)
        .eq('id', log.target_id)
        .select('id');
      if (revertError) throw revertError;
      if (!updatedRows || updatedRows.length !== 1) {
        throw new Error('복구 대상 작품을 찾을 수 없어 복구를 중단합니다.');
      }
    }
  } else if (log.target_type === 'artist') {
    const { data: current } = await supabase
      .from('artists')
      .select('updated_at')
      .eq('id', log.target_id)
      .single();

    const afterUpdatedAt = (log.after_snapshot as { updated_at?: string } | null)?.updated_at;
    if (afterUpdatedAt && current?.updated_at && current.updated_at !== afterUpdatedAt) {
      throw new Error('현재 데이터가 추가로 변경되어 복구를 중단합니다.');
    }

    const snapshot = asSnapshotObject(log.before_snapshot);
    if (!snapshot) {
      throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
    }
    const patch = buildPatch(snapshot, ARTIST_REVERT_KEYS);

    const { data: updatedRows, error: revertError } = await supabase
      .from('artists')
      .update(patch)
      .eq('id', log.target_id)
      .select('id');
    if (revertError) throw revertError;
    if (!updatedRows || updatedRows.length !== 1) {
      throw new Error('복구 대상 작가를 찾을 수 없어 복구를 중단합니다.');
    }
  } else {
    throw new Error('현재는 작품/작가 수정 로그만 복구할 수 있습니다.');
  }

  const now = new Date().toISOString();
  const { data: markedRows, error: markError } = await supabase
    .from('activity_logs')
    .update({
      reverted_by: admin.id,
      reverted_at: now,
      revert_reason: reason,
    })
    .eq('id', log.id)
    .is('reverted_at', null)
    .select('id');

  if (markError) throw markError;
  if (!markedRows || markedRows.length !== 1) {
    throw new Error('복구 상태 기록에 실패했습니다. 다시 시도해주세요.');
  }

  const revertLogId = await writeActivityLog({
    actor: { id: admin.id, role: 'admin', name: actor.name, email: actor.email },
    action: 'revert_executed',
    targetType: log.target_type,
    targetId: log.target_id,
    metadata: {
      reverted_log_id: log.id,
      reason,
    },
    options: {
      summary: '활동 로그 기반 복구 실행',
      reversible: false,
    },
  });

  if (revertLogId) {
    await supabase.from('activity_logs').update({ reverted_log_id: revertLogId }).eq('id', log.id);
  }

  return { success: true };
}
