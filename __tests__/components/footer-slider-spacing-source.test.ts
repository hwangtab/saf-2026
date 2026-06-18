import { readFileSync } from 'node:fs';
import path from 'node:path';

const FOOTER_SLIDER_WRAPPER_PATH = path.join(
  process.cwd(),
  'components',
  'common',
  'FooterSliderWrapper.tsx'
);
const FOOTER_SLIDER_PATH = path.join(process.cwd(), 'components', 'common', 'FooterSlider.tsx');

describe('footer slider spacing source guards', () => {
  it('does not keep a permanent empty footer slider placeholder', () => {
    const wrapper = readFileSync(FOOTER_SLIDER_WRAPPER_PATH, 'utf8');

    expect(wrapper).not.toContain('min-h-[460px]');
    expect(wrapper).toContain('loading: () => null');
    expect(wrapper).toContain('return <FooterSlider />;');
  });

  it('reserves slider height only while artwork data is loading', () => {
    const slider = readFileSync(FOOTER_SLIDER_PATH, 'utf8');

    expect(slider).toContain('if (!showSlider) return null;');
    expect(slider).toContain(
      'return isLoading ? <div className="h-[460px] animate-pulse opacity-50" aria-hidden /> : null;'
    );
  });
});
