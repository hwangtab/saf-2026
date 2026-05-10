import { extractFaqFromBody, generateFaqPageSchema } from '../../lib/markdown-faq';

describe('extractFaqFromBody', () => {
  it('빈 입력은 빈 배열 반환', () => {
    expect(extractFaqFromBody(null)).toEqual([]);
    expect(extractFaqFromBody(undefined)).toEqual([]);
    expect(extractFaqFromBody('')).toEqual([]);
  });

  it('FAQ 섹션이 없으면 빈 배열', () => {
    const body = '# 제목\n\n본문 텍스트.\n\n## 다른 섹션\n\n내용.';
    expect(extractFaqFromBody(body)).toEqual([]);
  });

  it('한국어 FAQ 섹션에서 Q/A 페어 추출', () => {
    const body = `# 제목

본문.

## 자주 묻는 질문

**Q. 첫 번째 질문인가요?**
A. 첫 번째 답변입니다.

**Q. 두 번째 질문?**
A. 두 번째 답변.

---

마무리.`;
    expect(extractFaqFromBody(body)).toEqual([
      { question: '첫 번째 질문인가요?', answer: '첫 번째 답변입니다.' },
      { question: '두 번째 질문?', answer: '두 번째 답변.' },
    ]);
  });

  it('영문 FAQ 섹션에서 Q/A 페어 추출', () => {
    const body = `# Title

Body.

## Frequently asked questions

**Q. First question?**
A. First answer.

**Q. Second question?**
A. Second answer with a [link](/path).

---`;
    expect(extractFaqFromBody(body)).toEqual([
      { question: 'First question?', answer: 'First answer.' },
      { question: 'Second question?', answer: 'Second answer with a link.' },
    ]);
  });

  it('Q/A에서 마크다운 링크·강조 제거', () => {
    const body = `## 자주 묻는 질문

**Q. **강조** 단어가 있는 질문?**
A. [링크](/path)와 \`code\`가 포함된 답변.`;
    const result = extractFaqFromBody(body);
    expect(result[0].question).toBe('강조 단어가 있는 질문?');
    expect(result[0].answer).toBe('링크와 code가 포함된 답변.');
  });

  it('FAQ 섹션 후 다음 ## 헤딩 만나면 종료', () => {
    const body = `## 자주 묻는 질문

**Q. 질문?**
A. 답변.

## 다른 섹션

여기 내용은 무시되어야 함.

**Q. 무시되는 질문?**
A. 무시되는 답변.`;
    expect(extractFaqFromBody(body)).toEqual([{ question: '질문?', answer: '답변.' }]);
  });

  it('여러 줄 답변 처리', () => {
    const body = `## 자주 묻는 질문

**Q. 긴 답변 질문?**
A. 첫 번째 줄.
두 번째 줄.
세 번째 줄.

**Q. 다음 질문?**
A. 짧은 답변.`;
    const result = extractFaqFromBody(body);
    expect(result).toHaveLength(2);
    expect(result[0].answer).toBe('첫 번째 줄. 두 번째 줄. 세 번째 줄.');
  });
});

describe('generateFaqPageSchema', () => {
  it('빈 FAQ 배열은 null 반환', () => {
    expect(generateFaqPageSchema([], { url: 'https://x.com', locale: 'ko' })).toBeNull();
  });

  it('FAQ 페어로 schema.org FAQPage JSON-LD 생성', () => {
    const schema = generateFaqPageSchema(
      [
        { question: '질문 1?', answer: '답변 1.' },
        { question: '질문 2?', answer: '답변 2.' },
      ],
      { url: 'https://www.saf2026.com/stories/test', locale: 'ko' }
    );
    expect(schema).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://www.saf2026.com/stories/test#faq',
      inLanguage: 'ko-KR',
      mainEntity: [
        {
          '@type': 'Question',
          name: '질문 1?',
          acceptedAnswer: { '@type': 'Answer', text: '답변 1.' },
        },
        {
          '@type': 'Question',
          name: '질문 2?',
          acceptedAnswer: { '@type': 'Answer', text: '답변 2.' },
        },
      ],
    });
  });

  it('영문 locale은 inLanguage en-US', () => {
    const schema = generateFaqPageSchema([{ question: 'Q?', answer: 'A.' }], {
      url: 'https://x.com',
      locale: 'en',
    });
    expect((schema as { inLanguage: string }).inLanguage).toBe('en-US');
  });
});
