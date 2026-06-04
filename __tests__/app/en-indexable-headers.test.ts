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
});
