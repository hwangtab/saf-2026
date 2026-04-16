'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { sanitizeIlikeQuery } from '@/lib/utils/query';

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

type ActivityLogFilters = {
  page?: number;
  limit?: number;
  q?: string;
  actorRole?: 'admin' | 'artist' | 'exhibitor' | 'system' | 'human' | 'all';
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  reversibleOnly?: boolean;
};

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

  const supabase = await createSupabaseAdminClient();
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

  const orderIds = new Set<string>();
  const artworkIds = new Set<string>();
  const artistIds = new Set<string>();
  const applicationIds = new Set<string>();
  const exhibitorApplicationIds = new Set<string>();

  for (const log of logs) {
    const ids = parseTargetIds(log);
    if (ids.length === 0) continue;

    if (log.target_type === 'order') {
      ids.forEach((id) => orderIds.add(id));
    }
    if (log.target_type === 'artwork') {
      ids.forEach((id) => artworkIds.add(id));
    }
    if (log.target_type === 'artist') {
      ids.forEach((id) => artistIds.add(id));
    }
    if (log.target_type === 'artist_application') {
      ids.forEach((id) => applicationIds.add(id));
    }
    if (log.target_type === 'exhibitor_application') {
      ids.forEach((id) => exhibitorApplicationIds.add(id));
    }
  }

  if (
    orderIds.size === 0 &&
    artworkIds.size === 0 &&
    artistIds.size === 0 &&
    applicationIds.size === 0 &&
    exhibitorApplicationIds.size === 0
  ) {
    return logs;
  }

  const supabase = await createSupabaseAdminClient();

  const [orderResult, artworkResult, artistResult, applicationResult, exhibitorAppResult] =
    await Promise.all([
      orderIds.size > 0
        ? supabase.from('orders').select('id, order_no, buyer_name').in('id', Array.from(orderIds))
        : Promise.resolve({
            data: [] as { id: string; order_no: string | null; buyer_name: string | null }[],
          }),
      artworkIds.size > 0
        ? supabase.from('artworks').select('id, title').in('id', Array.from(artworkIds))
        : Promise.resolve({ data: [] as { id: string; title: string | null }[] }),
      artistIds.size > 0
        ? supabase.from('artists').select('id, name_ko').in('id', Array.from(artistIds))
        : Promise.resolve({ data: [] as { id: string; name_ko: string | null }[] }),
      applicationIds.size > 0
        ? supabase
            .from('artist_applications')
            .select('user_id, artist_name')
            .in('user_id', Array.from(applicationIds))
        : Promise.resolve({ data: [] as { user_id: string; artist_name: string | null }[] }),
      exhibitorApplicationIds.size > 0
        ? supabase
            .from('exhibitor_applications')
            .select('user_id, representative_name')
            .in('user_id', Array.from(exhibitorApplicationIds))
        : Promise.resolve({
            data: [] as { user_id: string; representative_name: string | null }[],
          }),
    ]);

  const orderNameById = new Map(
    (orderResult.data || []).map((item) => [item.id, item.order_no || item.buyer_name || null])
  );
  const artworkNameById = new Map((artworkResult.data || []).map((item) => [item.id, item.title]));
  const artistNameById = new Map((artistResult.data || []).map((item) => [item.id, item.name_ko]));
  const applicationNameById = new Map(
    (applicationResult.data || []).map((item) => [item.user_id, item.artist_name])
  );
  const exhibitorAppNameById = new Map(
    (exhibitorAppResult.data || []).map((item) => [item.user_id, item.representative_name])
  );

  return logs.map((log) => {
    if (
      log.target_type !== 'order' &&
      log.target_type !== 'artwork' &&
      log.target_type !== 'artist' &&
      log.target_type !== 'artist_application' &&
      log.target_type !== 'exhibitor_application'
    )
      return log;

    const ids = parseTargetIds(log);
    if (ids.length === 0) return log;

    const targetNames: Record<string, string> = {};
    for (const id of ids) {
      let name: string | null = null;
      if (log.target_type === 'order') name = orderNameById.get(id) || null;
      else if (log.target_type === 'artwork') name = artworkNameById.get(id) || null;
      else if (log.target_type === 'artist') name = artistNameById.get(id) || null;
      else if (log.target_type === 'artist_application') name = applicationNameById.get(id) || null;
      else if (log.target_type === 'exhibitor_application')
        name = exhibitorAppNameById.get(id) || null;

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

function getTargetNameFromMetadata(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;

  const targetName = typeof metadata.target_name === 'string' ? metadata.target_name : null;
  if (targetName) return targetName;

  const orderNo = typeof metadata.order_no === 'string' ? metadata.order_no : null;
  const title = typeof metadata.title === 'string' ? metadata.title : null;
  const name = typeof metadata.name === 'string' ? metadata.name : null;
  const buyerName = typeof metadata.buyer_name === 'string' ? metadata.buyer_name : null;
  const userName = typeof metadata.user_name === 'string' ? metadata.user_name : null;
  const artistName = typeof metadata.artist_name === 'string' ? metadata.artist_name : null;
  const representativeName =
    typeof metadata.representative_name === 'string' ? metadata.representative_name : null;

  return (
    orderNo || title || name || buyerName || userName || artistName || representativeName || null
  );
}

async function enrichTrashPurgedTargetNames(logs: ActivityLogEntry[]): Promise<ActivityLogEntry[]> {
  const trashLogs = logs.filter((log) => log.action === 'trash_purged');
  if (trashLogs.length === 0) return logs;

  const unresolved = trashLogs.filter((log) => {
    const metadata = asSnapshotObject(log.metadata);
    return !getTargetNameFromMetadata(metadata);
  });
  if (unresolved.length === 0) return logs;

  const purgedLogIds = Array.from(
    new Set(
      unresolved
        .map((log) => {
          const metadata = asSnapshotObject(log.metadata);
          return metadata && typeof metadata.purged_log_id === 'string'
            ? metadata.purged_log_id
            : null;
        })
        .filter((value): value is string => !!value)
    )
  );
  if (purgedLogIds.length === 0) return logs;

  const supabase = await createSupabaseAdminClient();
  const { data: sourceLogs } = await supabase
    .from('activity_logs')
    .select('id, target_id, metadata')
    .in('id', purgedLogIds);

  const sourceMetadataById = new Map<string, Record<string, unknown>>();
  for (const row of sourceLogs || []) {
    const metadata = asSnapshotObject(row.metadata);
    if (metadata) {
      sourceMetadataById.set(row.id, metadata);
    }
  }

  return logs.map((log) => {
    if (log.action !== 'trash_purged') return log;

    const currentMetadata = asSnapshotObject(log.metadata) || {};
    if (getTargetNameFromMetadata(currentMetadata)) return log;

    const purgedLogId =
      typeof currentMetadata.purged_log_id === 'string' ? currentMetadata.purged_log_id : null;
    if (!purgedLogId) return log;

    const sourceMetadata = sourceMetadataById.get(purgedLogId);
    if (!sourceMetadata) return log;

    const resolvedName = getTargetNameFromMetadata(sourceMetadata);
    const sourceTargetNamesRaw = sourceMetadata.target_names;
    const sourceTargetNames =
      sourceTargetNamesRaw &&
      typeof sourceTargetNamesRaw === 'object' &&
      !Array.isArray(sourceTargetNamesRaw)
        ? (sourceTargetNamesRaw as Record<string, unknown>)
        : null;

    const mergedMetadata: Record<string, unknown> = { ...currentMetadata };
    if (resolvedName) {
      mergedMetadata.target_name = resolvedName;
    }
    if (sourceTargetNames) {
      mergedMetadata.target_names = sourceTargetNames;
    }

    return {
      ...log,
      metadata: mergedMetadata,
    };
  });
}

async function getLegacyAdminLogs(
  page = 1,
  limit = 50
): Promise<{ logs: ActivityLogEntry[]; total: number }> {
  const supabase = await createSupabaseAdminClient();
  const offset = (page - 1) * limit;

  const { count } = await supabase.from('admin_logs').select('id', { count: 'exact', head: true });

  const { data: logs, error } = await supabase
    .from('admin_logs')
    .select('*, admin:profiles!admin_logs_admin_id_fkey(name, email)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const mapped = (logs || []).map((log) => ({
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
    created_at: log.created_at || '',
  })) as ActivityLogEntry[];

  return { logs: mapped, total: count || 0 };
}

export async function getActivityLogs(filters: ActivityLogFilters = {}) {
  await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;
  const offset = (page - 1) * limit;

  let query = supabase.from('activity_logs').select('*', { count: 'exact' });

  if (filters.actorRole === 'human') {
    query = query.in('actor_role', ['admin', 'artist', 'exhibitor']);
  } else if (filters.actorRole && filters.actorRole !== 'all') {
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
    const q = sanitizeIlikeQuery(filters.q);
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
  const trashNameEnrichedLogs = await enrichTrashPurgedTargetNames(targetEnrichedLogs);

  return { logs: trashNameEnrichedLogs, total: count || 0 };
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
  const supabase = await createSupabaseAdminClient();

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
    const q = sanitizeIlikeQuery(filters.q);
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
