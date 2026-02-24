import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purgeCafe24ProductsFromTrashEntry } from '@/lib/integrations/cafe24/trash-purge';

export const runtime = 'nodejs';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const TRASHABLE_ACTIONS = [
  'artwork_deleted',
  'artist_deleted',
  'artist_artwork_deleted',
  'batch_artwork_deleted',
];

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asObjectList(value: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    );
  }
  const objectValue = asObject(value);
  if (!objectValue) return null;
  const items = objectValue.items;
  if (!Array.isArray(items)) return null;
  return items.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === 'object'
  );
}

function getSnapshotDisplayName(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;

  const title = typeof snapshot.title === 'string' ? snapshot.title : null;
  const nameKo = typeof snapshot.name_ko === 'string' ? snapshot.name_ko : null;
  const name = typeof snapshot.name === 'string' ? snapshot.name : null;
  const artistName = typeof snapshot.artist_name === 'string' ? snapshot.artist_name : null;
  const representativeName =
    typeof snapshot.representative_name === 'string' ? snapshot.representative_name : null;

  return title || nameKo || name || artistName || representativeName || null;
}

function extractTrashPurgeTargetNames(log: {
  target_id: string;
  metadata: unknown;
  before_snapshot: unknown;
}) {
  const metadata = asObject(log.metadata) || {};
  const targetNames = new Map<string, string>();

  const metadataTargetNames = metadata.target_names;
  if (
    metadataTargetNames &&
    typeof metadataTargetNames === 'object' &&
    !Array.isArray(metadataTargetNames)
  ) {
    for (const [id, value] of Object.entries(metadataTargetNames)) {
      if (typeof id === 'string' && typeof value === 'string' && id && value) {
        targetNames.set(id, value);
      }
    }
  }

  const beforeList = asObjectList(log.before_snapshot);
  if (beforeList && beforeList.length > 0) {
    for (const item of beforeList) {
      const itemId = typeof item.id === 'string' ? item.id : null;
      const itemName = getSnapshotDisplayName(item);
      if (itemId && itemName) {
        targetNames.set(itemId, itemName);
      }
    }
  } else {
    const beforeSnapshot = asObject(log.before_snapshot);
    const snapshotId =
      beforeSnapshot && typeof beforeSnapshot.id === 'string' ? beforeSnapshot.id : null;
    const snapshotName = getSnapshotDisplayName(beforeSnapshot);
    if (snapshotId && snapshotName) {
      targetNames.set(snapshotId, snapshotName);
    }
  }

  const metadataTargetName = typeof metadata.target_name === 'string' ? metadata.target_name : null;
  if (!log.target_id.includes(',') && metadataTargetName && !targetNames.has(log.target_id)) {
    targetNames.set(log.target_id, metadataTargetName);
  }

  const targetName = log.target_id.includes(',')
    ? null
    : targetNames.get(log.target_id) ||
      metadataTargetName ||
      getSnapshotDisplayName(asObject(log.before_snapshot));

  return {
    targetName: targetName || null,
    targetNames: targetNames.size > 0 ? Object.fromEntries(targetNames) : null,
  };
}

function getStoragePathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  try {
    const url = new URL(publicUrl);
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/render/image/public/${bucket}/`,
    ];

    for (const marker of markers) {
      const index = url.pathname.indexOf(marker);
      if (index !== -1) {
        return url.pathname.slice(index + marker.length);
      }
    }

    return null;
  } catch {
    return null;
  }
}

function expandArtworkVariantPaths(pathValue: string): string[] {
  const match = pathValue.match(/__(thumb|card|detail|hero|original)\.(webp|jpg|jpeg|png|avif)$/i);
  if (!match) return [pathValue];
  const prefix = pathValue.replace(
    /__(thumb|card|detail|hero|original)\.(webp|jpg|jpeg|png|avif)$/i,
    ''
  );
  const ext = (match[2] || 'webp').toLowerCase();
  return ['thumb', 'card', 'detail', 'hero', 'original'].map(
    (variant) => `${prefix}__${variant}.${ext}`
  );
}

function collectArtworkPaths(snapshot: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const list = asObjectList(snapshot);
  const items = list || [snapshot];

  for (const item of items) {
    const images = item.images;
    if (!Array.isArray(images)) continue;
    for (const image of images) {
      if (typeof image === 'string' && image) {
        urls.push(image);
      }
    }
  }

  const paths = urls
    .map((url) => getStoragePathFromPublicUrl(url, 'artworks'))
    .filter((path): path is string => !!path)
    .flatMap((pathValue) => expandArtworkVariantPaths(pathValue));

  return Array.from(new Set(paths));
}

function collectProfilePaths(snapshot: Record<string, unknown>): string[] {
  const profileImage = snapshot.profile_image;
  if (typeof profileImage !== 'string' || !profileImage) return [];
  const path = getStoragePathFromPublicUrl(profileImage, 'profiles');
  return path ? [path] : [];
}

async function removeStoragePaths(supabase: any, bucket: 'artworks' | 'profiles', paths: string[]) {
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

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !adminKey) {
    return NextResponse.json({ error: 'Supabase admin credentials are missing.' }, { status: 500 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get('limit') || '200');
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 200;
  const nowIso = new Date().toISOString();

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${adminKey}`,
      },
    },
  });

  const { data: logs, error: fetchError } = await supabase
    .from('activity_logs')
    .select(
      'id, action, target_type, target_id, metadata, before_snapshot, after_snapshot, reversible, reverted_at, purged_at, trash_expires_at'
    )
    .in('action', TRASHABLE_ACTIONS)
    .is('after_snapshot', null)
    .not('before_snapshot', 'is', null)
    .is('reverted_at', null)
    .is('purged_at', null)
    .lt('trash_expires_at', nowIso)
    .order('trash_expires_at', { ascending: true })
    .limit(limit);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let success = 0;
  let failed = 0;
  let removedArtwork = 0;
  let removedProfile = 0;
  let removedCafe24 = 0;
  let missingCafe24 = 0;

  for (const log of logs || []) {
    try {
      const metadata = asObject(log.metadata) || {};
      const beforeSnapshot = asObject(log.before_snapshot);
      const shouldCleanupStorage = metadata.storage_cleanup_deferred === true;
      const purgeTargetInfo = extractTrashPurgeTargetNames(log);

      let artworkCleanup = { removed: 0, failed: 0 };
      let profileCleanup = { removed: 0, failed: 0 };
      let cafe24Cleanup = {
        deleted: 0,
        missing: 0,
        failed: 0,
        skipped: false,
        productNos: [] as number[],
        errors: [] as string[],
      };

      if (shouldCleanupStorage && beforeSnapshot) {
        if (log.target_type === 'artwork') {
          const artworkPaths = collectArtworkPaths(beforeSnapshot);
          artworkCleanup = await removeStoragePaths(supabase, 'artworks', artworkPaths);
        } else if (log.target_type === 'artist') {
          const profilePaths = collectProfilePaths(beforeSnapshot);
          profileCleanup = await removeStoragePaths(supabase, 'profiles', profilePaths);
        }
      }

      if (log.target_type === 'artwork' && beforeSnapshot) {
        cafe24Cleanup = await purgeCafe24ProductsFromTrashEntry({
          targetType: log.target_type,
          beforeSnapshot: log.before_snapshot,
        });
        if (cafe24Cleanup.failed > 0) {
          throw new Error(`Cafe24 purge failed: ${cafe24Cleanup.errors.join(' | ')}`);
        }
      }

      const purgeAtIso = new Date().toISOString();
      const nextMetadata = {
        ...metadata,
        storage_cleanup_deferred: false,
        storage_cleanup_completed_at: purgeAtIso,
        storage_cleanup: {
          artwork_removed: artworkCleanup.removed,
          artwork_failed: artworkCleanup.failed,
          profile_removed: profileCleanup.removed,
          profile_failed: profileCleanup.failed,
        },
        cafe24_cleanup: {
          product_nos: cafe24Cleanup.productNos,
          deleted: cafe24Cleanup.deleted,
          missing: cafe24Cleanup.missing,
          failed: cafe24Cleanup.failed,
          skipped: cafe24Cleanup.skipped,
        },
      };

      const { data: markedRows, error: markError } = await supabase
        .from('activity_logs')
        .update({
          reversible: false,
          before_snapshot: null,
          after_snapshot: null,
          purged_at: purgeAtIso,
          purged_by: null,
          purge_note: '보관기간 30일 만료 자동 정리',
          metadata: nextMetadata,
        })
        .eq('id', log.id)
        .is('purged_at', null)
        .is('reverted_at', null)
        .select('id');

      if (markError || !markedRows || markedRows.length !== 1) {
        throw new Error(markError?.message || 'purge state update failed');
      }

      const { error: insertError } = await supabase.from('activity_logs').insert({
        actor_id: SYSTEM_ACTOR_ID,
        actor_role: 'system',
        actor_name: 'Trash Purge Job',
        actor_email: null,
        action: 'trash_purged',
        target_type: log.target_type,
        target_id: log.target_id,
        summary: `휴지통 만료 자동 정리: ${log.target_type} ${purgeTargetInfo.targetName || log.target_id}`,
        metadata: {
          purged_log_id: log.id,
          reason: '보관기간 30일 만료 자동 정리',
          mode: 'auto',
          artwork_removed: artworkCleanup.removed,
          artwork_failed: artworkCleanup.failed,
          profile_removed: profileCleanup.removed,
          profile_failed: profileCleanup.failed,
          cafe24_product_nos: cafe24Cleanup.productNos,
          cafe24_deleted: cafe24Cleanup.deleted,
          cafe24_missing: cafe24Cleanup.missing,
          cafe24_failed: cafe24Cleanup.failed,
          cafe24_skipped: cafe24Cleanup.skipped,
          ...(purgeTargetInfo.targetName ? { target_name: purgeTargetInfo.targetName } : {}),
          ...(purgeTargetInfo.targetNames ? { target_names: purgeTargetInfo.targetNames } : {}),
        },
        before_snapshot: null,
        after_snapshot: null,
        reversible: false,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      success += 1;
      removedArtwork += artworkCleanup.removed;
      removedProfile += profileCleanup.removed;
      removedCafe24 += cafe24Cleanup.deleted;
      missingCafe24 += cafe24Cleanup.missing;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[purge-trash] log=${log.id} failed: ${message}`);
      failed += 1;
    }
  }

  return NextResponse.json({
    target: (logs || []).length,
    success,
    failed,
    removedArtwork,
    removedProfile,
    removedCafe24,
    missingCafe24,
  });
}
