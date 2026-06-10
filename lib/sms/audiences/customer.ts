import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import { normalizeKoreanMobile } from '@/lib/sms/phone';
import { hashPhone } from '@/lib/sms/phone-hash';
import type { SmsAudienceResolver, SmsRecipient } from './types';

// 고객 마케팅 SMS 채널 수신자 추출 (email customer 미러).
// 동의 근거: marketing_consent=true(명시적 opt-in) OR 6개월 이내 거래고객(정통망법 §50 예외).
// 광고성 채널 — (광고) prefix·무료수신거부·야간 차단은 body/dispatch 레이어에서 적용.
export class CustomerSmsAudienceResolver implements SmsAudienceResolver {
  async resolve(): Promise<SmsRecipient[]> {
    const supabase = createSupabaseAdminClient();
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1) 명시적 동의자 — DB-level filter
    const { data: consentUsers } = await fetchAllInBatches<{
      id: string;
      phone: string | null;
      name: string | null;
    }>((from, to) =>
      supabase
        .from('profiles')
        .select('id, phone, name')
        .eq('role', 'user')
        .eq('marketing_consent', true)
        .not('phone', 'is', null)
        .range(from, to)
    ).catch((err) => {
      console.error('[customer-sms-audience] consent query error:', err);
      throw new Error(`동의자 목록 조회 실패: ${err?.message ?? err}`);
    });

    // 2) 6개월 거래고객 — DB-level filter (정통망법 §50 예외)
    const { data: recentBuyers } = await fetchAllInBatches<{
      buyer_phone: string | null;
      buyer_name: string | null;
    }>((from, to) =>
      supabase
        .from('orders')
        .select('buyer_phone, buyer_name')
        .in('status', ['paid', 'preparing', 'shipped', 'delivered'])
        .gte('created_at', sixMonthsAgo)
        .not('buyer_phone', 'is', null)
        .range(from, to)
    ).catch((err) => {
      console.error('[customer-sms-audience] buyer query error:', err);
      throw new Error(`거래고객 목록 조회 실패: ${err?.message ?? err}`);
    });

    // 3) 수신거부 해시 — customer·all 채널만
    const { data: suppressions } = await fetchAllInBatches<{ phone_hash: string }>((from, to) =>
      supabase
        .from('sms_suppressions')
        .select('phone_hash')
        .in('channel', ['customer', 'all'])
        .range(from, to)
    ).catch((err) => {
      console.error('[customer-sms-audience] suppressions query error:', err);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    });

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { phone_hash: string }) => s.phone_hash)
    );

    // 4) 합집합 · 정규화 · 중복 제거
    const seen = new Set<string>();
    const recipients: SmsRecipient[] = [];

    const addIfValid = (rawPhone: string | null, name: string | null) => {
      const normalized = normalizeKoreanMobile(rawPhone);
      if (!normalized) return;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      const h = hashPhone(normalized);
      if (suppressedHashes.has(h)) return;
      recipients.push({ phone: normalized, name, phoneHash: h });
    };

    for (const u of consentUsers ?? []) {
      addIfValid(u.phone as string | null, u.name as string | null);
    }
    for (const b of recentBuyers ?? []) {
      addIfValid(b.buyer_phone as string | null, b.buyer_name as string | null);
    }

    return recipients;
  }
}
