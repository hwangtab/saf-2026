import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  DRAFT_PREFIX,
  DEFAULT_AGE_THRESHOLD_MS,
  decideDraftPurge,
  extractSnapshotImageUrls,
  summarizeSkips,
  buildReferencedArtworkPaths,
  type DraftStorageObject,
} from '@/lib/admin/draft-image-purge';

const SUPABASE = 'https://khtunrybrzntlnowlahb.supabase.co';
const objectUrl = (path: string) => `${SUPABASE}/storage/v1/object/public/artworks/${path}`;
const renderUrl = (path: string) =>
  `${SUPABASE}/storage/v1/render/image/public/artworks/${path}?width=400&quality=75`;

const NOW = Date.parse('2026-06-19T12:00:00.000Z');
const OLD = '2026-06-15T00:00:00.000Z'; // > 48h 전
const RECENT = '2026-06-19T11:00:00.000Z'; // 1h 전

const DRAFT_A = `${DRAFT_PREFIX}aaaa/11111111.webp`;
const DRAFT_B = `${DRAFT_PREFIX}bbbb/22222222.webp`;

describe('decideDraftPurge', () => {
  it('protects a referenced draft regardless of age', () => {
    const referenced = new Set([DRAFT_A]);
    const objects: DraftStorageObject[] = [{ path: DRAFT_A, createdAt: OLD }];
    const [decision] = decideDraftPurge(objects, referenced, NOW, DEFAULT_AGE_THRESHOLD_MS);
    expect(decision).toEqual({ path: DRAFT_A, deletable: false, reason: 'referenced' });
  });

  it('deletes an unreferenced, sufficiently old draft', () => {
    const [decision] = decideDraftPurge([{ path: DRAFT_A, createdAt: OLD }], new Set(), NOW);
    expect(decision).toEqual({ path: DRAFT_A, deletable: true });
  });

  it('keeps an unreferenced but too-new draft (editing-session safety window)', () => {
    const [decision] = decideDraftPurge([{ path: DRAFT_A, createdAt: RECENT }], new Set(), NOW);
    expect(decision).toEqual({ path: DRAFT_A, deletable: false, reason: 'too_new' });
  });

  it('never deletes outside the admin-artwork-draft- prefix (hard guard)', () => {
    const permanent = 'artworks-uuid/82__original.webp';
    const [decision] = decideDraftPurge([{ path: permanent, createdAt: OLD }], new Set(), NOW);
    expect(decision).toEqual({ path: permanent, deletable: false, reason: 'out_of_scope' });
  });

  it('keeps a draft whose created_at is unknown', () => {
    const [decision] = decideDraftPurge([{ path: DRAFT_A, createdAt: null }], new Set(), NOW);
    expect(decision).toEqual({ path: DRAFT_A, deletable: false, reason: 'unknown_age' });
  });

  it('summarizes skip reasons', () => {
    const decisions = decideDraftPurge(
      [
        { path: DRAFT_A, createdAt: OLD }, // deletable
        { path: DRAFT_B, createdAt: RECENT }, // too_new
      ],
      new Set(),
      NOW
    );
    expect(summarizeSkips(decisions)).toEqual({
      out_of_scope: 0,
      referenced: 0,
      too_new: 1,
      unknown_age: 0,
    });
  });
});

describe('extractSnapshotImageUrls', () => {
  it('reads images from a single-object snapshot', () => {
    expect(extractSnapshotImageUrls({ id: '1', images: [objectUrl(DRAFT_A)] })).toEqual([
      objectUrl(DRAFT_A),
    ]);
  });

  it('reads images from an array snapshot (batch delete)', () => {
    const snap = [
      { id: '1', images: [objectUrl(DRAFT_A)] },
      { id: '2', images: [objectUrl(DRAFT_B)] },
    ];
    expect(extractSnapshotImageUrls(snap)).toEqual([objectUrl(DRAFT_A), objectUrl(DRAFT_B)]);
  });

  it('reads images from an { items: [...] } snapshot', () => {
    const snap = { items: [{ id: '1', images: [objectUrl(DRAFT_A)] }] };
    expect(extractSnapshotImageUrls(snap)).toEqual([objectUrl(DRAFT_A)]);
  });

  it('returns empty for null/garbage snapshots', () => {
    expect(extractSnapshotImageUrls(null)).toEqual([]);
    expect(extractSnapshotImageUrls('nope')).toEqual([]);
    expect(extractSnapshotImageUrls({ id: '1' })).toEqual([]);
  });
});

// buildReferencedArtworkPaths를 mock client로 검증 — adversarial 분석이 critical로 지목한
// (1) render-form URL 참조 보호, (2) 활성 트래시 스냅샷 참조 보호를 통합적으로 확인한다.
type MockOptions = {
  artworksRows: { images: string[] | null }[];
  logRows: { before_snapshot: unknown; after_snapshot: unknown }[];
  artworksError?: string;
  logsError?: string;
};

function makeMockSupabase(options: MockOptions): SupabaseClient<Database> {
  const mock = {
    from(table: string) {
      if (table === 'artworks') {
        return {
          select() {
            return {
              range(from: number) {
                if (options.artworksError) {
                  return Promise.resolve({ data: null, error: { message: options.artworksError } });
                }
                // 첫 페이지에 전부 반환, 이후 페이지는 빈 배열로 종료.
                return Promise.resolve({
                  data: from === 0 ? options.artworksRows : [],
                  error: null,
                });
              },
            };
          },
        };
      }
      if (table === 'activity_logs') {
        const result = options.logsError
          ? { data: null, error: { message: options.logsError } }
          : { data: options.logRows, error: null };
        const chain = {
          select: () => chain,
          in: () => chain,
          is: () => chain,
          then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
        };
        return chain;
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return mock as unknown as SupabaseClient<Database>;
}

describe('buildReferencedArtworkPaths', () => {
  it('protects a draft referenced via the RENDER-endpoint URL form (normalizes to path)', async () => {
    const supabase = makeMockSupabase({
      artworksRows: [{ images: [renderUrl(DRAFT_A)] }],
      logRows: [],
    });
    const referenced = await buildReferencedArtworkPaths(supabase);
    // render-form으로 저장돼도 object path로 정규화되어 동일 draft를 보호해야 한다.
    expect(referenced.has(DRAFT_A)).toBe(true);

    const [decision] = decideDraftPurge([{ path: DRAFT_A, createdAt: OLD }], referenced, NOW);
    expect(decision.deletable).toBe(false);
  });

  it('protects a draft referenced only by an active (un-reverted, un-purged) trash snapshot', async () => {
    const supabase = makeMockSupabase({
      artworksRows: [], // 작품 row 없음 — 삭제된 상태
      logRows: [
        { before_snapshot: { id: 'x', images: [objectUrl(DRAFT_B)] }, after_snapshot: null },
      ],
    });
    const referenced = await buildReferencedArtworkPaths(supabase);
    expect(referenced.has(DRAFT_B)).toBe(true);
  });

  it('throws (fail-closed) when the artworks scan errors', async () => {
    const supabase = makeMockSupabase({ artworksRows: [], logRows: [], artworksError: 'boom' });
    await expect(buildReferencedArtworkPaths(supabase)).rejects.toThrow(/artworks scan failed/);
  });

  it('throws (fail-closed) when the trash snapshot scan errors', async () => {
    const supabase = makeMockSupabase({
      artworksRows: [{ images: [objectUrl(DRAFT_A)] }],
      logRows: [],
      logsError: 'db down',
    });
    await expect(buildReferencedArtworkPaths(supabase)).rejects.toThrow(
      /trash snapshot scan failed/
    );
  });
});
