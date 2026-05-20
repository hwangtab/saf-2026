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
  /** 추천 후보 글 풀 (이미 cluster-aware 정렬된 상태) */
  sameCategoryStories: readonly Story[];
  /** 영문 여부 */
  isEnglish: boolean;
  /** 최대 추천 글 수 (기본 3) */
  limit?: number;
}

/**
 * 같은 카테고리에서 현재 글 제외하고 최신 N편 골라 markdown inline 링크 섹션 생성.
 * 매칭 글이 없으면 빈 문자열 반환.
 */
export function generateInlineCrossLinks(opts: CrossLinkOptions): string {
  const { currentSlug, sameCategoryStories, isEnglish, limit = 3 } = opts;

  const candidates = sameCategoryStories.filter((s) => s.slug !== currentSlug).slice(0, limit);

  if (candidates.length === 0) return '';

  const heading = isEnglish ? `## Related reading` : `## 함께 읽으면 좋은 글`;

  const intro = isEnglish
    ? `If this piece helped, you may also enjoy these related articles:`
    : `이 글이 도움이 되셨다면, 함께 읽으면 좋은 글들을 소개합니다:`;

  const linkPathPrefix = isEnglish ? '/en/stories/' : '/stories/';

  const items = candidates
    .map((s) => {
      const title = isEnglish && s.title_en ? s.title_en : s.title;
      const excerpt = isEnglish && s.excerpt_en ? s.excerpt_en : s.excerpt;
      const excerptText = excerpt ? ` — ${excerpt}` : '';
      return `- [${title}](${linkPathPrefix}${s.slug})${excerptText}`;
    })
    .join('\n');

  return `\n\n${heading}\n\n${intro}\n\n${items}\n`;
}

/**
 * 본문 markdown에 cross-link 섹션을 의미적으로 적절한 위치에 삽입.
 *
 * 매거진 글 컨벤션상 본문은 다음 패턴으로 끝남:
 *   ...마지막 단락...
 *   [씨앗페에서 ... 보기 →](/...)   ← 마지막 outbound CTA
 *
 * cross-link 섹션을 단순 append하면 마지막 CTA 뒤에 와서 흐름이 어색.
 * 마지막 link 라인 또는 horizontal rule(`---`) 직전에 삽입하면 자연스럽게
 * "본문 → 다른 글 추천 → 마무리 CTA" 흐름이 형성됨.
 *
 * 삽입 위치 규칙:
 * - 본문 끝에서 가장 가까운 horizontal rule(`---`) 또는 단독 link 라인을 anchor로
 * - anchor 직전에 cross-link 섹션 삽입
 * - anchor 못 찾으면 단순 append (fallback)
 */
export function insertCrossLinksBeforeFinalCta(body: string, crossLinksMarkdown: string): string {
  if (!crossLinksMarkdown) return body;

  const lines = body.split('\n');
  // 본문 끝에서 거꾸로 훑으며 마지막 horizontal rule 또는 단독 link 라인 위치 찾기.
  let anchorIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === '---') {
      anchorIdx = i;
      break;
    }
    // 단독 markdown link 라인 패턴: `[...](...)` 만 있는 줄
    if (/^\[[^\]]+\]\([^)]+\)$/.test(line)) {
      anchorIdx = i;
      break;
    }
  }

  if (anchorIdx === -1) {
    // anchor 없으면 본문 끝에 append
    return body + crossLinksMarkdown;
  }

  // anchor 직전에 cross-link 섹션 삽입. 섹션 자체가 \n\n으로 시작·끝나니 추가 줄바꿈 불필요.
  const before = lines.slice(0, anchorIdx).join('\n');
  const after = lines.slice(anchorIdx).join('\n');
  return `${before}${crossLinksMarkdown}\n${after}`;
}
