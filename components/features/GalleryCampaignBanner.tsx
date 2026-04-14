'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { EXTERNAL_LINKS } from '@/lib/constants';
import CTAButtonGroup from '@/components/common/CTAButtonGroup';

interface GalleryCampaignBannerProps {
  className?: string;
}

export default function GalleryCampaignBanner({ className }: GalleryCampaignBannerProps) {
  const t = useTranslations('galleryCampaign');

  return (
    <div className={cn('mx-auto max-w-2xl text-center', className)}>
      <h2 className="text-2xl font-bold text-gray-800 break-keep md:text-3xl">{t('heading')}</h2>
      <p className="mt-4 text-base text-gray-600 break-keep leading-relaxed">
        {t('descriptionLine1')}
        <br />
        {t('descriptionLine2')}
      </p>
      <CTAButtonGroup
        purchaseHref={EXTERNAL_LINKS.ONLINE_GALLERY}
        className="mt-8 justify-center"
      />
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-charcoal-muted">
        <Link
          href="/our-reality"
          className="underline underline-offset-4 hover:text-primary transition-colors"
        >
          {t('linkWhyMatters')}
        </Link>
        <span aria-hidden="true" className="text-gray-300">
          |
        </span>
        <Link
          href="/our-proof"
          className="underline underline-offset-4 hover:text-primary transition-colors"
        >
          {t('linkHowHelps')}
        </Link>
      </div>
    </div>
  );
}
