'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import clsx from 'clsx';
import { trackEvent } from '@/lib/analytics/track';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
}

export default function LanguageSwitcher({ className, compact, inverse }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: 'ko' | 'en') {
    // 같은 locale 클릭은 무시 (사용자가 활성 상태 toggle 의도 없음).
    if (newLocale === locale) return;
    trackEvent('locale_switch', {
      from_locale: locale,
      to_locale: newLocale,
      page_path: pathname,
    });
    router.replace(pathname, { locale: newLocale });
  }

  const btnBase = compact
    ? 'px-1.5 py-0.5 inline-flex items-center justify-center rounded transition-colors text-xs'
    : 'px-2 py-1 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded transition-colors';

  return (
    <div className={clsx('flex items-center gap-1 text-sm', className)}>
      <button
        type="button"
        onClick={() => switchLocale('ko')}
        className={clsx(
          btnBase,
          locale === 'ko'
            ? `font-bold ${inverse ? 'text-primary-soft' : 'text-primary-strong'}`
            : 'text-current opacity-60 hover:opacity-100'
        )}
        aria-label={locale === 'en' ? 'Switch to Korean' : '한국어로 전환'}
        aria-current={locale === 'ko' ? 'true' : undefined}
      >
        KO
      </button>
      <span className="opacity-30" aria-hidden="true">
        |
      </span>
      <button
        type="button"
        onClick={() => switchLocale('en')}
        className={clsx(
          btnBase,
          locale === 'en'
            ? `font-bold ${inverse ? 'text-primary-soft' : 'text-primary-strong'}`
            : 'text-current opacity-60 hover:opacity-100'
        )}
        aria-label="Switch to English"
        aria-current={locale === 'en' ? 'true' : undefined}
      >
        EN
      </button>
    </div>
  );
}
