import type { Metadata } from 'next';
import { OG_IMAGE } from '@/lib/constants';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';

export function createPageMetadata(
  title: string,
  description: string,
  path: string,
  imageUrl?: string,
  locale: 'ko' | 'en' = 'ko'
): Metadata {
  const url = buildLocaleUrl(path, locale);
  const siteTitle = locale === 'en' ? 'SAF Online' : '씨앗페 온라인';
  const ogLocale = locale === 'en' ? 'en_US' : 'ko_KR';
  const ogAlt = locale === 'en' ? OG_IMAGE.altEn : OG_IMAGE.alt;
  const images = [
    {
      url: imageUrl || OG_IMAGE.url,
      width: imageUrl ? 1200 : OG_IMAGE.width,
      height: imageUrl ? 630 : OG_IMAGE.height,
      alt: ogAlt,
    },
  ];

  // title: layout template '%s | 씨앗페 2026' handles the suffix for <title> tag
  // OG/Twitter: no template applied, so we add the suffix manually
  return {
    title,
    description,
    alternates: createLocaleAlternates(path, locale),
    openGraph: {
      title: `${title} | ${siteTitle}`,
      description,
      url,
      locale: ogLocale,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteTitle}`,
      description,
      images: [images[0].url],
    },
  };
}

/**
 * 표준 페이지 메타데이터를 생성합니다.
 * 기존 페이지들의 generateMetadata 패턴과 완전히 호환됩니다.
 *
 * 사용 패턴:
 * ```ts
 * const title = `${copy.title} | ${tSeo('siteTitle')}`;
 * return createStandardPageMetadata(title, copy.description, PAGE_URL, PAGE_PATH);
 * ```
 *
 * @param title - 이미 suffix가 포함된 전체 제목 (예: "우리의 증명 | 씨앗페 2026")
 * @param description - 페이지 설명
 * @param pageUrl - 전체 URL (예: "https://www.saf2026.com/our-proof")
 * @param pagePath - 경로 (예: "/our-proof") — alternates 생성에 사용
 */
export function createStandardPageMetadata(
  title: string,
  description: string,
  pageUrl: string,
  pagePath: string,
  locale: 'ko' | 'en' = 'ko'
): Metadata {
  const localizedPageUrl = buildLocaleUrl(pagePath, locale);

  const ogAlt = locale === 'en' ? OG_IMAGE.altEn : OG_IMAGE.alt;

  return {
    title: { absolute: title },
    description,
    alternates: createLocaleAlternates(pagePath, locale),
    openGraph: {
      title,
      description,
      url: localizedPageUrl || pageUrl,
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      siteName: locale === 'en' ? 'SAF Online' : '씨앗페 온라인',
      images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
