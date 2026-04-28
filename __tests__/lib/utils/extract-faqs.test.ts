import { describe, expect, it } from '@jest/globals';
import { extractFaqsFromBody } from '@/lib/utils/extract-faqs';

describe('extractFaqsFromBody', () => {
  it('returns [] for null/undefined/empty', () => {
    expect(extractFaqsFromBody(null)).toEqual([]);
    expect(extractFaqsFromBody(undefined)).toEqual([]);
    expect(extractFaqsFromBody('')).toEqual([]);
  });

  it('returns [] when body has no FAQ block', () => {
    expect(extractFaqsFromBody('# Title\n\nJust prose, no questions.')).toEqual([]);
  });

  it('extracts a simple Q. / A. block', () => {
    const body = `## 자주 묻는 질문

**Q. 첫 질문?**
A. 첫 답변.

**Q. 둘째 질문?**
A. 둘째 답변.`;
    expect(extractFaqsFromBody(body)).toEqual([
      { question: '첫 질문?', answer: '첫 답변.' },
      { question: '둘째 질문?', answer: '둘째 답변.' },
    ]);
  });

  it('collapses multi-line answers until the next Q / heading / hr', () => {
    const body = `**Q. 멀티라인 답변?**
A. 첫 줄
둘째 줄
셋째 줄.

**Q. 두 번째?**
A. 짧음.

---
꼬리말`;
    expect(extractFaqsFromBody(body)).toEqual([
      { question: '멀티라인 답변?', answer: '첫 줄 둘째 줄 셋째 줄.' },
      { question: '두 번째?', answer: '짧음.' },
    ]);
  });

  it('accepts "Q:" and "질문." prefixes', () => {
    const body = `**Q: 콜론 표기?**
A: 가능합니다.

**질문. 한글 프리픽스?**
A. 네, 가능합니다.`;
    expect(extractFaqsFromBody(body)).toEqual([
      { question: '콜론 표기?', answer: '가능합니다.' },
      { question: '한글 프리픽스?', answer: '네, 가능합니다.' },
    ]);
  });

  it('stops on headings so post-FAQ content is not absorbed', () => {
    const body = `**Q. 끝 질문?**
A. 끝 답변.

## 다른 섹션
이 텍스트는 답변에 들어가면 안 됩니다.`;
    expect(extractFaqsFromBody(body)).toEqual([{ question: '끝 질문?', answer: '끝 답변.' }]);
  });

  it('skips entries with empty answers', () => {
    const body = `**Q. 빈 답변?**

**Q. 제대로 된 답변?**
A. 있음.`;
    expect(extractFaqsFromBody(body)).toEqual([{ question: '제대로 된 답변?', answer: '있음.' }]);
  });
});
