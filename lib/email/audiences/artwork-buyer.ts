import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import type { AudienceResolver, Recipient } from './types';

// 특정 작품 구매자 채널. order_items.artwork_id 일치 + payable 상태.
// advertising=true면 정통망법 §50 거래고객 예외 유지를 위해 6개월 이내 구매로 제한.
// customer+all suppression 차감 (구매자는 고객 관계).
export class ArtworkBuyerAudienceResolver implements AudienceResolver {
  constructor(
    private readonly artworkId: string,
    private readonly opts: { advertising?: boolean } = {}
  ) {}

  async resolve(): Promise<Recipient[]> {
    const supabase = createSupabaseAdminClient();
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: buyers } = await fetchAllInBatches<{
      orders:
        | {
            buyer_email: string | null;
            buyer_name: string | null;
          }
        | Array<{
            buyer_email: string | null;
            buyer_name: string | null;
          }>
        | null;
    }>((from, to) => {
      let q = supabase
        .from('order_items')
        .select('orders!inner(buyer_email,buyer_name,created_at,status)')
        .eq('artwork_id', this.artworkId)
        .in('orders.status', ['paid', 'preparing', 'shipped', 'delivered'])
        .not('orders.buyer_email', 'is', null);
      if (this.opts.advertising) q = q.gte('orders.created_at', sixMonthsAgo);
      return q.range(from, to);
    }).catch((err) => {
      console.error('[artwork-buyer-audience] order_items query error:', err);
      throw new Error(`작품 구매자 조회 실패: ${err?.message ?? err}`);
    });

    const { data: suppressions } = await fetchAllInBatches<{ email_hash: string }>((from, to) =>
      supabase
        .from('email_suppressions')
        .select('email_hash')
        .in('channel', ['customer', 'all'])
        .range(from, to)
    ).catch((err) => {
      console.error('[artwork-buyer-audience] suppressions query error:', err);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    });

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { email_hash: string }) => s.email_hash)
    );
    const seen = new Set<string>();
    const recipients: Recipient[] = [];
    for (const b of buyers ?? []) {
      const order = Array.isArray(b.orders) ? (b.orders[0] ?? null) : b.orders;
      const email = order?.buyer_email ?? null;
      if (!email) continue;
      const normalized = email.toLowerCase().trim();
      if (!normalized) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      const h = hashEmail(normalized);
      if (suppressedHashes.has(h)) continue;
      recipients.push({
        email: normalized,
        name: order?.buyer_name ?? null,
        locale: 'ko',
        emailHash: h,
      });
    }
    return recipients;
  }
}
