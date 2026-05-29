/**
 * Google Images SEO용 작품 alt text 빌더 — 4토큰 상한.
 *
 * 배경: artwork detail은 GSC 8,883 노출/1.8% CTR로 최대 개선 레버.
 *   기존 alt 패턴은 호출처별 상이(2~3토큰). Google Images는 alt + 주변 텍스트 + filename 3요소로
 *   ranking — 주변 컨텍스트는 이미 풍부(price, material, year, size, edition)하니 alt는 4 lexical
 *   token으로 정렬해 일관 노출.
 *
 * 형식:
 *   KO: `${title}, ${material} ${year} - ${artist}`
 *   EN: `${title}, ${material} ${year} by ${artist}`
 *
 * 가드레일:
 * - keyword stuffing 회피: category·size·edition은 schema/주변 텍스트로 위임
 * - EN locale에서 KO material/year는 제외 (raw KO 데이터 보호)
 * - `확인 중` / `Pending` material 제외
 * - schema imageObject.alternateName(year, material)과 형식 정렬
 */

import { containsHangul } from '@/lib/search-utils';

export interface ArtworkAltInput {
  title: string;
  artist: string;
  material?: string | null;
  year?: string | number | null;
}

export function buildArtworkAlt(input: ArtworkAltInput, locale: 'ko' | 'en' = 'ko'): string {
  const { title, artist } = input;
  const rawMaterial = (input.material ?? '').toString().trim();
  const rawYear = (input.year ?? '').toString().trim();

  const isEn = locale === 'en';

  const hasMaterial =
    rawMaterial &&
    rawMaterial !== '확인 중' &&
    rawMaterial !== 'Pending' &&
    !(isEn && containsHangul(rawMaterial));

  const hasYear = rawYear && !(isEn && containsHangul(rawYear));

  const detailParts: string[] = [];
  if (hasMaterial) detailParts.push(rawMaterial);
  if (hasYear) detailParts.push(rawYear);

  const detailSuffix = detailParts.length > 0 ? `, ${detailParts.join(' ')}` : '';
  const sep = isEn ? ' by ' : ' - ';
  return `${title}${detailSuffix}${sep}${artist}`;
}
