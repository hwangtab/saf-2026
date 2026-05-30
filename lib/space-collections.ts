import { cache } from 'react';
import { parsePrice } from '@/lib/parsePrice';
import { getAvailableArtworksLight } from '@/lib/supabase-data';
import { describeSize, type SizeBucket } from '@/lib/artwork-size';
import { shuffleArray } from '@/lib/utils';
import type { Artwork } from '@/types';

/**
 * 공간·용도 기반 큐레이션 컬렉션 (Phase 3).
 *
 * 작품은 **규칙(크기·가격 구간)으로 자동 선별** — 관리 부담 0, 항상 최신 재고 반영.
 * 정적 작품 ID 하드코드(매거진 안티패턴)를 피하고, 공간별 카피·맥락만 여기 정의한다.
 * tone(분위기)은 데이터가 부분적이라 hard filter가 아닌 **정렬 가점**(preferTones)으로만 사용.
 *
 * 카피는 special 페이지(PAGE_COPY) 패턴을 따라 ko/en 병기 — 페이지에서 locale로 선택.
 */
export interface CollectionRule {
  /** 포함할 크기 구간 (size_bucket). 미지정이면 크기 무관 */
  sizeBuckets?: SizeBucket[];
  /** 최소 가격 (KRW). parsePrice 기준 */
  priceMin?: number;
  /** 최대 가격 (KRW) */
  priceMax?: number;
  /** 포함할 카테고리(매체). 미지정이면 무관 */
  categories?: string[];
  /** 보조 정렬 가점용 톤 — 매칭 작품을 앞으로(필터 아님). tone 데이터가 부분적이라 hard filter 회피 */
  preferTones?: string[];
}

export interface SpaceCollection {
  slug: string;
  titleKo: string;
  titleEn: string;
  /** 한 줄 부제 (카드·hero) */
  subtitleKo: string;
  subtitleEn: string;
  /** 공간/용도 설명 — 왜 이 공간/용도에 어울리는가 */
  descriptionKo: string;
  descriptionEn: string;
  /** 대표 이모지 (카드 비주얼) */
  emoji: string;
  rule: CollectionRule;
  /** 표시 개수 상한 (기본 12) */
  limit?: number;
  displayOrder: number;
}

export const SPACE_COLLECTIONS: SpaceCollection[] = [
  {
    slug: 'living-room',
    titleKo: '거실에 걸 한 점',
    titleEn: 'A Statement Piece for the Living Room',
    subtitleKo: '공간을 압도하는 대작·대형 작품',
    subtitleEn: 'Large works that anchor the room',
    descriptionKo:
      '거실은 집의 얼굴입니다. 30호 이상의 대형 작품 한 점이 벽을 채우면 공간 전체의 분위기가 달라집니다. 소파 위, 빈 벽을 위한 존재감 있는 작품을 모았습니다.',
    descriptionEn:
      'The living room is the face of a home. A single large work above the sofa transforms the whole space. Here are works with the presence to fill a wall.',
    emoji: '🛋️',
    rule: { sizeBuckets: ['large', 'xlarge'] },
    displayOrder: 1,
  },
  {
    slug: 'bedroom',
    titleKo: '침실의 정제된 한 점',
    titleEn: 'A Quiet Piece for the Bedroom',
    subtitleKo: '차분하고 절제된 중·소형 작품',
    subtitleEn: 'Calm, restrained works in modest sizes',
    descriptionKo:
      '하루를 시작하고 마무리하는 침실에는 시선을 압도하지 않는 정제된 작품이 어울립니다. 차분하고 명상적인 분위기의 중·소형 작품을 골랐습니다.',
    descriptionEn:
      'The bedroom — where the day begins and ends — calls for restrained works that soothe rather than demand attention. Calm, meditative pieces in small to medium sizes.',
    emoji: '🛏️',
    rule: {
      sizeBuckets: ['small', 'medium'],
      preferTones: ['차분한', '명상적', '서정적', '절제된'],
    },
    displayOrder: 2,
  },
  {
    slug: 'entrance',
    titleKo: '현관을 여는 작은 그림',
    titleEn: 'A Small Work to Greet You',
    subtitleKo: '좁은 벽에 어울리는 소품',
    subtitleEn: 'Petite works for narrow walls',
    descriptionKo:
      '집에 들어서며 가장 먼저 마주하는 현관. 좁은 벽이나 신발장 위에 어울리는 따뜻한 소품 한 점이 매일의 첫 인상을 만듭니다.',
    descriptionEn:
      'The entrance is the first thing you meet coming home. A warm, small work for a narrow wall or shelf sets the tone for every day.',
    emoji: '🚪',
    rule: { sizeBuckets: ['small'], preferTones: ['따뜻한', '서정적', '향토적'] },
    displayOrder: 3,
  },
  {
    slug: 'study',
    titleKo: '서재·작업실의 한 점',
    titleEn: 'A Piece for the Study',
    subtitleKo: '집중을 돕는 사색적인 중형 작품',
    subtitleEn: 'Contemplative mid-size works',
    descriptionKo:
      '책상 앞에서 오래 머무는 서재와 작업실에는 사색을 돕는 작품이 좋습니다. 시선이 머물되 집중을 흩뜨리지 않는 중형 작품을 모았습니다.',
    descriptionEn:
      'A study or studio — where you linger at the desk — pairs well with contemplative work. Mid-size pieces that hold the eye without breaking focus.',
    emoji: '📚',
    rule: {
      sizeBuckets: ['medium'],
      preferTones: ['사색적', '절제된', '명상적', '차분한'],
    },
    displayOrder: 4,
  },
  {
    slug: 'first-piece',
    titleKo: '첫 그림으로 좋은 작품',
    titleEn: 'A Great First Artwork',
    subtitleKo: '부담 없는 가격의 입문 소품',
    subtitleEn: 'Approachable works to start your collection',
    descriptionKo:
      '원작을 처음 들이는 분께. 30만 원 이하의 부담 없는 가격에, 어느 공간에도 어울리는 소·중형 작품으로 컬렉션의 첫 걸음을 시작해 보세요.',
    descriptionEn:
      'For your very first original. Approachable works under ₩300,000 in small to medium sizes — an easy first step into collecting.',
    emoji: '🌱',
    rule: { sizeBuckets: ['small', 'medium'], priceMax: 300_000 },
    displayOrder: 5,
  },
  {
    slug: 'gift',
    titleKo: '선물하기 좋은 작품',
    titleEn: 'Artworks to Give',
    subtitleKo: '마음을 전하는 적정가의 한 점',
    subtitleEn: 'Thoughtful pieces at a giftable price',
    descriptionKo:
      '특별한 사람에게 원작을 선물해 보세요. 10만~70만 원대의 소·중형 작품은 부담 없이 마음을 전하기에 좋습니다. 모든 구매는 예술인 상호부조 기금으로도 이어집니다.',
    descriptionEn:
      'Give an original to someone special. Small to medium works between ₩100,000 and ₩700,000 carry your heart without overwhelming. Every purchase also supports the artist mutual-aid fund.',
    emoji: '🎁',
    rule: { sizeBuckets: ['small', 'medium'], priceMin: 100_000, priceMax: 700_000 },
    displayOrder: 6,
  },
];

