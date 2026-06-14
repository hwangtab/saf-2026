/**
 * getOrderNotificationInfo 단위 테스트
 *
 * order_items 기반 다품목 주문 대응 및 기존 artworks join fallback 동작 검증.
 *
 * @jest-environment node
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { getOrderNotificationInfo } from '@/lib/utils/get-order-notification-info';

// Supabase 체이너 mock 헬퍼
// 체인: from(table).select(cols).limit(1) → query
//       query.eq(col, val) → filtered
//       filtered.maybeSingle() → { data, error }
function makeSupabaseMock(resolvedData: unknown): SupabaseClient {
  const maybeSingle = jest.fn().mockResolvedValue({ data: resolvedData, error: null });
  // eq는 자기 자신을 반환하는 체이너 + maybeSingle 종결자
  let eq: jest.Mock;
  const eqResult = () => ({
    get eq() {
      return eq;
    },
    maybeSingle,
  });
  eq = jest.fn().mockImplementation(eqResult);
  // limit(1) 이후 체인: { eq, maybeSingle }
  const afterLimit = {
    get eq() {
      return eq;
    },
    maybeSingle,
  };
  const limit = jest.fn().mockReturnValue(afterLimit);
  // select() 이후: { eq, limit } — eq는 여기서도 필요 (order_no 분기)
  const afterSelect = {
    get eq() {
      return eq;
    },
    limit,
  };
  const select = jest.fn().mockReturnValue(afterSelect);
  const from = jest.fn().mockReturnValue({ select });

  return { from } as unknown as SupabaseClient;
}

// 공통 주문 필드 (모든 케이스에서 공유)
const baseOrder = {
  id: 'order-uuid',
  order_no: 'SAF-20260614-0001',
  buyer_name: '홍길동',
  buyer_email: 'buyer@example.com',
  buyer_phone: '010-1234-5678',
  shipping_name: '수령인',
  shipping_phone: '010-9999-0000',
  shipping_address: '서울시 종로구 인사동길 1',
  shipping_address_detail: '101호',
  shipping_memo: '경비실 맡겨주세요',
  item_amount: 3000000,
  shipping_amount: 3000,
  total_amount: 3003000,
  metadata: { locale: 'ko' },
};

describe('getOrderNotificationInfo', () => {
  // ─── 단건 (order_items 1건, ko) ───
  it('단건 — order_items 1건이면 artworkTitle은 작품명 그대로 ("외" 없음)', async () => {
    const data = {
      ...baseOrder,
      artworks: null,
      order_items: [
        {
          artworks: {
            title: '봄의 정원',
            artists: { name_ko: '김봄' },
          },
        },
      ],
    };

    const supabase = makeSupabaseMock(data);
    const result = await getOrderNotificationInfo(supabase, { id: 'order-uuid' });

    expect(result).not.toBeNull();
    expect(result!.artworkTitle).toBe('봄의 정원');
    expect(result!.artistName).toBe('김봄');
    expect(result!.artworkTitle).not.toMatch(/외/);
    expect(result!.locale).toBe('ko');
  });

  // ─── 다품목 (order_items 3건, ko) ───
  it('다품목 3건 ko — artworkTitle이 "${대표작품} 외 2건" 형태', async () => {
    const data = {
      ...baseOrder,
      artworks: null,
      order_items: [
        { artworks: { title: '봄의 정원', artists: { name_ko: '김봄' } } },
        { artworks: { title: '여름 바람', artists: { name_ko: '이여름' } } },
        { artworks: { title: '가을 노래', artists: { name_ko: '박가을' } } },
      ],
    };

    const supabase = makeSupabaseMock(data);
    const result = await getOrderNotificationInfo(supabase, { id: 'order-uuid' });

    expect(result).not.toBeNull();
    expect(result!.artworkTitle).toBe('봄의 정원 외 2건');
    expect(result!.artistName).toBe('김봄'); // 대표 작품 작가
  });

  // ─── 다품목 (order_items 2건, en) ───
  it('다품목 2건 en — artworkTitle이 "${대표작품} and 1 more" 형태', async () => {
    const data = {
      ...baseOrder,
      metadata: { locale: 'en' },
      artworks: null,
      order_items: [
        { artworks: { title: 'Spring Garden', artists: { name_ko: 'Kim Bom' } } },
        { artworks: { title: 'Summer Breeze', artists: { name_ko: 'Lee Yeo' } } },
      ],
    };

    const supabase = makeSupabaseMock(data);
    const result = await getOrderNotificationInfo(supabase, { id: 'order-uuid' });

    expect(result).not.toBeNull();
    expect(result!.artworkTitle).toBe('Spring Garden and 1 more');
    expect(result!.artistName).toBe('Kim Bom');
    expect(result!.locale).toBe('en');
  });

  // ─── fallback: order_items 없고 artworks join만 있음 ───
  it('order_items 비어있을 때 — artworks join 결과로 fallback', async () => {
    const data = {
      ...baseOrder,
      artworks: { title: '고독한 풍경', artists: { name_ko: '최고독' } },
      order_items: [], // 빈 배열
    };

    const supabase = makeSupabaseMock(data);
    const result = await getOrderNotificationInfo(supabase, { id: 'order-uuid' });

    expect(result).not.toBeNull();
    expect(result!.artworkTitle).toBe('고독한 풍경');
    expect(result!.artistName).toBe('최고독');
  });

  // ─── fallback: order_items null이고 artworks join만 있음 ───
  it('order_items null일 때 — artworks join 결과로 fallback', async () => {
    const data = {
      ...baseOrder,
      artworks: { title: '빛의 강', artists: { name_ko: '정빛' } },
      order_items: null,
    };

    const supabase = makeSupabaseMock(data);
    const result = await getOrderNotificationInfo(supabase, { id: 'order-uuid' });

    expect(result).not.toBeNull();
    expect(result!.artworkTitle).toBe('빛의 강');
    expect(result!.artistName).toBe('정빛');
  });

  // ─── DB 에러 시 null 반환 ───
  it('DB 에러 시 null 반환', async () => {
    const supabase = makeSupabaseMock(null);
    // maybeSingle이 에러를 반환하도록 from mock 교체
    const maybeSingleErr = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'db error' } });
    let eq: jest.Mock;
    const eqResult = () => ({
      get eq() {
        return eq;
      },
      maybeSingle: maybeSingleErr,
    });
    eq = jest.fn().mockImplementation(eqResult);
    const afterLimit = {
      get eq() {
        return eq;
      },
      maybeSingle: maybeSingleErr,
    };
    const limit = jest.fn().mockReturnValue(afterLimit);
    const afterSelect = {
      get eq() {
        return eq;
      },
      limit,
    };
    const select = jest.fn().mockReturnValue(afterSelect);
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getOrderNotificationInfo(supabase, { orderNo: 'SAF-99999' });
    expect(result).toBeNull();
  });

  // ─── orderNo 기반 조회 ───
  it('orderNo 기반 조회도 정상 동작', async () => {
    const data = {
      ...baseOrder,
      artworks: null,
      order_items: [{ artworks: { title: '겨울 달빛', artists: { name_ko: '윤겨울' } } }],
    };

    const supabase = makeSupabaseMock(data);
    const result = await getOrderNotificationInfo(supabase, { orderNo: 'SAF-20260614-0001' });

    expect(result).not.toBeNull();
    expect(result!.orderNo).toBe('SAF-20260614-0001');
    expect(result!.artworkTitle).toBe('겨울 달빛');
    expect(result!.artistName).toBe('윤겨울');
  });

  // ─── 배송 주소 합산 ───
  it('shipping_address + shipping_address_detail 합산', async () => {
    const data = {
      ...baseOrder,
      artworks: null,
      order_items: [{ artworks: { title: '작품', artists: { name_ko: '작가' } } }],
    };

    const supabase = makeSupabaseMock(data);
    const result = await getOrderNotificationInfo(supabase, { id: 'order-uuid' });

    expect(result!.shippingAddress).toBe('서울시 종로구 인사동길 1 101호');
  });
});
