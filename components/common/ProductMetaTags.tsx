import { buildArtworkProductMeta } from '@/lib/schemas/artwork';

import type { Artwork } from '@/types';

interface ProductMetaTagsProps {
  artwork: Artwork;
  locale: 'ko' | 'en';
}

/**
 * product:* Open Graph 확장 태그를 RDFa `property=` 속성으로 <head>에 발행.
 *
 * Next.js Metadata API의 `other` 필드는 모든 항목을 `name=` 속성으로 렌더하는데,
 * product:* 확장은 RDFa `property=` 기준이라 Facebook Merchant Catalog·Pinterest
 * Product Rich Pin 파서가 name= 태그를 읽지 않는다 (2026-06-12 감사 라이브 실측).
 * React 19 head hoisting이 JSX <meta>를 <head>로 이동시키므로 페이지 본문에서
 * 렌더해도 된다. 가격 미정(문의) 작품은 아무것도 렌더하지 않는다.
 */
export default function ProductMetaTags({ artwork, locale }: ProductMetaTagsProps) {
  const entries = buildArtworkProductMeta(artwork, locale);
  if (entries.length === 0) return null;
  return (
    <>
      {entries.map((entry) => (
        <meta key={entry.property} property={entry.property} content={entry.content} />
      ))}
    </>
  );
}
