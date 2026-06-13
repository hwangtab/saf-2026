import type { Metadata } from 'next';
import { OG_IMAGE } from '@/lib/constants';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';

// URL 확장자 → MIME 추론 (쿼리 스트링 제거). Supabase transform 등 포맷 변환이 개입할 수 있지만
// og:image:type은 힌트일 뿐이라 파서는 실제 바이트로 결정함 — 정확한 확장자 케이스만 매핑
function inferImageMime(url: string): string {
  // Supabase render 엔드포인트는 format 미지정 시 jpeg로 트랜스코드해 반환 —
  // 확장자가 .webp여도 실제 바이트는 jpeg (og:image:type 허위 힌트 방지, 2026-06-12 감사)
  if (url.includes('/storage/v1/render/image/')) return 'image/jpeg';
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export function createPageMetadata(
  title: string,
  description: string,
  path: string,
  imageUrl?: string,
  locale: 'ko' | 'en' = 'ko',
  imageAlt?: string
): Metadata {
  const url = buildLocaleUrl(path, locale);
  // title suffix용 brand — messages JSON `seo.siteTitle`, layout.tsx template과 일치
  const siteTitle = locale === 'en' ? 'SAF Online Gallery' : '씨앗페 온라인 갤러리';
  // OG `siteName`은 entity name (organization.ts WebSite name과 동일) — Facebook/Twitter UI에서 site name과 title이 동시 노출되므로 짧게 유지
  const siteName = locale === 'en' ? 'SAF Online' : '씨앗페 온라인';
  const ogLocale = locale === 'en' ? 'en_US' : 'ko_KR';
  const ogAlt = imageAlt ?? (locale === 'en' ? OG_IMAGE.altEn : OG_IMAGE.alt);
  const finalUrl = imageUrl || OG_IMAGE.url;
  const images = [
    {
      url: finalUrl,
      secureUrl: finalUrl.startsWith('https://') ? finalUrl : undefined,
      type: inferImageMime(finalUrl),
      // 호출처가 넘기는 작품 이미지는 임의 비율(정사각·세로형)이라 1200x630 고정 선언이
      // 허위 메타데이터였음 — 치수를 모르면 생략해 파서가 실측하게 한다 (2026-06-12 감사).
      // 기본 OG 이미지는 실제 치수를 아는 자산이므로 명시 유지.
      ...(imageUrl ? {} : { width: OG_IMAGE.width, height: OG_IMAGE.height }),
      alt: ogAlt,
    },
  ];

  // <title>: layout titleTemplate이 '%s'(suffix 없음)라 호출처가 브랜드 포함 여부를 결정한다.
  // OG/Twitter: template 미적용이므로 suffix를 수동 부착하되, 호출처 title에 이미 브랜드
  // suffix가 들어있으면(컬렉션 seoTitle, /artworks seoTitle 등) 이중 부착하지 않는다
  // (2026-06-12 감사: "… | 씨앗페 온라인 | 씨앗페 온라인 갤러리" 이중 suffix 회귀).
  // ⚠️ 판정은 "| 브랜드" suffix 패턴으로 — 단순 includes(브랜드명)는 본문에서 브랜드를
  // 언급만 한 제목('씨앗페 온라인 특별전 개막' 등)까지 suffix를 생략시킨다 (2026-06-12 리뷰).
  const hasBrandSuffix = title.includes(`| ${siteTitle}`) || title.includes(`| ${siteName}`);
  const ogTitle = hasBrandSuffix ? title : `${title} | ${siteTitle}`;
  return {
    title,
    description,
    alternates: createLocaleAlternates(path, locale),
    openGraph: {
      type: 'website',
      title: ogTitle,
      description,
      url,
      locale: ogLocale,
      siteName,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [{ url: images[0].url, alt: ogAlt }],
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
      type: 'website',
      title,
      description,
      url: localizedPageUrl || pageUrl,
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      siteName: locale === 'en' ? 'SAF Online' : '씨앗페 온라인',
      images: [
        {
          url: OG_IMAGE.url,
          secureUrl: OG_IMAGE.url,
          type: inferImageMime(OG_IMAGE.url),
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: ogAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: OG_IMAGE.url, alt: ogAlt }],
    },
  };
}
