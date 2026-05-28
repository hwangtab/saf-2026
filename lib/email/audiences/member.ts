import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import type { AudienceResolver, Recipient } from './types';

// 작가·출품자 업무 채널 수신자 추출.
// artists.contact_email (계정 없는 작가 다수) ∪ profiles role=exhibitor.
// 동의 불요 (업무·거래 관계). 수신거부 테이블(member + all)만 차감.
export class MemberAudienceResolver implements AudienceResolver {
  async resolve(): Promise<Recipient[]> {
    const supabase = createSupabaseAdminClient();

    const { data: artists } = await fetchAllInBatches<{
      contact_email: string | null;
      name_ko: string | null;
      name_en: string | null;
    }>((from, to) =>
      supabase
        .from('artists')
        .select('contact_email, name_ko, name_en')
        .order('created_at', { ascending: true })
        .range(from, to)
    ).catch((err) => {
      console.error('[member-audience] artists query error:', err);
      throw new Error(`작가 명단 조회 실패: ${err?.message ?? err}`);
    });

    // role='exhibitor'만 — 채널 정의("작가·출품자 업무")에 부합. 과거 role 누락으로 admin/user에게도 발송되던 버그 수정.
    const { data: exhibitors } = await fetchAllInBatches<{
      email: string | null;
      name: string | null;
    }>((from, to) =>
      supabase
        .from('profiles')
        .select('email, name')
        .eq('role', 'exhibitor')
        .not('email', 'is', null)
        .range(from, to)
    ).catch((err) => {
      console.error('[member-audience] exhibitors query error:', err);
      throw new Error(`출품자 명단 조회 실패: ${err?.message ?? err}`);
    });

    // 회원 채널·전체 차단만 차감. 과거 채널 필터 누락으로 customer/petition 차단도 적용되던 over-suppress 버그 수정.
    const { data: suppressions } = await fetchAllInBatches<{ email_hash: string }>((from, to) =>
      supabase
        .from('email_suppressions')
        .select('email_hash')
        .in('channel', ['member', 'all'])
        .range(from, to)
    ).catch((err) => {
      console.error('[member-audience] suppressions query error:', err);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    });

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { email_hash: string }) => s.email_hash)
    );

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

    for (const a of artists ?? []) {
      addIfValid(
        a.contact_email as string | null,
        (a.name_ko as string | null) ?? (a.name_en as string | null)
      );
    }
    for (const e of exhibitors ?? []) {
      addIfValid(e.email as string | null, e.name as string | null);
    }

    return recipients;
  }
}
