import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { getStoragePathFromPublicUrl, expandArtworkVariantPaths } from '@/lib/utils/form-helpers';

/**
 * 관리자 작품 등록용 임시(draft) 이미지 orphan 정리 로직.
 *
 * 배경: 작품 신규 등록 시 업로드 이미지는 `admin-artwork-draft-<uuid>/` storage 경로에
 * 올라가고, createAdminArtwork는 그 draft URL을 artworks.images에 그대로 저장한다(이동 없음).
 * 따라서 등록을 끝내지 않고 폼을 떠난 draft 객체는 어디서도 참조되지 않은 채 누적된다.
 * 이 모듈은 "어떤 작품도(트래시 포함) 참조하지 않고 충분히 오래된 draft 객체"만 골라낸다.
 *
 * 안전 불변식 (절대 라이브 이미지를 지우지 않기 위함):
 *  1) 삭제 대상은 `admin-artwork-draft-` prefix 객체로만 한정 (영구 namespace 불가침)
 *  2) 참조집합 = artworks.images ∪ 활성 트래시 스냅샷(activity_logs), URL은 storage path로 정규화
 *  3) 삭제 = 미참조 AND 충분히 오래됨(age) — 둘 다 만족할 때만
 *  4) 참조 스캔 실패는 fail-closed (throw) — 읽기 실패를 '미참조'로 오판하지 않음
 */

export const DRAFT_PREFIX = 'admin-artwork-draft-';

/** 편집 세션·등록 진행 중인 draft를 지우지 않기 위한 안전 유예 (기본 48h). */
export const DEFAULT_AGE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/** 작품/작가 소프트삭제(트래시)로 before_snapshot에 이미지가 보존되는 액션들. */
const TRASHABLE_ACTIONS = [
  'artwork_deleted',
  'artist_deleted',
  'artist_artwork_deleted',
  'batch_artwork_deleted',
  'exhibitor_artwork_deleted',
  'exhibitor_artist_deleted',
];

const ARTWORKS_BUCKET = 'artworks';

export type DraftStorageObject = {
  /** 버킷 상대 경로, 예: admin-artwork-draft-<uuid>/<fileuuid>.webp */
  path: string;
  /** storage 객체 생성 시각(ISO). 알 수 없으면 null → 보존. */
  createdAt: string | null;
};

export type SkipReason = 'out_of_scope' | 'referenced' | 'too_new' | 'unknown_age';

export type PurgeDecision =
  | { path: string; deletable: true }
  | { path: string; deletable: false; reason: SkipReason };

type AdminSupabaseClient = SupabaseClient<Database>;

/**
 * 트래시/일반 스냅샷에서 이미지 URL을 모은다. 스냅샷은 단일 객체, 배열,
 * 혹은 { items: [...] } 형태일 수 있어 재귀적으로 images 배열을 수집한다.
 */
export function extractSnapshotImageUrls(snapshot: unknown): string[] {
  const urls: string[] = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj.images)) {
      for (const image of obj.images) {
        if (typeof image === 'string' && image) urls.push(image);
      }
    }
    if (Array.isArray(obj.items)) obj.items.forEach(visit);
  };

  visit(snapshot);
  return urls;
}

/** 이미지 URL 목록을 정규화된 storage path 집합으로 변환(변형 패밀리 확장 포함). */
function addUrlsToReferenced(urls: string[], referenced: Set<string>): void {
  for (const url of urls) {
    const path = getStoragePathFromPublicUrl(url, ARTWORKS_BUCKET);
    if (!path) continue;
    // __thumb/__card 등 변형 형제까지 참조로 간주(라이브 변형 보호). draft는 변형이
    // 없어 expandArtworkVariantPaths가 그대로 [path]를 반환하므로 안전.
    for (const expanded of expandArtworkVariantPaths(path)) {
      referenced.add(expanded);
    }
  }
}

/**
 * 라이브로 참조되는 모든 artworks-bucket storage path 집합을 만든다.
 *  - artworks.images 전체 (페이지네이션)
 *  - 활성 트래시 스냅샷 (reverted_at/purged_at IS NULL) — 30일 복구 윈도우 보호
 * 어느 쿼리든 에러면 throw → 호출부가 삭제를 중단(fail-closed)한다.
 */
