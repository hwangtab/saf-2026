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

  // 2026-06-12 감사로 정책 전환: 목록 페이지 query(page/q/category/price 등)는 기능적
  // URL 상태이므로 308로 제거하지 않는다 (페이지네이션 크롤·필터 공유·북마크 회귀 방지).
  // 작품 상세만 비추적 query를 정규화하되 추적 파라미터(utm_* 등)는 보존한다.
  it('proxy는 목록 query를 보존하고 작품 상세의 비보존 query만 308 정규화한다', () => {
    expect(proxySource).not.toContain('SEARCHLESS_LIST_QUERY_PATHS');
    expect(proxySource).not.toContain('ARTWORKS_LIST_PATH');
    expect(proxySource).toContain('ARTWORK_DETAIL_PATH');
    expect(proxySource).toMatch(/ARTWORK_DETAIL_PATH\.test\(pathname\)/);
    expect(proxySource).toMatch(/hasFunctionalParam/);
    // 추적 파라미터(utm 등)와 returnTo(특별전/컬렉션 복귀 기능)는 redirect 시에도 보존
    expect(proxySource).toMatch(/isTrackingParam\(key\) \|\| key === 'returnTo'/);
    expect(proxySource).toMatch(/if \(isPreservedParam\(key\)\) url\.searchParams\.append/);
  });

  it('proxy는 추적 파라미터(utm/fbclid/gclid)를 어떤 경로에서도 308로 제거하지 않는다', () => {
    expect(proxySource).toContain('isTrackingParam');
    expect(proxySource).not.toContain('hasTrackingSearchParam(searchParams)');
    // 추적 파라미터 단독 요청을 redirect하는 블록이 없어야 GA4 어트리뷰션이 보존된다
    expect(proxySource).not.toMatch(
      /hasTrackingSearchParam\(searchParams\)[\s\S]{0,120}NextResponse\.redirect/
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
