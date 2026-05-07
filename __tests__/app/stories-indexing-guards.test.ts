import { readFileSync } from 'node:fs';
import path from 'node:path';

const STORIES_PAGE_PATH = path.join(process.cwd(), 'app', '[locale]', 'stories', 'page.tsx');
const PROXY_PATH = path.join(process.cwd(), 'proxy.ts');

describe('stories indexing guards', () => {
  const pageSource = readFileSync(STORIES_PAGE_PATH, 'utf8');
  const proxySource = readFileSync(PROXY_PATH, 'utf8');

  it('stories 페이지는 정적 렌더링 (force-static, no searchParams 읽기)', () => {
    expect(pageSource).toContain("export const dynamic = 'force-static'");
    expect(pageSource).not.toMatch(/await\s+searchParams/);
    expect(pageSource).not.toMatch(/searchParams:\s*Promise/);
  });

  it('proxy는 /stories?category= URL을 정적 라우트로 308 리다이렉트', () => {
    expect(proxySource).toContain('STORIES_LIST_PATH');
    expect(proxySource).toContain('VALID_STORY_CATEGORIES');
    expect(proxySource).toMatch(/searchParams\.has\(['"]category['"]\)/);
    expect(proxySource).toMatch(/stories\/category\/\$\{category\}/);
    expect(proxySource).toMatch(/308/);
  });

  it('valid 카테고리 목록이 STORY_CATEGORIES와 일치', () => {
    // proxy의 VALID_STORY_CATEGORIES는 types/index.ts의 STORY_CATEGORIES와 동기화되어야 함.
    // (정적 라우트 /stories/category/[category]가 같은 목록으로 generateStaticParams 함)
    expect(proxySource).toMatch(/'artist-story'/);
    expect(proxySource).toMatch(/'buying-guide'/);
    expect(proxySource).toMatch(/'art-knowledge'/);
  });
});
