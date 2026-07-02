'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';

export type AdminSearchResult = {
  type: 'order' | 'artwork' | 'artist';
  typeLabel: string;
  label: string;
  sublabel?: string;
  href: string;
};

const PER_TYPE_LIMIT = 8;

function relName(rel: unknown): string | null {
  const obj = Array.isArray(rel) ? rel[0] : rel;
  const value = (obj as { name_ko?: unknown } | null | undefined)?.name_ko;
  return typeof value === 'string' && value ? value : null;
}

/**
 * 관리자 전역 검색(⌘K) — 주문·작품·작가를 이름/번호로 찾아 상세로 바로 이동.
 * 연락처 검색(searchContacts, 이메일 수신자용)과 달리 네비게이션 지향 결과를 반환.
 */
export async function searchAdmin(query: string): Promise<AdminSearchResult[]> {
  await requireAdmin();
  const q = query.trim();
  if (q.length < 2) return [];

  // PostgREST .or() 필터 인젝션 방지 — 구문 경계 문자 제거 후 LIKE 와일드카드 이스케이프.
  const sanitized = q
    .replace(/[,()*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!sanitized) return [];

  const supabase = await requireAdminClient();
  const like = `%${sanitized.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const [ordersRes, artworksRes, artistsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_no, buyer_name, total_amount, status')
      .or(`order_no.ilike.${like},buyer_name.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(PER_TYPE_LIMIT),
    supabase
      .from('artworks')
      .select('id, title, artists(name_ko)')
      .ilike('title', like)
      .limit(PER_TYPE_LIMIT),
    supabase
      .from('artists')
      .select('id, name_ko, name_en')
      .or(`name_ko.ilike.${like},name_en.ilike.${like}`)
      .limit(PER_TYPE_LIMIT),
  ]);

  const results: AdminSearchResult[] = [];

  for (const o of ordersRes.data ?? []) {
    const amount =
      typeof o.total_amount === 'number' ? `₩${o.total_amount.toLocaleString('ko-KR')}` : '';
    results.push({
      type: 'order',
      typeLabel: '주문',
      label: o.order_no as string,
      sublabel: [o.buyer_name as string | null, amount].filter(Boolean).join(' · ') || undefined,
      href: `/admin/orders/${o.id}`,
    });
  }

  for (const a of artworksRes.data ?? []) {
    results.push({
      type: 'artwork',
      typeLabel: '작품',
      label: (a.title as string) ?? '(제목 없음)',
      sublabel: relName(a.artists) ?? undefined,
      href: `/admin/artworks/${a.id}`,
    });
  }

  for (const a of artistsRes.data ?? []) {
    const name = (a.name_ko as string) || (a.name_en as string) || '(이름 없음)';
    results.push({
      type: 'artist',
      typeLabel: '작가',
      label: name,
      sublabel: (a.name_en as string | null) ?? undefined,
      href: `/admin/artists/${a.id}`,
    });
  }

  return results;
}
