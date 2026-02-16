'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient, createSupabaseServerClient } from '@/lib/auth/server';
import { getStoragePathFromPublicUrl, getStoragePathsForRemoval } from '@/lib/utils/form-helpers';

export type ActivityLogEntry = {
  id: string;
  actor_id: string;
  actor_role: 'admin' | 'artist' | 'system' | 'exhibitor';
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
  trash_expires_at: string | null;
  purged_at: string | null;
  purged_by: string | null;
  purge_note: string | null;
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
  role: 'admin' | 'artist' | 'system' | 'exhibitor';
  name?: string | null;
  email?: string | null;
};

async function resolveActorIdentity(
  actorId: string,
  role: 'admin' | 'artist' | 'exhibitor',
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
  actorRole?: 'admin' | 'artist' | 'exhibitor' | 'all';
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
  'sold_at',
  'is_hidden',
  'images',
  'shop_url',
  'artist_id',
] as const;

const ARTWORK_RESTORE_KEYS = [
  'id',
  'artist_id',
  'title',
  'description',
  'size',
  'material',
  'year',
  'edition',
  'price',
  'status',
  'sold_at',
  'is_hidden',
  'images',
  'shop_url',
  'created_at',
  'updated_at',
] as const;

const ARTIST_REVERT_KEYS = [
  'user_id',
  'owner_id',
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

const ARTIST_RESTORE_KEYS = [
  'id',
  'user_id',
  'owner_id',
  'name_ko',
  'name_en',
  'bio',
  'history',
  'profile_image',
  'contact_phone',
  'contact_email',
  'instagram',
  'homepage',
  'created_at',
  'updated_at',
] as const;

const USER_REVERT_KEYS = ['role', 'status'] as const;

const NEWS_REVERT_KEYS = ['title', 'source', 'date', 'link', 'thumbnail', 'description'] as const;
const FAQ_REVERT_KEYS = ['question', 'answer', 'display_order'] as const;
const TESTIMONIAL_REVERT_KEYS = [
  'category',
  'quote',
  'author',
  'context',
  'display_order',
] as const;
const VIDEO_REVERT_KEYS = [
  'title',
  'description',
  'youtube_id',
  'thumbnail',
  'transcript',
] as const;

const NEWS_RESTORE_KEYS = ['id', ...NEWS_REVERT_KEYS] as const;
const FAQ_RESTORE_KEYS = ['id', ...FAQ_REVERT_KEYS] as const;
const TESTIMONIAL_RESTORE_KEYS = ['id', ...TESTIMONIAL_REVERT_KEYS] as const;
const VIDEO_RESTORE_KEYS = ['id', ...VIDEO_REVERT_KEYS] as const;

const NEWS_DELETION_ACTIONS = new Set(['news_deleted']);
const FAQ_DELETION_ACTIONS = new Set(['faq_deleted']);
const TESTIMONIAL_DELETION_ACTIONS = new Set(['testimonial_deleted']);
const VIDEO_DELETION_ACTIONS = new Set(['video_deleted']);

const ARTWORK_DELETION_ACTIONS = new Set([
  'artwork_deleted',
  'artist_artwork_deleted',
  'batch_artwork_deleted',
]);
const ARTWORK_CREATION_ACTIONS = new Set(['artwork_created', 'artist_artwork_created']);
const ARTIST_DELETION_ACTIONS = new Set(['artist_deleted']);
const ARTIST_CREATION_ACTIONS = new Set(['artist_created']);
const TRASH_RETENTION_DAYS = 30;
const TRASHABLE_DELETE_ACTIONS = new Set([
  'artwork_deleted',
  'artist_deleted',
  'artist_artwork_deleted',
  'batch_artwork_deleted',
]);
const TRASHABLE_DELETE_ACTION_LIST = Array.from(TRASHABLE_DELETE_ACTIONS);

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

function buildInsertPayload(snapshot: Record<string, unknown>, keys: readonly string[]) {
  const payload: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in snapshot) {
      payload[key] = snapshot[key];
    }
  }
  return payload;
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

function collectArtworkImageUrlsFromSnapshot(snapshot: Record<string, unknown> | null): string[] {
  if (!snapshot) return [];

  const urls: string[] = [];
  const pushUrlsFromItem = (item: Record<string, unknown>) => {
    const images = item.images;
    if (!Array.isArray(images)) return;
    for (const image of images) {
      if (typeof image === 'string' && image) {
        urls.push(image);
      }
    }
  };

  const list = asSnapshotList(snapshot);
  if (list && list.length > 0) {
    for (const item of list) {
      pushUrlsFromItem(item);
    }
    return urls;
  }

  pushUrlsFromItem(snapshot);
  return urls;
}

