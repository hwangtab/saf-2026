import { render, screen } from '@testing-library/react';
import ArtistNoticeCard from '@/components/features/ArtistNoticeCard';

describe('ArtistNoticeCard', () => {
  it('renders the label and the message', () => {
    render(
      <ArtistNoticeCard type="info" message="5월 1일부터 가격이 인상될 예정입니다." label="공지" />
    );
    expect(screen.getByText('공지')).toBeInTheDocument();
    expect(screen.getByText('5월 1일부터 가격이 인상될 예정입니다.')).toBeInTheDocument();
  });

  it('exposes role="note" for assistive tech', () => {
    const { container } = render(<ArtistNoticeCard type="info" message="hello" label="Notice" />);
    expect(container.querySelector('[role="note"]')).not.toBeNull();
  });

  it('applies primary border for type=info', () => {
    const { container } = render(<ArtistNoticeCard type="info" message="m" label="공지" />);
    const aside = container.querySelector('aside');
    expect(aside?.className).toMatch(/border-primary/);
    expect(aside?.className).not.toMatch(/border-sun-strong/);
  });

  it('applies sun border for type=warning', () => {
    const { container } = render(<ArtistNoticeCard type="warning" message="m" label="주의" />);
    const aside = container.querySelector('aside');
    expect(aside?.className).toMatch(/border-sun-strong/);
  });

  it('applies danger border for type=urgent', () => {
    const { container } = render(<ArtistNoticeCard type="urgent" message="m" label="중요" />);
    const aside = container.querySelector('aside');
    expect(aside?.className).toMatch(/border-danger-a11y/);
  });

  it('uses canvas-soft background (Gallery White Cube — chrome 무채색)', () => {
    const { container } = render(<ArtistNoticeCard type="info" message="m" label="공지" />);
    expect(container.querySelector('aside')?.className).toMatch(/bg-canvas-soft/);
  });

  it('does not include disallowed Tailwind palette classes', () => {
    const { container } = render(<ArtistNoticeCard type="warning" message="m" label="주의" />);
    const html = container.innerHTML;
    // DESIGN.md §7 — slate/indigo/blue/red/amber 등 기본 팔레트 사용 금지
    expect(html).not.toMatch(/\bslate-\d/);
    expect(html).not.toMatch(/\bindigo-\d/);
    expect(html).not.toMatch(/\bbg-red-\d/);
    expect(html).not.toMatch(/\bbg-amber-\d/);
  });

  it('forwards extra className', () => {
    const { container } = render(
      <ArtistNoticeCard type="info" message="m" label="공지" className="mt-10" />
    );
    expect(container.querySelector('aside')?.className).toMatch(/mt-10/);
  });
});
