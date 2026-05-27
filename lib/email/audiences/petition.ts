import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';
import type { AudienceResolver, Recipient } from './types';

// 청원 캠페인 알림 채널 수신자 추출.
// 동의 근거: 서명 시 개인정보 동의문 "진행상황 안내(이메일)" (정보성, 광고 아님).
// is_masked=false && email IS NOT NULL인 서명자만 대상.
// 11,508명으로 가장 큰 채널 — batch dispatch 처리 불변.
export class PetitionAudienceResolver implements AudienceResolver {
  constructor(private readonly petitionSlug: string) {}

  async resolve(): Promise<Recipient[]> {
    if (!this.petitionSlug) return [];

    const supabase = createSupabaseAdminClient();

    const { data: signers, error } = await supabase
      .from('petition_signatures')
      .select('email, full_name')
      .eq('petition_slug', this.petitionSlug)
      .eq('is_masked', false)
      .not('email', 'is', null);

    if (error) {
      console.error('[petition-audience] query error:', error);
      throw new Error(`청원 서명자 목록 조회 실패: ${error.message}`);
    }

    const { data: suppressions, error: suppressionsError } = await supabase
      .from('email_suppressions')
      .select('email_hash')
      .in('channel', ['petition', 'all']);

    if (suppressionsError) {
      console.error('[petition-audience] suppressions query error:', suppressionsError);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    }

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { email_hash: string }) => s.email_hash)
    );

    const seen = new Set<string>();
    const recipients: Recipient[] = [];

    for (const s of signers ?? []) {
      const email = (s.email as string | null)?.toLowerCase().trim();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      const h = hashEmail(email);
      if (suppressedHashes.has(h)) continue;
      recipients.push({
        email,
        name: (s.full_name as string | null) ?? null,
        locale: 'ko',
        emailHash: h,
      });
    }

    return recipients;
  }
}
