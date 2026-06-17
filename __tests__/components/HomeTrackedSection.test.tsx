import { render, screen, fireEvent } from '@testing-library/react';
import HomeTrackedSection from '@/components/features/HomeTrackedSection';

const mockTrack = jest.fn();
jest.mock('@/lib/analytics/track', () => ({
  trackEvent: (...args: unknown[]) => mockTrack(...args),
}));

class IO {
  cb: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
  }
  observe() {
    this.cb(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  mockTrack.mockClear();
  window.sessionStorage.clear();
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
});

describe('HomeTrackedSection', () => {
  it('교차 시 home_section_view를 section 파라미터와 함께 1회 emit', () => {
    render(
      <HomeTrackedSection section="master">
        <a href="/artworks/123">art</a>
      </HomeTrackedSection>
    );
    const viewCalls = mockTrack.mock.calls.filter((c) => c[0] === 'home_section_view');
    expect(viewCalls).toHaveLength(1);
    expect(viewCalls[0][1]).toMatchObject({ section: 'master' });
  });

  it('같은 세션에서 같은 섹션의 section_view는 중복 emit하지 않음', () => {
    const { unmount } = render(
      <HomeTrackedSection section="master">
        <a href="/artworks/1">a</a>
      </HomeTrackedSection>
    );
    unmount();
    render(
      <HomeTrackedSection section="master">
        <a href="/artworks/1">a</a>
      </HomeTrackedSection>
    );
    expect(mockTrack.mock.calls.filter((c) => c[0] === 'home_section_view')).toHaveLength(1);
  });

  it('작품 링크 클릭 시 home_artwork_card_click(artwork_id, position) emit', () => {
    render(
      <HomeTrackedSection section="painting">
        <a href="/ko/artworks/777" data-testid="card">
          work
        </a>
        <a href="/ko/artworks/888">work2</a>
      </HomeTrackedSection>
    );
    fireEvent.click(screen.getByTestId('card'));
    const click = mockTrack.mock.calls.find((c) => c[0] === 'home_artwork_card_click');
    expect(click).toBeTruthy();
    expect(click![1]).toMatchObject({ section: 'painting', artwork_id: '777', position: 0 });
  });

  it('section="hero"에서 링크 클릭 시 hero_cta_click emit', () => {
    render(
      <HomeTrackedSection section="hero">
        <a href="/artworks" data-testid="hero">
          go
        </a>
      </HomeTrackedSection>
    );
    fireEvent.click(screen.getByTestId('hero'));
    expect(mockTrack.mock.calls.find((c) => c[0] === 'hero_cta_click')).toBeTruthy();
  });

  it('비-작품 링크(전체보기 등) 클릭 시 home_cta_click(destination) emit', () => {
    render(
      <HomeTrackedSection section="master">
        <a href="/artworks" data-testid="viewall">
          전체
        </a>
      </HomeTrackedSection>
    );
    fireEvent.click(screen.getByTestId('viewall'));
    const c = mockTrack.mock.calls.find((x) => x[0] === 'home_cta_click');
    expect(c).toBeTruthy();
    expect(c![1]).toMatchObject({ section: 'master', destination: '/artworks' });
  });
});