export async function buildReferencedArtworkPaths(
  supabase: AdminSupabaseClient
): Promise<Set<string>> {
  const referenced = new Set<string>();
  const PAGE = 1000;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('artworks')
      .select('images')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`artworks scan failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      const images = Array.isArray(row.images) ? row.images : [];
      addUrlsToReferenced(
        images.filter((value): value is string => typeof value === 'string'),
        referenced
      );
    }
    if (data.length < PAGE) break;
  }

  const { data: logs, error: logError } = await supabase
    .from('activity_logs')
    .select('before_snapshot, after_snapshot')
    .in('action', TRASHABLE_ACTIONS)
    .is('reverted_at', null)
    .is('purged_at', null);
  if (logError) throw new Error(`trash snapshot scan failed: ${logError.message}`);

  for (const log of logs ?? []) {
    addUrlsToReferenced(extractSnapshotImageUrls(log.before_snapshot), referenced);
    addUrlsToReferenced(extractSnapshotImageUrls(log.after_snapshot), referenced);
  }

  return referenced;
}

/**
 * artworks 버킷에서 admin-artwork-draft-* 객체를 전부 나열한다.
 * top-level에서 draft 폴더를 찾고, 각 폴더 내부를 페이지네이션으로 순회한다.
 * 어느 list 호출이든 에러면 throw → fail-closed.
 */
export async function listDraftStorageObjects(
  supabase: AdminSupabaseClient
): Promise<DraftStorageObject[]> {
  const PAGE = 1000;
  const draftFolders: string[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(ARTWORKS_BUCKET)
      .list('', { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`storage list (root) failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      // 폴더 placeholder는 id가 null. draft prefix 폴더만 수집.
      if (entry.id === null && entry.name.startsWith(DRAFT_PREFIX)) {
        draftFolders.push(entry.name);
      }
    }
    if (data.length < PAGE) break;
  }

  const objects: DraftStorageObject[] = [];
  for (const folder of draftFolders) {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase.storage
        .from(ARTWORKS_BUCKET)
        .list(folder, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw new Error(`storage list (${folder}) failed: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const entry of data) {
        if (entry.id !== null) {
          objects.push({ path: `${folder}/${entry.name}`, createdAt: entry.created_at ?? null });
        }
      }
      if (data.length < PAGE) break;
    }
  }

  return objects;
}

/**
 * 순수 함수: 각 draft 객체의 삭제 가부를 판정한다.
 *  - prefix 밖 → out_of_scope (방어적, 입력이 draft만이어도 한 번 더 가드)
 *  - 참조집합에 있음 → referenced (라이브 보호)
 *  - 생성시각 불명 → unknown_age (보존)
 *  - age 미달 → too_new (보존)
 *  - 그 외 → deletable
 */
export function decideDraftPurge(
  objects: DraftStorageObject[],
  referencedPaths: Set<string>,
  nowMs: number,
  ageThresholdMs: number = DEFAULT_AGE_THRESHOLD_MS
): PurgeDecision[] {
  return objects.map((object) => {
    if (!object.path.startsWith(DRAFT_PREFIX)) {
      return { path: object.path, deletable: false, reason: 'out_of_scope' };
    }
    if (referencedPaths.has(object.path)) {
      return { path: object.path, deletable: false, reason: 'referenced' };
    }
    if (!object.createdAt) {
      return { path: object.path, deletable: false, reason: 'unknown_age' };
    }
    const createdMs = new Date(object.createdAt).getTime();
    if (Number.isNaN(createdMs)) {
      return { path: object.path, deletable: false, reason: 'unknown_age' };
    }
    if (nowMs - createdMs < ageThresholdMs) {
      return { path: object.path, deletable: false, reason: 'too_new' };
    }
    return { path: object.path, deletable: true };
  });
}

/** decideDraftPurge 결과를 사유별 건수로 요약(관찰성). */
export function summarizeSkips(decisions: PurgeDecision[]): Record<SkipReason, number> {
  const summary: Record<SkipReason, number> = {
    out_of_scope: 0,
    referenced: 0,
    too_new: 0,
    unknown_age: 0,
  };
  for (const decision of decisions) {
    if (!decision.deletable) summary[decision.reason] += 1;
  }
  return summary;
}
