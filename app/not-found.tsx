import { getLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { CONTACT } from '@/lib/constants';
import LinkButton from '@/components/ui/LinkButton';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale().catch(() => 'ko');
  return {
    title: locale === 'en' ? 'Page Not Found' : '페이지를 찾을 수 없습니다',
    robots: { index: false, follow: true },
  };
}

const COPY = {
  ko: {
    title: '페이지를 찾을 수 없습니다',
    description:
      '요청하신 페이지가 존재하지 않거나 이동되었습니다.\n주소를 다시 확인하시거나 홈으로 이동해 주세요.',
    goHome: '홈으로 이동',
    browseArtworks: '작품 둘러보기',
    helpText: '도움이 필요하신가요?',
  },
  en: {
    title: 'Page Not Found',
    description:
      'The page you requested does not exist or has been moved.\nPlease check the URL or return home.',
    goHome: 'Go Home',
    browseArtworks: 'Browse Artworks',
    helpText: 'Need help?',
  },
} as const;

export default async function NotFound() {
  const locale = await getLocale().catch(() => 'ko');
  const copy = locale === 'en' ? COPY.en : COPY.ko;

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-soft pt-20">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6" aria-hidden="true">
          🔍
        </div>
        <h1 className="text-2xl font-bold text-charcoal mb-4">{copy.title}</h1>
        <p className="text-charcoal-muted mb-8 leading-relaxed whitespace-pre-line">
          {copy.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <LinkButton
            href={locale === 'en' ? '/en' : '/'}
            variant="white"
            size="sm"
            className="px-6 py-3 shadow-sm min-h-[48px]"
          >
            {copy.goHome}
          </LinkButton>
          <LinkButton
            href={locale === 'en' ? '/en/artworks' : '/artworks'}
            variant="primary"
            size="sm"
            className="inline-grid grid-cols-[1.25rem_auto_1.25rem] gap-2 px-6 py-3 shadow-sm hover:shadow-md min-h-[48px]"
          >
            <span aria-hidden="true">🎨</span>
            <span>{copy.browseArtworks}</span>
            <span aria-hidden="true" className="invisible">
              🎨
            </span>
          </LinkButton>
        </div>

        <div className="pt-8 border-t border-gray-200/60">
          <p className="text-sm text-gray-500 mb-2">{copy.helpText}</p>
          <a href={`mailto:${CONTACT.EMAIL}`} className="text-primary font-medium hover:underline">
            {CONTACT.EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}
