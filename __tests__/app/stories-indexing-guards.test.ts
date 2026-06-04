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

  it('proxy는 공개 작품 목록/상세 쿼리 URL을 searchless canonical URL로 308 리다이렉트', () => {
    expect(proxySource).toContain('ARTWORKS_LIST_PATH');
    expect(proxySource).toContain('ARTWORK_DETAIL_PATH');
    expect(proxySource).toContain('canonicalizeSearchlessUrl');
    expect(proxySource).toMatch(
      /SEARCHLESS_LIST_QUERY_PATHS\s*=\s*\[[^\]]*ARTWORKS_LIST_PATH[^\]]*\]/
    );
    expect(proxySource).toMatch(/ARTWORK_DETAIL_PATH\.test\(pathname\)/);
    expect(proxySource).toMatch(/searchParams\.size\s*>\s*0/);
    expect(proxySource).toMatch(
      /NextResponse\.redirect\(canonicalizeSearchlessUrl\(pathname, request\.url\), 308\)/
    );
  });

  it('proxy는 공개 콘텐츠 목록 쿼리 URL을 robots 차단 대신 308 정규화한다', () => {
    expect(proxySource).toContain('NEWS_LIST_PATH');
    expect(proxySource).toContain('SEARCHLESS_LIST_QUERY_PATHS');
    expect(proxySource).toContain('hasTrackingSearchParam');
    expect(proxySource).toMatch(
      /SEARCHLESS_LIST_QUERY_PATHS\.some\(\(pattern\) => pattern\.test\(pathname\)\)/
    );
    expect(proxySource).toMatch(
      /NextResponse\.redirect\(canonicalizeSearchlessUrl\(pathname, request\.url\), 308\)/
    );
  });

  it('valid 카테고리 목록이 STORY_CATEGORIES와 일치', () => {
    // proxy의 VALID_STORY_CATEGORIES는 types/index.ts의 STORY_CATEGORIES와 동기화되어야 함.
    // (정적 라우트 /stories/category/[category]가 같은 목록으로 generateStaticParams 함)
    expect(proxySource).toMatch(/'artist-story'/);
    expect(proxySource).toMatch(/'buying-guide'/);
    expect(proxySource).toMatch(/'art-knowledge'/);
  });
});
