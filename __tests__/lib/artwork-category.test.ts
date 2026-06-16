import { execSync } from 'child_process';
import {
  CATEGORY_EN_MAP,
  CATEGORY_SLUG_MAP,
  categorySlug,
  categoryFromSlug,
} from '@/lib/artwork-category';

describe('category slug 매핑', () => {
  it('CATEGORY_EN_MAP의 모든 한글 카테고리에 slug가 있다', () => {
    for (const ko of Object.keys(CATEGORY_EN_MAP)) {
      expect(typeof CATEGORY_SLUG_MAP[ko]).toBe('string');
      expect(CATEGORY_SLUG_MAP[ko].length).toBeGreaterThan(0);
    }
  });

  it('slug는 모두 ASCII(simpleParamValueRegex 통과)라 btoa를 안 탄다', () => {
    const regex = /^[a-zA-Z0-9\-_@]+$/; // Next encodeToFilesystemAndURLSafeString과 동일
    for (const slug of Object.values(CATEGORY_SLUG_MAP)) {
      expect(slug).toMatch(regex);
    }
  });

  it('slug는 유일하다 (충돌 없음)', () => {
    const slugs = Object.values(CATEGORY_SLUG_MAP);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('round-trip: categoryFromSlug(categorySlug(ko)) === ko', () => {
    for (const ko of Object.keys(CATEGORY_EN_MAP)) {
      expect(categoryFromSlug(categorySlug(ko))).toBe(ko);
    }
  });

  it('categoryFromSlug는 미지의 slug에 undefined를 반환', () => {
    expect(categoryFromSlug('nonexistent-slug')).toBeUndefined();
  });

  it('categorySlug는 매핑 없는 값에 입력을 그대로 반환(방어)', () => {
    expect(categorySlug('unknowncat')).toBe('unknowncat');
  });
});

describe('카테고리 링크 회귀 가드', () => {
  it('소스에 한글 인코딩(%ED..)·encodeURIComponent(category)·raw 한글 카테고리 URL이 없다', () => {
    // [category] 라우트 파일 자체는 제외(역매핑 처리). emitter만 검사.
    // 3가지 패턴 차단: ${encodeURIComponent(..) / %인코딩 / raw 한글 리터럴([가-힣]).
    const cmd =
      `grep -rn "artworks/category/\\\${encodeURIComponent\\|artworks/category/%\\|artworks/category/[가-힣]" ` +
      `app components --include="*.ts" --include="*.tsx" | grep -v "category/\\[category\\]" || true`;
    const out = execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' }).trim();
    expect(out).toBe('');
  });
});
