import {
  splitIntoThreadSegments,
  stripThreadDelimiters,
  THREADS_MAX_LEN,
} from '@/lib/social/thread-split';

describe('splitIntoThreadSegments', () => {
  it('짧은 글은 1개 세그먼트', () => {
    expect(splitIntoThreadSegments('안녕 스레드')).toEqual(['안녕 스레드']);
  });

  it('--- 구분자에서 수동 분할', () => {
    const text = '첫 글이야\n---\n둘째 글이야\n---\n셋째 글';
    expect(splitIntoThreadSegments(text)).toEqual(['첫 글이야', '둘째 글이야', '셋째 글']);
  });

  it('500자 초과면 문단 경계로 자동 분할되고 각 조각이 상한 이하', () => {
    const para = 'A'.repeat(300);
    const text = `${para}\n\n${para}\n\n${para}`; // 약 900자 + 구분
    const segs = splitIntoThreadSegments(text);
    expect(segs.length).toBeGreaterThan(1);
    for (const s of segs) expect(s.length).toBeLessThanOrEqual(THREADS_MAX_LEN);
  });

  it('한 문단이 상한보다 길면 더 잘게 쪼갬', () => {
    const long = 'B'.repeat(1200);
    const segs = splitIntoThreadSegments(long);
    expect(segs.length).toBeGreaterThanOrEqual(3);
    for (const s of segs) expect(s.length).toBeLessThanOrEqual(THREADS_MAX_LEN);
  });

  it('수동 분할 + 자동 분할 혼합: --- 우선 분리 후 긴 조각만 추가 분할', () => {
    const text = `짧은 인트로\n---\n${'C'.repeat(800)}`;
    const segs = splitIntoThreadSegments(text);
    expect(segs[0]).toBe('짧은 인트로');
    expect(segs.length).toBeGreaterThanOrEqual(3); // 인트로 + 800자 → 2조각 이상
    for (const s of segs) expect(s.length).toBeLessThanOrEqual(THREADS_MAX_LEN);
  });

  it('빈 입력은 빈 배열', () => {
    expect(splitIntoThreadSegments('   ')).toEqual([]);
  });
});

describe('stripThreadDelimiters', () => {
  it('--- 구분자 줄을 빈 줄로 정리(단일 게시용)', () => {
    expect(stripThreadDelimiters('가\n---\n나')).toBe('가\n\n나');
  });

  it('구분자 없으면 trim만', () => {
    expect(stripThreadDelimiters('  내용  ')).toBe('내용');
  });
});
