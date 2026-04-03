'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import clsx from 'clsx';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export default function LanguageSwitcher({ className, compact }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: 'ko' | 'en') {
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
          locale === 'ko' ? 'font-bold text-primary' : 'text-current opacity-60 hover:opacity-100'
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
          locale === 'en' ? 'font-bold text-primary' : 'text-current opacity-60 hover:opacity-100'
        )}
        aria-label="Switch to English"
        aria-current={locale === 'en' ? 'true' : undefined}
      >
        EN
      </button>
    </div>
  );
}
