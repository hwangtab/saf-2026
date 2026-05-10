/**
 * 매거진 글 본문 끝에 같은 카테고리 다른 글로의 inline markdown link 섹션을 자동 생성.
 *
 * 매거진 페이지 UI에 이미 "관련 글" 카드 섹션이 있지만, **본문 내 inline 텍스트 link**는
 * Google·AI 모델 관점에서 더 강한 신호로 인식됨 — UI 카드는 navigation chrome에 가깝고,
 * 본문 link는 작가의 의도된 cross-reference로 인식. 동일 콘텐츠를 두 형태로 노출해
 * 양쪽 시그널 모두 활용.
 *
 * 컨벤션:
 * - 카테고리별 라벨이 다름 (구매 가이드 / 미술 산책 / 작가 이야기)
 * - 같은 카테고리 글 2~3편 추천
 * - 글 타이틀 그대로 anchor text — Google이 anchor → target page 키워드 시그널로 사용
 */

import type { Story } from '@/types';

interface CrossLinkOptions {
  /** 추천에서 제외할 현재 글 slug */
  currentSlug: string;
  /** 같은 카테고리 글 풀 */
  sameCategoryStories: readonly Story[];
  /** 영문 여부 */
  isEnglish: boolean;
  /** 같은 카테고리 한글 라벨 (예: '컬렉팅 시작하기') */
  categoryLabelKo: string;
  /** 같은 카테고리 영문 라벨 */
  categoryLabelEn: string;
  /** 최대 추천 글 수 (기본 3) */
  limit?: number;
}

/**
 * 같은 카테고리에서 현재 글 제외하고 최신 N편 골라 markdown inline 링크 섹션 생성.
 * 매칭 글이 없으면 빈 문자열 반환.
 */
export function generateInlineCrossLinks(opts: CrossLinkOptions): string {
  const {
    currentSlug,
    sameCategoryStories,
    isEnglish,
    categoryLabelKo,
    categoryLabelEn,
    limit = 3,
  } = opts;

  const candidates = sameCategoryStories.filter((s) => s.slug !== currentSlug).slice(0, limit);

  if (candidates.length === 0) return '';

  const heading = isEnglish ? `## More in ${categoryLabelEn}` : `## ${categoryLabelKo} 다음 글`;

  const intro = isEnglish
    ? `If this piece helped, the SAF Magazine has more in the same series:`
    : `이 글이 도움이 되셨다면, 같은 시리즈의 다음 글들도 함께 읽어보세요:`;

  const linkPathPrefix = isEnglish ? '/en/stories/' : '/stories/';

  const items = candidates
    .map((s) => {
      const title = isEnglish && s.title_en ? s.title_en : s.title;
      const excerpt = isEnglish && s.excerpt_en ? s.excerpt_en : s.excerpt;
      const excerptText = excerpt ? ` — ${excerpt}` : '';
      return `- [${title}](${linkPathPrefix}${s.slug})${excerptText}`;
    })
    .join('\n');

  // 본문 끝 직전(마무리 단락 전) append되도록 빈 줄 + 섹션 + 빈 줄로 감쌈.
  return `\n\n${heading}\n\n${intro}\n\n${items}\n`;
}
