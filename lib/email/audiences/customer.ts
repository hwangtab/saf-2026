import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';
import type { AudienceResolver, Recipient } from './types';

// 고객 마케팅 채널 수신자 추출.
// 동의 근거: marketing_consent=true(명시적 opt-in) OR 6개월 이내 거래고객(정통망법 §50 예외).
// (광고) 이메일이라 발송 시 subject prefix 추가, 전체 발송자 정보 푸터 필수.
export class CustomerAudienceResolver implements AudienceResolver {
  async resolve(): Promise<Recipient[]> {
    const supabase = createSupabaseAdminClient();
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1) 명시적 동의자 — DB-level filter
    const { data: consentUsers, error: consentError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('role', 'user')
      .eq('marketing_consent', true)
      .not('email', 'is', null);

    if (consentError) {
      console.error('[customer-audience] consent query error:', consentError);
      throw new Error(`동의자 목록 조회 실패: ${consentError.message}`);
    }

    // 2) 6개월 거래고객 — DB-level filter (정통망법 §50 예외)
    const { data: recentBuyers, error: buyerError } = await supabase
      .from('orders')
      .select('buyer_email, buyer_name')
      .in('status', ['paid', 'preparing', 'shipped', 'delivered'])
      .gte('created_at', sixMonthsAgo)
      .not('buyer_email', 'is', null);

    if (buyerError) {
      console.error('[customer-audience] buyer query error:', buyerError);
      throw new Error(`거래고객 목록 조회 실패: ${buyerError.message}`);
    }

    // 3) 수신거부 해시 — customer·all 채널만
    const { data: suppressions, error: suppressionsError } = await supabase
      .from('email_suppressions')
      .select('email_hash')
      .in('channel', ['customer', 'all']);

    if (suppressionsError) {
      console.error('[customer-audience] suppressions query error:', suppressionsError);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    }

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { email_hash: string }) => s.email_hash)
    );

    // 4) 합집합 · 정규화 · 중복 제거
    const seen = new Set<string>();
    const recipients: Recipient[] = [];

    const addIfValid = (email: string | null, name: string | null) => {
      if (!email) return;
      const normalized = email.toLowerCase().trim();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      const h = hashEmail(normalized);
      if (suppressedHashes.has(h)) return;
      recipients.push({ email: normalized, name, locale: 'ko', emailHash: h });
    };

    for (const u of consentUsers ?? []) {
      addIfValid(u.email as string | null, u.name as string | null);
    }
    for (const b of recentBuyers ?? []) {
      addIfValid(b.buyer_email as string | null, b.buyer_name as string | null);
    }

    return recipients;
  }
}
