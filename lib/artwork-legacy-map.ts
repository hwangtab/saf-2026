import { artworks } from '@/content/saf2026-artworks';
import { artworksBatch1 } from '@/content/artworks-batches/batch-001';
import { artworksBatch2 } from '@/content/artworks-batches/batch-002';
import { artworksBatch3 } from '@/content/artworks-batches/batch-003';
import { artworksBatch4 } from '@/content/artworks-batches/batch-004';
import { batch005 } from '@/content/artworks-batches/batch-005';
import { batch006 } from '@/content/artworks-batches/batch-006';
import { batch007 } from '@/content/artworks-batches/batch-007';
import { batch008 } from '@/content/artworks-batches/batch-008';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_NUMERIC = /^\d+$/;

// 공백/제로폭 문자/유니코드 NFC 차이로 매칭이 빗나가는 것 방지.
// 한글 자모 결합형(NFD)과 완성형(NFC) 혼재 케이스도 흡수.
const normalizeKey = (s: string | null | undefined): string =>
  (s ?? '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const buildLegacyToUuidMap = (): {
  map: Map<string, string>;
  unmapped: Array<{ id: string; artist: string; title: string }>;
} => {
  const map = new Map<string, string>();
  const unmapped: Array<{ id: string; artist: string; title: string }> = [];
  const legacyBatches = [
    ...artworksBatch1,
    ...artworksBatch2,
    ...artworksBatch3,
    ...artworksBatch4,
    ...batch005,
    ...batch006,
    ...batch007,
    ...batch008,
  ];

  // DB 작품을 normalized (artist+title) 키로 인덱싱 — O(N) 룩업
  const dbIndex = new Map<string, string>();
  for (const a of artworks) {
    if (!UUID_REGEX.test(a.id)) continue;
    const key = `${normalizeKey(a.artist)}|${normalizeKey(a.title)}`;
    if (!dbIndex.has(key)) dbIndex.set(key, a.id);
  }

  for (const legacy of legacyBatches) {
    if (!LEGACY_NUMERIC.test(legacy.id)) continue;
    const key = `${normalizeKey(legacy.artist)}|${normalizeKey(legacy.title)}`;
    const uuid = dbIndex.get(key);
    if (uuid) {
      map.set(legacy.id, uuid);
    } else {
      unmapped.push({ id: legacy.id, artist: legacy.artist, title: legacy.title });
    }
  }

  return { map, unmapped };
};

let cachedMap: Map<string, string> | null = null;

function getLegacyMap(): Map<string, string> {
  if (cachedMap) return cachedMap;
  const { map, unmapped } = buildLegacyToUuidMap();
  cachedMap = map;
  // 빌드 시 매핑 검증 로그 — 미매핑 ID는 middleware에서 404 응답되어 색인 차단됨
  // eslint-disable-next-line no-console
  console.log(
    `[artwork-legacy-map] mapped=${map.size}, unmapped=${unmapped.length}` +
      (unmapped.length > 0
        ? ` — first 5 unmapped: ${unmapped
            .slice(0, 5)
            .map((u) => `${u.id}(${u.artist}/${u.title})`)
            .join(', ')}`
        : '')
  );
  return cachedMap;
}

export function resolveLegacyArtworkId(id: string): string | null {
  if (!LEGACY_NUMERIC.test(id)) return null;
  return getLegacyMap().get(id) ?? null;
}

export function isLegacyNumericId(id: string): boolean {
  return LEGACY_NUMERIC.test(id);
}
