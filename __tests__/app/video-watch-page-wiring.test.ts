import { readFileSync } from 'node:fs';
import path from 'node:path';

const WATCH_PAGE_PATH = path.join(
  process.cwd(),
  'app',
  '[locale]',
  'archive',
  '2023',
  'videos',
  '[youtubeId]',
  'page.tsx'
);

describe('video watch page wiring', () => {
  const source = readFileSync(WATCH_PAGE_PATH, 'utf8');

  it('should generate VideoObject schema using watch page canonical URL', () => {
    expect(source).toContain('const videoSchema = generateVideoSchema({');
    expect(source).toContain('watchPageUrl: pageUrl');
    expect(source).toContain('<JsonLdScript data={[breadcrumbSchema, videoSchema]} />');
  });

  it('should render visible playable video as primary content', () => {
    expect(source).toContain('<VideoPlayer id={video.youtube_id} title={localizedTitle} />');
    expect(source).toContain("title={isEnglish ? 'Video Watch Page' : '영상 시청 페이지'}");
  });
});
