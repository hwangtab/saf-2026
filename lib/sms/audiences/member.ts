import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import { normalizeKoreanMobile } from '@/lib/sms/phone';
import { hashPhone } from '@/lib/sms/phone-hash';
import type { SmsAudienceResolver, SmsRecipient } from './types';

// 작가·출품자 업무 채널 SMS 수신자 추출 (email member 미러).
// artists.contact_phone ∪ profiles role=exhibitor.phone. 동의 불요(업무·거래 관계).
// sms_suppressions(member + all)만 차감. 정보성이므로 (광고) prefix·야간 차단 비대상.
// filter.subset: 'artist' | 'exhibitor' | 미지정(기본: 둘 다)
export class MemberSmsAudienceResolver implements SmsAudienceResolver {
  async resolve(filter?: Record<string, unknown>): Promise<SmsRecipient[]> {
    const supabase = createSupabaseAdminClient();
    const subset =
      filter?.subset === 'artist' || filter?.subset === 'exhibitor' ? filter.subset : 'all';

    let artists: Array<{
      contact_phone: string | null;
      name_ko: string | null;
      name_en: string | null;
    }> = [];
    if (subset !== 'exhibitor') {
      const { data: res } = await fetchAllInBatches<{
        contact_phone: string | null;
        name_ko: string | null;
        name_en: string | null;
      }>((from, to) =>
        supabase
          .from('artists')
          .select('contact_phone, name_ko, name_en')
          .order('created_at', { ascending: true })
          .range(from, to)
      ).catch((err) => {
        console.error('[member-sms-audience] artists query error:', err);
        throw new Error(`작가 명단 조회 실패: ${err?.message ?? err}`);
      });
      artists = res ?? [];
    }

    let exhibitors: Array<{ phone: string | null; name: string | null }> = [];
    if (subset !== 'artist') {
      const { data: res } = await fetchAllInBatches<{
        phone: string | null;
        name: string | null;
      }>((from, to) =>
        supabase
          .from('profiles')
          .select('phone, name')
          .eq('role', 'exhibitor')
          .not('phone', 'is', null)
          .range(from, to)
      ).catch((err) => {
        console.error('[member-sms-audience] exhibitors query error:', err);
        throw new Error(`출품자 명단 조회 실패: ${err?.message ?? err}`);
      });
      exhibitors = res ?? [];
    }

    const { data: suppressions } = await fetchAllInBatches<{ phone_hash: string }>((from, to) =>
      supabase
        .from('sms_suppressions')
        .select('phone_hash')
        .in('channel', ['member', 'all'])
        .range(from, to)
    ).catch((err) => {
      console.error('[member-sms-audience] suppressions query error:', err);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    });

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { phone_hash: string }) => s.phone_hash)
    );

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

    for (const a of artists) addIfValid(a.contact_phone, a.name_ko ?? a.name_en);
    for (const e of exhibitors) addIfValid(e.phone, e.name);

    return recipients;
  }
}
