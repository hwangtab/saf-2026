import { readFileSync } from 'node:fs';
import path from 'node:path';

const NEXT_CONFIG_PATH = path.join(process.cwd(), 'next.config.js');
const EN_INDEXABLE_PATH = path.join(process.cwd(), 'lib', 'en-indexable.ts');
const ROBOTS_PATH = path.join(process.cwd(), 'app', 'robots.ts');

describe('EN indexable page headers', () => {
  const nextConfigSource = readFileSync(NEXT_CONFIG_PATH, 'utf8');
  const enIndexableSource = readFileSync(EN_INDEXABLE_PATH, 'utf8');
  const robotsSource = readFileSync(ROBOTS_PATH, 'utf8');

  it('keeps /en/artworks and /en/news indexable while noindexing their child routes', () => {
    expect(enIndexableSource).toMatch(/'\/artworks'/);
    expect(enIndexableSource).toMatch(/'\/news'/);

    expect(nextConfigSource).not.toContain("source: '/en/artworks/:path*'");
    expect(nextConfigSource).not.toContain("source: '/en/news/:path*'");
    expect(nextConfigSource).toContain("source: '/en/artworks/:path+'");
    expect(nextConfigSource).toContain("source: '/en/news/:path+'");
  });

  it('allows crawlers to see noindex headers on EN artwork and news child routes', () => {
    expect(robotsSource).not.toContain("'/en/artworks/'");
    expect(robotsSource).not.toContain("'/en/news/'");

    expect(nextConfigSource).toContain("source: '/en/artworks/:path+'");
    expect(nextConfigSource).toContain("source: '/en/news/:path+'");
    expect(nextConfigSource).toContain("{ key: 'X-Robots-Tag', value: 'noindex, follow' }");
  });

  it('does not block public content query URLs that are canonicalized by proxy redirects', () => {
    expect(robotsSource).not.toContain("'/artworks?*'");
    expect(robotsSource).not.toContain("'/stories?*'");
    expect(robotsSource).not.toContain("'/news?*'");
    expect(robotsSource).not.toContain("'/artworks/*?*'");
    expect(robotsSource).not.toContain("'/*?*utm_*'");
    expect(robotsSource).not.toContain("'/*?*fbclid=*'");
    expect(robotsSource).not.toContain("'/*?*gclid=*'");
    expect(robotsSource).not.toContain("'/*?*msclkid=*'");
  });

  // EN 특별전(오윤·박생광)은 EN_INDEXABLE_PAGES 등재 + sitemap bilingual 발행 대상.
  // blanket '/en/artworks/:path+' noindex 헤더가 이 두 경로를 덮으면 "sitemap 제출 +
  // noindex 헤더" 신호 충돌로 색인이 영구 차단된다 (2026-06-12 감사 회귀).
  // Next.js headers는 동일 key 매칭 시 마지막 규칙이 우선 — override는 blanket 뒤에 있어야 함.
  it('re-enables indexing for EN master-artist special pages after the blanket noindex rule', () => {
    expect(enIndexableSource).toContain("'/artworks/artist/%EC%98%A4%EC%9C%A4'");
    expect(enIndexableSource).toContain("'/artworks/artist/%EB%B0%95%EC%83%9D%EA%B4%91'");

    const blanketIdx = nextConfigSource.indexOf("source: '/en/artworks/:path+'");
    // 대문자/소문자 percent-encoding + 디코딩 표기 모두 매칭하는 override 규칙
    const overrideIdx = nextConfigSource.indexOf(
      "'/en/artworks/artist/:name(%EC%98%A4%EC%9C%A4|%EB%B0%95%EC%83%9D%EA%B4%91|%ec%98%a4%ec%9c%a4|%eb%b0%95%ec%83%9d%ea%b4%91|오윤|박생광)'"
    );
    expect(blanketIdx).toBeGreaterThan(-1);
    expect(overrideIdx).toBeGreaterThan(blanketIdx);
    expect(nextConfigSource).toContain("{ key: 'X-Robots-Tag', value: 'index, follow' }");
  });
});
