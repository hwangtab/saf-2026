import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

function getStoragePathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return url.pathname.slice(index + marker.length);
  } catch {
    return null;
  }
}

function expandArtworkVariantPaths(pathValue: string): string[] {
  const match = pathValue.match(/__(thumb|card|detail|hero|original)\.webp$/i);
  if (!match) return [pathValue];
  const prefix = pathValue.replace(/__(thumb|card|detail|hero|original)\.webp$/i, '');
  return ['thumb', 'card', 'detail', 'hero', 'original'].map(
    (variant) => `${prefix}__${variant}.webp`
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

  for (const log of logs || []) {
    try {
      const metadata = asObject(log.metadata) || {};
      const beforeSnapshot = asObject(log.before_snapshot);
      const shouldCleanupStorage = metadata.storage_cleanup_deferred === true;

      let artworkCleanup = { removed: 0, failed: 0 };
      let profileCleanup = { removed: 0, failed: 0 };

      if (shouldCleanupStorage && beforeSnapshot) {
        if (log.target_type === 'artwork') {
          const artworkPaths = collectArtworkPaths(beforeSnapshot);
          artworkCleanup = await removeStoragePaths(supabase, 'artworks', artworkPaths);
        } else if (log.target_type === 'artist') {
          const profilePaths = collectProfilePaths(beforeSnapshot);
          profileCleanup = await removeStoragePaths(supabase, 'profiles', profilePaths);
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
        summary: `휴지통 만료 자동 정리: ${log.target_type} ${log.target_id}`,
        metadata: {
          purged_log_id: log.id,
          reason: '보관기간 30일 만료 자동 정리',
          mode: 'auto',
          artwork_removed: artworkCleanup.removed,
          artwork_failed: artworkCleanup.failed,
          profile_removed: profileCleanup.removed,
          profile_failed: profileCleanup.failed,
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
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({
    target: (logs || []).length,
    success,
    failed,
    removedArtwork,
    removedProfile,
  });
}
