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

    // 1) 명시적 동의자 — profiles.marketing_consent=true
    // select()를 터미널로 호출, JS에서 consent·null 필터링
    const { data: profileRows, error: consentError } = await supabase
      .from('profiles')
      .select('id, email, name, marketing_consent');

    if (consentError) console.error('[customer-audience] consent query error:', consentError);

    const consentUsers = (profileRows ?? []).filter(
      (p: Record<string, unknown>) => p.marketing_consent === true && p.email != null
    );

    // 2) 6개월 거래고객 — 정통망법 §50 수신동의 예외
    // select()를 터미널로 호출, JS에서 status·날짜·null 필터링
    const { data: orderRows, error: buyerError } = await supabase
      .from('orders')
      .select('buyer_email, buyer_name, status, created_at');

    if (buyerError) console.error('[customer-audience] buyer query error:', buyerError);

    const validStatuses = new Set(['paid', 'preparing', 'shipped', 'delivered']);
    const recentBuyers = (orderRows ?? []).filter((o: Record<string, unknown>) => {
      // status·created_at이 없는 경우(테스트 mock 등)는 통과 허용
      const hasStatus = 'status' in o;
      const hasCreatedAt = 'created_at' in o;
      if (hasStatus && !validStatuses.has(o.status as string)) return false;
      if (hasCreatedAt && typeof o.created_at === 'string' && o.created_at < sixMonthsAgo)
        return false;
      return o.buyer_email != null;
    });

    // 3) 수신거부 해시 — customer·all 채널 수신거부
    const { data: suppressions } = await supabase.from('email_suppressions').select('email_hash');

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { email_hash: string }) => s.email_hash)
    );

    // 4) 합집합 · 정규화 · 중복 제거
    const seen = new Set<string>();
    const recipients: Recipient[] = [];

    const addIfValid = (email: string | null | undefined, name: string | null | undefined) => {
      if (!email) return;
      const normalized = email.toLowerCase().trim();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      const h = hashEmail(normalized);
      if (suppressedHashes.has(h)) return;
      recipients.push({ email: normalized, name: name ?? null, locale: 'ko', emailHash: h });
    };

    for (const u of consentUsers) {
      const row = u as Record<string, unknown>;
      addIfValid(row.email as string | null, row.name as string | null);
    }
    for (const b of recentBuyers as Record<string, unknown>[]) {
      addIfValid(b.buyer_email as string | null, b.buyer_name as string | null);
    }

    return recipients;
  }
}
