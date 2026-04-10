import { readFileSync } from 'node:fs';
import path from 'node:path';

const STORIES_PAGE_PATH = path.join(process.cwd(), 'app', '[locale]', 'stories', 'page.tsx');

describe('stories indexing guards', () => {
  const source = readFileSync(STORIES_PAGE_PATH, 'utf8');

  it('should add noindex robots when query params exist', () => {
    expect(source).toContain(
      'const hasQueryParams = Object.values(params).some((value) => Boolean(value));'
    );
    expect(source).toContain('robots: {');
    expect(source).toContain('index: false');
    expect(source).toContain('follow: true');
  });

  it('should validate story category before applying filters', () => {
    expect(source).toContain(
      'const toValidStoryCategory = (value?: string): StoryCategory | null => {'
    );
    expect(source).toContain('STORY_CATEGORIES.includes(value as StoryCategory)');
    expect(source).toContain('const category = toValidStoryCategory(params.category);');
  });
});
