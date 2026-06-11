import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import { normalizeKoreanMobile } from '@/lib/sms/phone';
import { hashPhone } from '@/lib/sms/phone-hash';
import type { SmsAudienceResolver, SmsRecipient } from './types';

// 청원 캠페인 진행상황 SMS 통지 채널 수신자 추출 (email petition.ts 미러).
// 동의 근거: 서명 시 개인정보 동의문 "진행상황 안내(SMS)" (정보성, 광고 아님).
// is_masked=false && phone IS NOT NULL인 서명자만 대상.
// 11,599명 규모(2026-06 기준) — fetchAllInBatches 필수, 1000행 truncation 방지.
export class PetitionSmsAudienceResolver implements SmsAudienceResolver {
  constructor(private readonly petitionSlug: string) {}

  async resolve(): Promise<SmsRecipient[]> {
    if (!this.petitionSlug) return [];

    const supabase = createSupabaseAdminClient();

    // 11,599명 규모(2026-06 기준) — idx_petition_signatures_slug_created 인덱스 사용.
    const { data: signers } = await fetchAllInBatches<{
      phone: string | null;
      full_name: string | null;
    }>((from, to) =>
      supabase
        .from('petition_signatures')
        .select('phone, full_name')
        .eq('petition_slug', this.petitionSlug)
        .eq('is_masked', false)
        .not('phone', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, to)
    ).catch((err) => {
      console.error('[petition-sms-audience] query error:', err);
      throw new Error(`청원 서명자 목록 조회 실패: ${err?.message ?? err}`);
    });

    const { data: suppressions } = await fetchAllInBatches<{ phone_hash: string }>((from, to) =>
      supabase
        .from('sms_suppressions')
        .select('phone_hash')
        .in('channel', ['petition', 'all'])
        .range(from, to)
    ).catch((err) => {
      console.error('[petition-sms-audience] suppressions query error:', err);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    });

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { phone_hash: string }) => s.phone_hash)
    );

    const seen = new Set<string>();
    const recipients: SmsRecipient[] = [];

    for (const s of signers ?? []) {
      const normalized = normalizeKoreanMobile(s.phone as string | null);
      if (!normalized) continue; // 비-010 번호 제외
      if (seen.has(normalized)) continue; // 중복 제거
      seen.add(normalized);
      const h = hashPhone(normalized);
      if (suppressedHashes.has(h)) continue;
      recipients.push({
        phone: normalized,
        name: (s.full_name as string | null) ?? null,
        phoneHash: h,
      });
    }

    return recipients;
  }
}
