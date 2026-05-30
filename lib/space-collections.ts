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
      '거실은 집에서 가장 오래 머무는, 그래서 집의 인상을 결정하는 공간입니다. 소파 위 넓은 벽 하나를 비워 두기엔 아깝죠. 30호를 넘는 대작 한 점은 그 자체로 공간의 중심이 되어, 가구보다 먼저 시선을 붙잡고 손님과의 대화를 엽니다. 멀리서도 또렷한 색과 구성을 지닌, 존재감 있는 작품들을 모았습니다.',
    descriptionEn:
      'The living room is where you spend the most time — and where a home makes its first impression. A wide wall above the sofa is too good to leave bare. A single large work, nearly a meter across, becomes the center of the room: it holds the eye before the furniture does and opens conversation with guests. Here are pieces whose color and composition read clearly even from across the room.',
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
      '침실은 하루의 처음과 끝을 맞는 가장 사적인 공간입니다. 강한 색이나 격렬한 형상은 쉼을 방해하기 쉽죠. 그래서 시선을 끌되 압도하지 않는, 차분하고 명상적인 작품을 골랐습니다. 흰 여백이 넉넉하거나 단색에 가까운 중·소형 작품이 머리맡과 침대 맞은편 벽을 조용히 채웁니다.',
    descriptionEn:
      'The bedroom is the most private room — the first and last space you see each day. Strong colors and restless forms tend to disturb rest. So we chose calm, meditative works that draw the eye without overwhelming it. Small to medium pieces, generous in white space or close to monochrome, quietly fill the wall at your bedside or across from it.',
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
      '현관은 집에 들어서며 가장 먼저, 그리고 매일 마주하는 자리입니다. 좁은 벽이나 신발장 위에 큰 작품은 부담스럽지만, 빈 채로 두면 어딘가 허전한 공간이죠. 손바닥만 한 따뜻한 소품 한 점이 그 자리를 채우면, 문을 여닫는 순간마다 작은 환대가 됩니다. 현관과 복도의 작은 벽에 어울리는, 정겨운 소품들을 모았습니다.',
    descriptionEn:
      'The entrance is the first thing you meet coming home — and you meet it every day. A large work feels heavy on a narrow wall or above the shoe cabinet, yet left bare the spot feels unfinished. A small, warm piece the size of your palm turns it into a quiet welcome each time the door opens. Here are tender little works suited to the small walls of entryways and hallways.',
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
      '서재와 작업실은 한 가지 일에 오래 머무는 공간입니다. 책상 앞에서 보내는 시간이 길수록, 시선이 잠시 쉬어갈 자리가 필요하죠. 너무 화려하면 집중을 흩뜨리고, 너무 비면 삭막합니다. 절제된 색과 여백을 지닌 사색적인 중형 작품을 책장 곁이나 책상 맞은편에 두기 좋게 골랐습니다.',
    descriptionEn:
      'A study or studio is where you stay with one task for a long time. The longer you sit at the desk, the more you need a place for the eye to rest. Too vivid and it breaks concentration; too bare and it turns cold. We chose contemplative mid-size works — restrained in color and generous in space — to sit beside the bookshelf or across from the desk.',
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
      '원작을 처음 들이는 일은 생각보다 떨립니다. ‘내 안목이 맞을까’, ‘이 가격이 적당할까’ 망설이게 되죠. 그래서 30만 원 이하, 어느 벽에나 무리 없이 어울리는 소·중형 작품으로 첫걸음을 모았습니다. 부담 없는 가격이지만 모두 작가의 손이 직접 닿은 단 하나의 원본입니다. 복제 포스터와는 다른 첫 소장의 설렘을, 여기서 시작해 보세요.',
    descriptionEn:
      'Bringing home your first original is more nerve-wracking than it sounds — you wonder whether your eye is right, whether the price is fair. So we gathered small to medium works under ₩300,000 that fit easily on any wall. Approachable in price, yet every one is a single original touched by the artist’s own hand. Begin the quiet thrill of first ownership — nothing like a printed poster.',
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
      '오래 남는 선물을 고민한다면, 원작 한 점은 어떨까요. 10만~70만 원대의 소·중형 작품은 부담 없이 마음을 전하기에 알맞은 무게입니다. 받는 이의 공간과 취향을 떠올리며 고르는 동안, 선물은 이미 특별해집니다. 그리고 이 구매는 동료 예술인을 위한 상호부조 기금으로도 이어져, 한 번의 선물이 두 번의 마음이 됩니다.',
    descriptionEn:
      'Looking for a gift that lasts? Consider a single original. Small to medium works between ₩100,000 and ₩700,000 carry just the right weight to express your heart without strain. As you choose — picturing the recipient’s space and taste — the gift already becomes something special. And the purchase flows on to a mutual-aid fund for fellow artists, so one gift becomes two kindnesses.',
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
