import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';
import type { AudienceResolver, Recipient } from './types';

// 작가·출품자 업무 채널 수신자 추출.
// artists.contact_email (계정 없는 작가 다수) ∪ profiles role=exhibitor.
// 동의 불요 (업무·거래 관계). 수신거부 테이블(member + all)만 차감.
export class MemberAudienceResolver implements AudienceResolver {
  async resolve(): Promise<Recipient[]> {
    const supabase = createSupabaseAdminClient();

    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('contact_email, name_ko, name_en');

    if (artistsError) {
      console.error('[member-audience] artists query error:', artistsError);
    }

    const { data: exhibitors, error: exhibitorsError } = await supabase
      .from('profiles')
      .select('email, name');

    if (exhibitorsError) {
      console.error('[member-audience] exhibitors query error:', exhibitorsError);
    }

    const { data: suppressions } = await supabase.from('email_suppressions').select('email_hash');

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
