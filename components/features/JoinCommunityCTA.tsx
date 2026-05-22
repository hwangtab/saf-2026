import { getTranslations } from 'next-intl/server';
import { ExternalLink } from 'lucide-react';
import LinkButton from '@/components/ui/LinkButton';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { EXTERNAL_LINKS } from '@/lib/constants';

/**
 * 회원 가입 CTA 영역 [L] — 매뉴얼 6.4 [L] 회원 가입 CTA.
 *
 * 메인 페이지 EmergingArtists[G] 직후, FAQ 직전. 페르소나 B 컬렉터의 1순위는 작품 구매,
 * 회원 가입은 더 깊이 함께하는 보조 동선. 매뉴얼 6.4 [C] 톤 원칙(미술 플랫폼 우선, 상호부조 보조)에
 * 부합하도록 절제된 톤. 외부 폼(JOIN_MEMBER)으로 deep-link.
 *
 * Impact Stats 제거(PR #42) 후 메인에서 가입 동선이 Footer만 남았던 회귀를 보강.
 */
export default async function JoinCommunityCTA({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.joinCta' });
  const tA11y = await getTranslations({ locale, namespace: 'a11y' });

  return (
    <Section variant="canvas-soft" className="py-16 md:py-20">
      <div className="container-max">
        <div className="max-w-2xl mx-auto text-center">
          <SectionTitle className="mb-4">{t('title')}</SectionTitle>
          <p className="text-body-large text-charcoal-muted text-balance mb-8">{t('subtitle')}</p>
          <LinkButton
            href={EXTERNAL_LINKS.JOIN_MEMBER}
            external
            variant="primary"
            size="lg"
            className="min-w-[180px] justify-center"
            trailingIcon={<ExternalLink className="w-4 h-4" aria-hidden="true" />}
          >
            {t('cta')}
            <span className="sr-only">{tA11y('opensInNewTab')}</span>
          </LinkButton>
        </div>
      </div>
    </Section>
  );
}