function collectStorageCleanupPaths(log: ActivityLogEntry) {
  const beforeSnapshot = asSnapshotObject(log.before_snapshot);
  const metadata = asSnapshotObject(log.metadata);
  const shouldCleanupStorage = metadata?.storage_cleanup_deferred === true;

  if (!shouldCleanupStorage || !beforeSnapshot) {
    return { artworkPaths: [] as string[], profilePaths: [] as string[] };
  }

  if (log.target_type === 'artwork') {
    const imageUrls = collectArtworkImageUrlsFromSnapshot(beforeSnapshot);
    const artworkPaths = getStoragePathsForRemoval(imageUrls, 'artworks');
    return { artworkPaths, profilePaths: [] as string[] };
  }

  if (log.target_type === 'artist') {
    const profileImage = beforeSnapshot.profile_image;
    if (typeof profileImage !== 'string' || !profileImage) {
      return { artworkPaths: [] as string[], profilePaths: [] as string[] };
    }
    const profilePath = getStoragePathFromPublicUrl(profileImage, 'profiles');
    return {
      artworkPaths: [] as string[],
      profilePaths: profilePath ? [profilePath] : [],
    };
  }

  return { artworkPaths: [] as string[], profilePaths: [] as string[] };
}

async function removeStoragePaths(
  supabase: Awaited<ReturnType<typeof createSupabaseAdminOrServerClient>>,
  bucket: 'artworks' | 'profiles',
  paths: string[]
) {
  if (paths.length === 0) return { removed: 0, failed: 0 };

  const CHUNK_SIZE = 100;
  let removed = 0;
  let failed = 0;

  for (let i = 0; i < paths.length; i += CHUNK_SIZE) {
    const chunk = paths.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase.storage.from(bucket).remove(chunk);

    if (error) {
      failed += chunk.length;
      continue;
    }

    const removedCount = Array.isArray(data) ? data.length : 0;
    removed += removedCount;
    failed += Math.max(0, chunk.length - removedCount);
  }

  return { removed, failed };
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
      metadata: params.metadata || null,
      before_snapshot: params.options?.beforeSnapshot || null,
      after_snapshot: params.options?.afterSnapshot || null,
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
    trash_expires_at: null,
    purged_at: null,
    purged_by: null,
    purge_note: null,
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

type TrashLogFilters = {
  page?: number;
  limit?: number;
  q?: string;
  targetType?: 'artwork' | 'artist' | 'all';
  state?: 'active' | 'expired' | 'all';
};

export async function getTrashLogs(filters: TrashLogFilters = {}) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 30;
  const offset = (page - 1) * limit;
  const nowIso = new Date().toISOString();

  let query = supabase.from('activity_logs').select('*', { count: 'exact' });
  query = query.in('action', TRASHABLE_DELETE_ACTION_LIST);
  query = query.is('after_snapshot', null);
  query = query.not('before_snapshot', 'is', null);
  query = query.is('purged_at', null);
  query = query.is('reverted_at', null);

  if (filters.targetType && filters.targetType !== 'all') {
    query = query.eq('target_type', filters.targetType);
  }

  if (filters.state === 'active') {
    query = query.gte('trash_expires_at', nowIso);
  } else if (filters.state === 'expired') {
    query = query.lt('trash_expires_at', nowIso);
  }

  if (filters.q) {
    const q = filters.q.trim();
    if (q) {
      query = query.or(
        `summary.ilike.%${q}%,target_id.ilike.%${q}%,action.ilike.%${q}%,actor_name.ilike.%${q}%,actor_email.ilike.%${q}%`
      );
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const logs = (data || []) as ActivityLogEntry[];
  const actorEnrichedLogs = await enrichActivityLogActors(logs);
  const targetEnrichedLogs = await enrichActivityLogTargets(actorEnrichedLogs);

  return { logs: targetEnrichedLogs, total: count || 0 };
}

export async function purgeActivityTrashLog(logId: string, reason: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();
  const actor = await resolveActorIdentity(admin.id, 'admin');

  const { data: log, error: logError } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('id', logId)
    .single();

  if (logError || !log) {
    throw new Error('영구 삭제할 로그를 찾을 수 없습니다.');
  }

  if (!isTrashableDeleteAction(log.action)) {
    throw new Error('휴지통 영구 삭제 대상이 아닙니다.');
  }

  if (log.reverted_at) {
    throw new Error('이미 복구된 항목은 영구 삭제할 수 없습니다.');
  }

  if (log.purged_at) {
    throw new Error('이미 영구 삭제된 항목입니다.');
  }

  const storagePaths = collectStorageCleanupPaths(log as ActivityLogEntry);
  const [artworkResult, profileResult] = await Promise.all([
    removeStoragePaths(supabase, 'artworks', storagePaths.artworkPaths),
    removeStoragePaths(supabase, 'profiles', storagePaths.profilePaths),
  ]);

  const nowIso = new Date().toISOString();
  const previousMetadata = asSnapshotObject(log.metadata) || {};
  const nextMetadata = {
    ...previousMetadata,
    storage_cleanup_deferred: false,
    storage_cleanup_completed_at: nowIso,
    storage_cleanup: {
      artwork_removed: artworkResult.removed,
      artwork_failed: artworkResult.failed,
      profile_removed: profileResult.removed,
      profile_failed: profileResult.failed,
    },
  };

  const { data: markedRows, error: markError } = await supabase
    .from('activity_logs')
    .update({
      reversible: false,
      before_snapshot: null,
      after_snapshot: null,
      purged_at: nowIso,
      purged_by: admin.id,
      purge_note: reason || null,
      metadata: nextMetadata,
    })
    .eq('id', log.id)
    .is('purged_at', null)
    .select('id');

  if (markError) throw markError;
  if (!markedRows || markedRows.length !== 1) {
    throw new Error('영구 삭제 상태 기록에 실패했습니다. 다시 시도해 주세요.');
  }

  await writeActivityLog({
    actor: { id: admin.id, role: 'admin', name: actor.name, email: actor.email },
    action: 'trash_purged',
    targetType: log.target_type,
    targetId: log.target_id,
    metadata: {
      purged_log_id: log.id,
      reason,
      artwork_removed: artworkResult.removed,
      artwork_failed: artworkResult.failed,
      profile_removed: profileResult.removed,
      profile_failed: profileResult.failed,
    },
    options: {
      summary: `휴지통 영구 삭제: ${log.target_type} ${log.target_id}`,
      reversible: false,
    },
  });

  if (log.target_type === 'artwork') {
    revalidatePath('/artworks');
    revalidatePath('/');
    revalidatePath('/admin/artworks');
  }
  if (log.target_type === 'artist') {
    revalidatePath('/artworks');
    revalidatePath('/admin/artists');
  }
  revalidatePath('/admin/trash');
  revalidatePath('/admin/logs');

  return {
    success: true,
    artworkRemoved: artworkResult.removed,
    profileRemoved: profileResult.removed,
    failed: artworkResult.failed + profileResult.failed,
  };
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

  if (log.purged_at) {
    throw new Error('보관 기간 만료로 영구 삭제된 로그입니다.');
  }

  if (log.reverted_at) {
    throw new Error('이미 복구가 완료된 로그입니다.');
  }

  if (log.trash_expires_at) {
    const expiresAt = new Date(log.trash_expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
      throw new Error('보관 기간(30일)이 만료되어 복구할 수 없습니다.');
    }
  }

  // For creation actions, we use after_snapshot to identify what to delete
  const isCreationAction =
    ARTWORK_CREATION_ACTIONS.has(log.action) ||
    ARTIST_CREATION_ACTIONS.has(log.action) ||
    log.action === 'artist_application_submitted';

  if (!log.before_snapshot && !isCreationAction) {
    throw new Error('복구 스냅샷 정보가 없습니다.');
  }

  if (log.target_type === 'artwork') {
    const isDeletionLog = ARTWORK_DELETION_ACTIONS.has(log.action);
    const isCreationLog = ARTWORK_CREATION_ACTIONS.has(log.action);
    const beforeList = asSnapshotList(log.before_snapshot);
    const afterList = asSnapshotList(log.after_snapshot);

    if (isDeletionLog) {
      const listToRestore = beforeList && beforeList.length > 0 ? beforeList : null;
      if (listToRestore) {
        const restoreRows = listToRestore.map((snapshot) =>
          buildInsertPayload(snapshot, ARTWORK_RESTORE_KEYS)
        );
        const restoreIds = restoreRows
          .map((row) => (typeof row.id === 'string' ? row.id : null))
          .filter((id): id is string => !!id);

        if (restoreIds.length !== restoreRows.length) {
          throw new Error('복구할 작품 식별 정보가 일부 누락되어 복구를 중단합니다.');
        }

        for (const row of restoreRows) {
          if (typeof row.artist_id !== 'string' || !row.artist_id) {
            throw new Error('복구할 작품의 작가 정보가 없어 복구를 중단합니다.');
          }
          if (typeof row.title !== 'string' || !row.title) {
            throw new Error('복구할 작품의 제목 정보가 없어 복구를 중단합니다.');
          }
        }

        const { data: existingRows } = await supabase
          .from('artworks')
          .select('id')
          .in('id', restoreIds);
        if ((existingRows || []).length > 0) {
          throw new Error('이미 존재하는 작품이 포함되어 복구를 중단합니다.');
        }

        const { data: insertedRows, error: restoreError } = await supabase
          .from('artworks')
          .insert(restoreRows)
          .select('id');
        if (restoreError) throw restoreError;
        if (!insertedRows || insertedRows.length !== restoreRows.length) {
          throw new Error('복구 적용 중 일부 작품의 반영 결과를 확인하지 못했습니다.');
        }
      } else {
        const snapshot = asSnapshotObject(log.before_snapshot);
        if (!snapshot) {
          throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
        }

        const payload = buildInsertPayload(snapshot, ARTWORK_RESTORE_KEYS);
        const snapshotId = typeof payload.id === 'string' ? payload.id : log.target_id;
        payload.id = snapshotId;

        if (typeof payload.artist_id !== 'string' || !payload.artist_id) {
          throw new Error('복구할 작품의 작가 정보가 없어 복구를 중단합니다.');
        }
        if (typeof payload.title !== 'string' || !payload.title) {
          throw new Error('복구할 작품의 제목 정보가 없어 복구를 중단합니다.');
        }

        const { data: existingArtwork } = await supabase
          .from('artworks')
          .select('id')
          .eq('id', snapshotId)
          .maybeSingle();
        if (existingArtwork) {
          throw new Error('이미 동일한 작품이 존재하여 복구를 중단합니다.');
        }

        const { data: insertedRow, error: restoreError } = await supabase
          .from('artworks')
          .insert(payload)
          .select('id')
          .single();
        if (restoreError) throw restoreError;
        if (!insertedRow?.id) {
          throw new Error('복구 대상 작품을 생성하지 못했습니다.');
        }
      }
    } else if (isCreationLog) {
      // Revert creation by deleting the created artwork
      const afterSnapshot = asSnapshotObject(log.after_snapshot);
      const artworkId = afterSnapshot?.id || log.target_id;

      if (typeof artworkId !== 'string') {
        throw new Error('삭제할 작품 ID를 찾을 수 없습니다.');
      }

      const { data: existingArtwork } = await supabase
        .from('artworks')
        .select('id')
        .eq('id', artworkId)
        .maybeSingle();

      if (!existingArtwork) {
        throw new Error('삭제할 작품이 존재하지 않습니다. (이미 삭제됨)');
      }

      const { error: deleteError } = await supabase.from('artworks').delete().eq('id', artworkId);
      if (deleteError) throw deleteError;
    } else if (beforeList && beforeList.length > 0) {
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
          'id, title, description, size, material, year, edition, price, status, sold_at, is_hidden, images, shop_url, artist_id, updated_at'
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
    const isDeletionLog = ARTIST_DELETION_ACTIONS.has(log.action);
    const isCreationLog = ARTIST_CREATION_ACTIONS.has(log.action);

    if (isCreationLog) {
      // Revert creation by deleting the created artist
      const afterSnapshot = asSnapshotObject(log.after_snapshot);
      const artistId = afterSnapshot?.id || log.target_id;

      if (typeof artistId !== 'string') {
        throw new Error('삭제할 작가 ID를 찾을 수 없습니다.');
      }

      // Check if artist has any artworks
      const { count: artworkCount } = await supabase
        .from('artworks')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artistId);

      if (artworkCount && artworkCount > 0) {
        throw new Error(
          `작가에게 ${artworkCount}개의 작품이 등록되어 있어 삭제할 수 없습니다. 먼저 작품을 삭제해 주세요.`
        );
      }

      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id')
        .eq('id', artistId)
        .maybeSingle();

      if (!existingArtist) {
        throw new Error('삭제할 작가가 존재하지 않습니다. (이미 삭제됨)');
      }

      const { error: deleteError } = await supabase.from('artists').delete().eq('id', artistId);
      if (deleteError) throw deleteError;
    } else if (isDeletionLog) {
      const snapshot = asSnapshotObject(log.before_snapshot);
      if (!snapshot) {
        throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
      }

      const payload = buildInsertPayload(snapshot, ARTIST_RESTORE_KEYS);
      const snapshotId = typeof payload.id === 'string' ? payload.id : log.target_id;
      payload.id = snapshotId;

      if (typeof payload.name_ko !== 'string' || !payload.name_ko) {
        throw new Error('복구할 작가의 필수 정보가 누락되어 복구를 중단합니다.');
      }

      const { data: currentArtist } = await supabase
        .from('artists')
        .select('id')
        .eq('id', snapshotId)
        .maybeSingle();
      if (currentArtist) {
        throw new Error('이미 동일한 작가가 존재하여 복구를 중단합니다.');
      }

      const { data: insertedArtist, error: restoreError } = await supabase
        .from('artists')
        .insert(payload)
        .select('id')
        .single();
      if (restoreError) throw restoreError;
      if (!insertedArtist?.id) {
        throw new Error('복구 대상 작가를 생성하지 못했습니다.');
      }
    } else {
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
    }
  } else if (log.target_type === 'user') {
    const { data: current } = await supabase
      .from('profiles')
      .select('updated_at')
      .eq('id', log.target_id)
      .single();

    const afterUpdatedAt = (log.after_snapshot as { updated_at?: string } | null)?.updated_at;
    if (afterUpdatedAt && current?.updated_at && current.updated_at !== afterUpdatedAt) {
      throw new Error('현재 사용자 정보가 추가로 변경되어 복구를 중단합니다.');
    }

    const snapshot = asSnapshotObject(log.before_snapshot);
    if (!snapshot) {
      throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
    }
    const patch = buildPatch(snapshot, USER_REVERT_KEYS);

    const { data: updatedRows, error: revertError } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', log.target_id)
      .select('id');
    if (revertError) throw revertError;
    if (!updatedRows || updatedRows.length !== 1) {
      throw new Error('복구 대상 사용자를 찾을 수 없어 복구를 중단합니다.');
    }
  } else if (log.target_type === 'news') {
    const isDeletionLog = NEWS_DELETION_ACTIONS.has(log.action);

    if (isDeletionLog) {
      const snapshot = asSnapshotObject(log.before_snapshot);
      if (!snapshot) {
        throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
      }
      const payload = buildInsertPayload(snapshot, NEWS_RESTORE_KEYS);
      payload.id = typeof payload.id === 'string' ? payload.id : log.target_id;

      const { data: existing } = await supabase
        .from('news')
        .select('id')
        .eq('id', payload.id)
        .maybeSingle();
      if (existing) {
        throw new Error('이미 동일한 뉴스가 존재하여 복구를 중단합니다.');
      }

      const { error: restoreError } = await supabase.from('news').insert(payload);
      if (restoreError) throw restoreError;
    } else {
      const snapshot = asSnapshotObject(log.before_snapshot);
      if (!snapshot) {
        throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
      }
      const patch = buildPatch(snapshot, NEWS_REVERT_KEYS);
      const { error: revertError } = await supabase
        .from('news')
        .update(patch)
        .eq('id', log.target_id);
      if (revertError) throw revertError;
    }
  } else if (log.target_type === 'faq') {
    const isDeletionLog = FAQ_DELETION_ACTIONS.has(log.action);

    if (isDeletionLog) {
      const snapshot = asSnapshotObject(log.before_snapshot);
      if (!snapshot) {
        throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
      }
      const payload = buildInsertPayload(snapshot, FAQ_RESTORE_KEYS);
      payload.id = typeof payload.id === 'string' ? payload.id : log.target_id;

      const { data: existing } = await supabase
        .from('faq')
        .select('id')
        .eq('id', payload.id)
        .maybeSingle();
      if (existing) {
        throw new Error('이미 동일한 FAQ가 존재하여 복구를 중단합니다.');
      }

      const { error: restoreError } = await supabase.from('faq').insert(payload);
      if (restoreError) throw restoreError;
    } else {
      const snapshot = asSnapshotObject(log.before_snapshot);
      if (!snapshot) {
        throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
      }
      const patch = buildPatch(snapshot, FAQ_REVERT_KEYS);
      const { error: revertError } = await supabase
        .from('faq')
        .update(patch)
        .eq('id', log.target_id);
      if (revertError) throw revertError;
    }
  } else if (log.target_type === 'testimonial') {
    const isDeletionLog = TESTIMONIAL_DELETION_ACTIONS.has(log.action);

    if (isDeletionLog) {
      const snapshot = asSnapshotObject(log.before_snapshot);
      if (!snapshot) {
        throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
      }
      const payload = buildInsertPayload(snapshot, TESTIMONIAL_RESTORE_KEYS);
      payload.id = typeof payload.id === 'string' ? payload.id : log.target_id;

      const { data: existing } = await supabase
        .from('testimonials')
        .select('id')
        .eq('id', payload.id)
        .maybeSingle();
      if (existing) {
        throw new Error('이미 동일한 증언이 존재하여 복구를 중단합니다.');
      }

      const { error: restoreError } = await supabase.from('testimonials').insert(payload);
      if (restoreError) throw restoreError;
    } else {
      const snapshot = asSnapshotObject(log.before_snapshot);
      if (!snapshot) {
        throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
      }
      const patch = buildPatch(snapshot, TESTIMONIAL_REVERT_KEYS);
      const { error: revertError } = await supabase
        .from('testimonials')
        .update(patch)
        .eq('id', log.target_id);
      if (revertError) throw revertError;
    }
  } else if (log.target_type === 'video') {
    const isDeletionLog = VIDEO_DELETION_ACTIONS.has(log.action);

    if (isDeletionLog) {
      const snapshot = asSnapshotObject(log.before_snapshot);
      if (!snapshot) {
        throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
      }
      const payload = buildInsertPayload(snapshot, VIDEO_RESTORE_KEYS);
      payload.id = typeof payload.id === 'string' ? payload.id : log.target_id;

      const { data: existing } = await supabase
        .from('videos')
        .select('id')
        .eq('id', payload.id)
        .maybeSingle();
      if (existing) {
        throw new Error('이미 동일한 비디오가 존재하여 복구를 중단합니다.');
      }

      const { error: restoreError } = await supabase.from('videos').insert(payload);
      if (restoreError) throw restoreError;
    } else {
      const snapshot = asSnapshotObject(log.before_snapshot);
      if (!snapshot) {
        throw new Error('복구 스냅샷 정보가 올바르지 않습니다.');
      }
      const patch = buildPatch(snapshot, VIDEO_REVERT_KEYS);
      const { error: revertError } = await supabase
        .from('videos')
        .update(patch)
        .eq('id', log.target_id);
      if (revertError) throw revertError;
    }
  } else if (log.target_type === 'artist_application') {
    // Revert application submission by deleting the application
    const { data: existingApplication } = await supabase
      .from('artist_applications')
      .select('user_id')
      .eq('user_id', log.target_id)
      .maybeSingle();

    if (!existingApplication) {
      throw new Error('삭제할 신청서가 존재하지 않습니다. (이미 삭제됨)');
    }

    const { error: deleteError } = await supabase
      .from('artist_applications')
      .delete()
      .eq('user_id', log.target_id);
    if (deleteError) throw deleteError;
  } else {
    throw new Error(
      '현재는 작품/작가/사용자/뉴스/FAQ/증언/비디오/신청서 로그만 복구할 수 있습니다.'
    );
  }

  if (log.target_type === 'artwork') {
    revalidatePath('/artworks');
    revalidatePath('/');
    revalidatePath('/admin/artworks');
    if (!log.target_id.includes(',')) {
      revalidatePath(`/artworks/${log.target_id}`);
      revalidatePath(`/admin/artworks/${log.target_id}`);
    }
  }

  if (log.target_type === 'artist') {
    revalidatePath('/artworks');
    revalidatePath('/admin/artists');
    if (!log.target_id.includes(',')) {
      revalidatePath(`/admin/artists/${log.target_id}`);
    }
  }

  if (log.target_type === 'user') {
    revalidatePath('/admin/users');
  }

  if (log.target_type === 'news') {
    revalidatePath('/news');
    revalidatePath('/admin/content/news');
    revalidatePath('/sitemap.xml');
  }

  if (log.target_type === 'faq') {
    revalidatePath('/');
    revalidatePath('/admin/content/faq');
  }

  if (log.target_type === 'testimonial') {
    revalidatePath('/our-reality');
    revalidatePath('/admin/content/testimonials');
  }

  if (log.target_type === 'video') {
    revalidatePath('/our-proof');
    revalidatePath('/admin/content/videos');
  }

  if (log.target_type === 'artist_application') {
    revalidatePath('/admin/users');
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
