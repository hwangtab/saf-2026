import { artworkPublicUrl } from './image-url';

export interface CaptionArtwork {
  id: string;
  title: string | null;
  artistName: string | null;
  medium?: string | null;
  size?: string | null;
  price?: string | null;
}

const DEFAULT_HASHTAGS = [
  '#씨앗페',
  '#SAF2026',
  '#씨앗페2026',
  '#한국미술',
  '#예술인연대',
  '#그림스타그램',
] as const;

// 씨앗페 캠페인 구조(CLAUDE.md)를 준수한 연대 프레이밍 한 줄.
// 출품 작가를 금융 피해 당사자로 그리지 않고, 판매 수익의 상호부조 의미만 전달.
const CAMPAIGN_LINE =
  '작품 판매 수익은 금융 차별을 겪는 동료 예술인을 위한 상호부조 기금이 됩니다.';

function clean(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/**
 * 작품 정보로 소셜 게시 캡션 **초안**을 생성. 관리자가 게시 전 편집한다.
 * 누락 필드는 자연스럽게 생략한다.
 */
export function buildCaptionDraft(artwork: CaptionArtwork): string {
  const lines: string[] = [];

  const title = clean(artwork.title) || '무제';
  lines.push(title);

  const artist = clean(artwork.artistName);
  if (artist) lines.push(`${artist} 작가`);

  // 매체 · 크기 (있는 것만)
  const specParts = [clean(artwork.medium), clean(artwork.size)].filter(Boolean);
  const price = clean(artwork.price);
  if (specParts.length > 0 || price) {
    lines.push('');
    if (specParts.length > 0) lines.push(specParts.join(' · '));
    if (price) lines.push(price);
  }

  lines.push('');
  lines.push(CAMPAIGN_LINE);
  lines.push(`작품 보기 → ${artworkPublicUrl(artwork.id)}`);

  lines.push('');
  lines.push(DEFAULT_HASHTAGS.join(' '));

  return lines.join('\n');
}
