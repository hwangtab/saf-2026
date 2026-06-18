import { readFileSync } from 'node:fs';
import path from 'node:path';

const ARTWORK_DETAIL_PAGE_PATH = path.join(
  process.cwd(),
  'app',
  '[locale]',
  'artworks',
  '[id]',
  'page.tsx'
);
const PRIDE_BOX_PATH = path.join(process.cwd(), 'components', 'features', 'PrideBox.tsx');

describe('artwork detail bottom spacing source guards', () => {
  it('keeps artwork detail footer lead-in compact', () => {
    const source = readFileSync(ARTWORK_DETAIL_PAGE_PATH, 'utf8');

    expect(source).toContain(
      'className="pb-8 md:pb-12 pt-[calc(4rem+env(safe-area-inset-top,0px))]"'
    );
    expect(source).not.toContain(
      'className="pb-24 md:pb-32 pt-[calc(4rem+env(safe-area-inset-top,0px))]"'
    );
  });

  it('does not let PrideBox add external bottom margin at the page end', () => {
    const source = readFileSync(PRIDE_BOX_PATH, 'utf8');
    const rootSectionClass = source.match(
      /<section\s+aria-labelledby="pride-box-heading"\s+className="([^"]+)"/
    )?.[1];

    expect(rootSectionClass).toBeDefined();
    expect(rootSectionClass).toContain('mt-16 mx-auto max-w-3xl');
    expect(rootSectionClass).not.toContain('mb-12');
    expect(rootSectionClass).not.toMatch(/\bmb-\d+\b/);
  });
});
