import { render, screen } from '@testing-library/react';

import { EmailPreviewCard } from '@/app/(portal)/admin/email/_components/EmailPreviewCard';

describe('EmailPreviewCard', () => {
  it('renders the same sanitized spacing used by outgoing rich emails', () => {
    const { container } = render(
      <EmailPreviewCard
        subject="테스트"
        bodyHtml="<p>첫 문단</p><p></p><p>다음 문단</p>"
        isAdvertisement={false}
      />
    );

    expect(screen.getByText('첫 문단')).toBeInTheDocument();
    expect(screen.getByText('다음 문단')).toBeInTheDocument();
    expect(container.querySelector('.rich-email-preview')?.innerHTML).toContain('&nbsp;');
    expect(container.querySelector('.rich-email-preview')?.innerHTML).toContain('margin:0 0 14px');
  });
});