export function getSpaceCollections(): SpaceCollection[] {
  return [...SPACE_COLLECTIONS].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getSpaceCollectionBySlug(slug: string): SpaceCollection | undefined {
  return SPACE_COLLECTIONS.find((c) => c.slug === slug);
}

const bucketOf = (a: Artwork): string | null => a.size_bucket ?? describeSize(a)?.bucket ?? null;

/**
 * 컬렉션 규칙으로 작품을 자동 선별. available(판매중) 경량 작품 풀에서 필터 + 작가 dedupe.
 * preferTones가 있으면 매칭 작품을 앞으로 정렬(가점), 없으면 셔플.
 */
export const getCollectionArtworks = cache(
  async (slug: string, limit?: number): Promise<Artwork[]> => {
    const collection = getSpaceCollectionBySlug(slug);
    if (!collection) return [];
    const { rule } = collection;
    const available = await getAvailableArtworksLight();

    const candidates = available.filter((a) => {
      if (rule.sizeBuckets) {
        const b = bucketOf(a);
        if (!b || !rule.sizeBuckets.includes(b as SizeBucket)) return false;
      }
      if (rule.priceMin != null || rule.priceMax != null) {
        const price = parsePrice(a.price);
        if (!Number.isFinite(price)) return false;
        if (rule.priceMin != null && price < rule.priceMin) return false;
        if (rule.priceMax != null && price > rule.priceMax) return false;
      }
      if (rule.categories && (!a.category || !rule.categories.includes(a.category))) return false;
      return true;
    });

    const prefer = rule.preferTones;
    const ordered =
      prefer && prefer.length
        ? shuffleArray(candidates).sort((a, b) => {
            const sa = (a.tone || []).some((t) => prefer.includes(t)) ? 0 : 1;
            const sb = (b.tone || []).some((t) => prefer.includes(t)) ? 0 : 1;
            return sa - sb;
          })
        : shuffleArray(candidates);

    // 작가 dedupe — 한 작가가 컬렉션을 점유하지 않도록 다양성 확보
    const seen = new Set<string>();
    const deduped: Artwork[] = [];
    for (const a of ordered) {
      if (seen.has(a.artist)) continue;
      seen.add(a.artist);
      deduped.push(a);
    }
    return deduped.slice(0, limit ?? collection.limit ?? 12);
  }
);
