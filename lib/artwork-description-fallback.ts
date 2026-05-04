/**
 * 작품 description이 비어 있을 때 메타데이터(작가·매체·크기·연도·에디션)를 기반으로
 * 1~2 문장의 자연어 작품 개요를 합성한다.
 *
 * 동기: GSC "크롤링됨 - 색인 안 됨" 1992건 진단 결과, 252개 작품의 description이
 * 비어있어 작품 상세 페이지가 thin content 시그널을 만들고 있었다. 작가 profile은
 * 페이지마다 동일하므로 작품 unique 텍스트가 필요했다. 이 헬퍼는 메타데이터를
 * 자연어로 풀어 작품마다 다른 narrative를 제공한다.
 *
 * 정책: 매체·연도·크기가 모두 없으면 합성하지 않는다 (의미 있는 unique 텍스트가
 * 안 나옴). description이 이미 있는 작품은 호출자가 이 함수를 부르지 않는다.
 */

import { getCategoryLabel } from '@/lib/artwork-category';

interface ArtworkInput {
  title: string;
  title_en?: string | null;
  artist: string;
  artist_en?: string | null;
  material?: string | null;
  size?: string | null;
  year?: string | null;
  edition?: string | null;
  category?: string | null;
}

const isMeaningful = (v: string | null | undefined): v is string =>
  !!v && v.trim().length > 0 && v !== '확인 중';

export function generateArtworkOverview(artwork: ArtworkInput, locale: 'ko' | 'en'): string | null {
  const title = (locale === 'en' && artwork.title_en) || artwork.title;
  const artist = (locale === 'en' && artwork.artist_en) || artwork.artist;
  const category = artwork.category ? getCategoryLabel(artwork.category, locale) : null;
  const material = isMeaningful(artwork.material) ? artwork.material : null;
  const size = isMeaningful(artwork.size) ? artwork.size : null;
  const year = isMeaningful(artwork.year) ? artwork.year : null;
  const edition = isMeaningful(artwork.edition) ? artwork.edition : null;

  if (!material && !year && !size) return null;

  if (locale === 'en') {
    let s1 = `〈${title}〉 is`;
    if (category) s1 += ` a ${category} work`;
    s1 += ` by ${artist}.`;

    const techParts: string[] = [];
    if (year && material) techParts.push(`Created in ${year} on ${material}`);
    else if (year) techParts.push(`Created in ${year}`);
    else if (material) techParts.push(`Made on ${material}`);
    if (size) techParts.push(`measuring ${size}`);
    if (edition) techParts.push(`from an edition (${edition})`);

    const s2 = techParts.length > 0 ? ' ' + techParts.join(', ') + '.' : '';
    const s3 = ' Available as an original Korean contemporary artwork at SAF Online.';

    return s1 + s2 + s3;
  }

  let s1 = `${artist}의`;
  if (category) s1 += ` ${category}`;
  s1 += ` 작품 〈${title}〉.`;

  const techParts: string[] = [];
  if (year && material) techParts.push(`${year}년 ${material} 작업`);
  else if (year) techParts.push(`${year}년 작`);
  else if (material) techParts.push(`${material} 작업`);
  if (size) techParts.push(`크기 ${size}`);
  if (edition) techParts.push(`에디션 ${edition}`);

  const s2 = techParts.length > 0 ? ' ' + techParts.join(', ') + '.' : '';
  const s3 = ' 씨앗페에 출품된 한국 현대미술 원본이다.';

  return s1 + s2 + s3;
}
