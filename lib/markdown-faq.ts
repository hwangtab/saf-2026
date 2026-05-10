/**
 * 매거진 마크다운 본문에서 FAQ 섹션 추출.
 *
 * 매거진 글의 컨벤션:
 *
 *   ## 자주 묻는 질문      (KO) 또는 ## Frequently asked questions   (EN)
 *
 *   **Q. 질문 텍스트?**
 *   A. 답변 텍스트.
 *
 *   **Q. 다음 질문?**
 *   A. 다음 답변.
 *
 *   ---
 *
 * 이 패턴을 검출해 schema.org FAQPage용 Q/A 페어로 추출. Google AI Overview·featured snippet
 * 진입 우선순위에 영향. 매거진 톤 유지하면서 자동으로 구조화 데이터 강화.
 *
 * 추출 실패 시 빈 배열 반환 — 모든 매거진 글이 FAQ 섹션을 갖지는 않으므로 silent failure가 정답.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

/** FAQ 섹션 헤딩 패턴 (KO·EN 모두) */
const FAQ_HEADING_RE = /^##\s+(자주\s*묻는\s*질문|Frequently\s+asked\s+questions)\s*$/im;

/** Q/A 페어 추출용 패턴: **Q. ...** 다음 줄 A. ... */
const QA_RE = /\*\*Q\.\s*([\s\S]*?)\*\*\s*\n+A\.\s*([\s\S]*?)(?=\n\s*\*\*Q\.|$)/g;

/**
 * 마크다운 인라인 포맷팅 제거 (FAQPage schema는 plain text 권장).
 * 링크 [text](url) → text, 강조 **text** → text, 인라인 코드 `text` → text.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 본문 마크다운에서 FAQ Q/A 페어 추출.
 * - FAQ 섹션 헤딩이 없으면 빈 배열
 * - 섹션이 있어도 Q/A 페어가 없으면 빈 배열
 * - 다음 ## 헤딩 또는 --- horizontal rule 또는 본문 끝까지를 FAQ 섹션으로 간주
 */
export function extractFaqFromBody(body: string | null | undefined): FaqItem[] {
  if (!body) return [];
  const headingMatch = body.match(FAQ_HEADING_RE);
  if (!headingMatch || headingMatch.index === undefined) return [];

  // FAQ 섹션 시작 = heading 끝 위치, 종료 = 다음 ## 헤딩 또는 --- 또는 본문 끝
  const sectionStart = headingMatch.index + headingMatch[0].length;
  const remainder = body.slice(sectionStart);
  const sectionEnd = remainder.match(/^(##\s+|---\s*$)/m);
  const section =
    sectionEnd && sectionEnd.index !== undefined ? remainder.slice(0, sectionEnd.index) : remainder;

  const faqs: FaqItem[] = [];
  for (const match of section.matchAll(QA_RE)) {
    const question = stripMarkdown(match[1]);
    const answer = stripMarkdown(match[2]);
    if (question && answer) {
      faqs.push({ question, answer });
    }
  }
  return faqs;
}

/**
 * FAQ 페어로 schema.org FAQPage JSON-LD 생성.
 * 빈 배열 입력 시 null 반환 — caller가 schema 추가 자체를 skip.
 */
export function generateFaqPageSchema(
  faqs: FaqItem[],
  options: { url: string; locale: string }
): Record<string, unknown> | null {
  if (faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${options.url}#faq`,
    inLanguage: options.locale === 'en' ? 'en-US' : 'ko-KR',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
