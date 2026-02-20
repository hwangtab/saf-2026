#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Error: NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SECRET_KEY(또는 SUPABASE_SERVICE_ROLE_KEY)가 필요합니다.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  },
});
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const TRASHABLE_ACTIONS = [
  'artwork_deleted',
  'artist_deleted',
  'artist_artwork_deleted',
  'batch_artwork_deleted',
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const hardLimit = limitArg ? Number(limitArg.split('=')[1]) : 200;
const limit = Number.isFinite(hardLimit) && hardLimit > 0 ? Math.min(hardLimit, 1000) : 200;

function asObject(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  return value;
}

function asObjectList(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === 'object');
  }
  const objectValue = asObject(value);
  if (!objectValue || !Array.isArray(objectValue.items)) return null;
  return objectValue.items.filter((item) => item && typeof item === 'object');
}

function getSnapshotDisplayName(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;

  const title = typeof snapshot.title === 'string' ? snapshot.title : null;
  const nameKo = typeof snapshot.name_ko === 'string' ? snapshot.name_ko : null;
  const name = typeof snapshot.name === 'string' ? snapshot.name : null;
  const artistName = typeof snapshot.artist_name === 'string' ? snapshot.artist_name : null;
  const representativeName =
    typeof snapshot.representative_name === 'string' ? snapshot.representative_name : null;

  return title || nameKo || name || artistName || representativeName || null;
}

function extractTrashPurgeTargetNames(log) {
  const metadata = asObject(log.metadata) || {};
  const targetNames = new Map();

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

function getStoragePathFromPublicUrl(publicUrl, bucket) {
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

function expandArtworkVariantPaths(pathValue) {
  const match = pathValue.match(/__(thumb|card|detail|hero|original)\.webp$/i);
  if (!match) return [pathValue];
  const prefix = pathValue.replace(/__(thumb|card|detail|hero|original)\.webp$/i, '');
  return ['thumb', 'card', 'detail', 'hero', 'original'].map(
    (variant) => `${prefix}__${variant}.webp`
  );
}

function collectArtworkPaths(snapshot) {
  const urls = [];
  const list = asObjectList(snapshot);
  const items = list || [snapshot];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
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
    .filter(Boolean)
    .flatMap((pathValue) => expandArtworkVariantPaths(pathValue));
  return Array.from(new Set(paths));
}

function collectProfilePaths(snapshot) {
  if (!snapshot) return [];
  const profileImage = snapshot.profile_image;
  if (typeof profileImage !== 'string' || !profileImage) return [];
  const profilePath = getStoragePathFromPublicUrl(profileImage, 'profiles');
  return profilePath ? [profilePath] : [];
}

async function removeStoragePaths(bucket, paths) {
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
    const removedCount = Array.isArray(data) ? data.filter((item) => !item.error).length : 0;
    removed += removedCount;
    failed += Math.max(0, chunk.length - removedCount);
  }

  return { removed, failed };
}

function resolveCleanupPaths(log) {
  const metadata = asObject(log.metadata) || {};
  const beforeSnapshot = asObject(log.before_snapshot);
  const cleanupDeferred = metadata.storage_cleanup_deferred === true;

  if (!cleanupDeferred || !beforeSnapshot) {
    return { artworkPaths: [], profilePaths: [] };
  }

  if (log.target_type === 'artwork') {
    return {
      artworkPaths: collectArtworkPaths(beforeSnapshot),
      profilePaths: [],
    };
  }

  if (log.target_type === 'artist') {
    return {
      artworkPaths: [],
      profilePaths: collectProfilePaths(beforeSnapshot),
    };
  }

  return { artworkPaths: [], profilePaths: [] };
}

async function fetchExpiredTrashLogs(maxRows) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
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
    .limit(maxRows);

  if (error) throw error;
  return data || [];
}

async function markPurged(log, reason, cleanup) {
  const nowIso = new Date().toISOString();
  const previousMetadata = asObject(log.metadata) || {};
  const purgeTargetInfo = extractTrashPurgeTargetNames(log);
  const nextMetadata = {
    ...previousMetadata,
    storage_cleanup_deferred: false,
    storage_cleanup_completed_at: nowIso,
    storage_cleanup: {
      artwork_removed: cleanup.artwork.removed,
      artwork_failed: cleanup.artwork.failed,
      profile_removed: cleanup.profile.removed,
      profile_failed: cleanup.profile.failed,
    },
  };

  const { data: updatedRows, error: updateError } = await supabase
    .from('activity_logs')
    .update({
      reversible: false,
      before_snapshot: null,
      after_snapshot: null,
      purged_at: nowIso,
      purged_by: null,
      purge_note: reason,
      metadata: nextMetadata,
    })
    .eq('id', log.id)
    .is('purged_at', null)
    .is('reverted_at', null)
    .select('id');

  if (updateError) throw updateError;
  if (!updatedRows || updatedRows.length !== 1) {
    throw new Error(`로그 ${log.id}의 영구 삭제 상태 갱신에 실패했습니다.`);
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
      reason,
      mode: 'auto',
      artwork_removed: cleanup.artwork.removed,
      artwork_failed: cleanup.artwork.failed,
      profile_removed: cleanup.profile.removed,
      profile_failed: cleanup.profile.failed,
      ...(purgeTargetInfo.targetName ? { target_name: purgeTargetInfo.targetName } : {}),
      ...(purgeTargetInfo.targetNames ? { target_names: purgeTargetInfo.targetNames } : {}),
    },
    before_snapshot: null,
    after_snapshot: null,
    reversible: false,
  });

  if (insertError) throw insertError;
}

async function purgeExpiredTrash() {
  const logs = await fetchExpiredTrashLogs(limit);

  if (logs.length === 0) {
    console.log('purge_target=0');
    return;
  }

  console.log(`purge_target=${logs.length}`);
  if (dryRun) {
    for (const log of logs) {
      console.log(`dry_run log=${log.id} action=${log.action} target=${log.target_type}:${log.target_id}`);
    }
    return;
  }

  let success = 0;
  let failed = 0;
  let removedArtwork = 0;
  let removedProfile = 0;

  for (const log of logs) {
    try {
      const paths = resolveCleanupPaths(log);
      const [artworkCleanup, profileCleanup] = await Promise.all([
        removeStoragePaths('artworks', paths.artworkPaths),
        removeStoragePaths('profiles', paths.profilePaths),
      ]);

      await markPurged(log, '보관기간 30일 만료 자동 정리', {
        artwork: artworkCleanup,
        profile: profileCleanup,
      });

      success += 1;
      removedArtwork += artworkCleanup.removed;
      removedProfile += profileCleanup.removed;
      console.log(
        `purged log=${log.id} artwork_removed=${artworkCleanup.removed} profile_removed=${profileCleanup.removed}`
      );
    } catch (error) {
      failed += 1;
      console.error(`purge_failed log=${log.id} reason=${error.message || error}`);
    }
  }

  console.log(`purge_success=${success}`);
  console.log(`purge_failed=${failed}`);
  console.log(`artwork_removed=${removedArtwork}`);
  console.log(`profile_removed=${removedProfile}`);
}

purgeExpiredTrash().catch((error) => {
  console.error('휴지통 만료 정리 실패:', error.message || error);
  process.exit(1);
});
