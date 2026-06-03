import { render, screen, fireEvent, act } from '@testing-library/react';
import { BroadcastForm } from '@/app/(portal)/admin/email/_components/BroadcastForm';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));
jest.mock('@/app/actions/admin-broadcast', () => ({
  enqueueBroadcast: jest.fn(),
  enqueueIndividualBroadcast: jest.fn(),
  sendTestEmail: jest.fn(),
  previewAudience: jest.fn(async () => ({ total: 0, breakdown: {} })),
  getPetitionOptions: jest.fn(async () => [{ slug: 'oh-yoon', title: '오윤 청원' }]),
  searchBroadcastArtworks: jest.fn(async () => ({ results: [], total: 0 })),
}));
jest.mock('@/app/actions/admin-contact-search', () => ({
  searchContacts: jest.fn(async () => ({ results: [], truncated: false })),
}));

describe('BroadcastForm 템플릿', () => {
  it('템플릿을 선택하면 제목·본문이 채워진다', async () => {
    await act(async () => {
      render(<BroadcastForm />);
    });
    const select = screen.getByLabelText('템플릿 선택');
    fireEvent.change(select, { target: { value: 'customer-new-artwork' } });
    const subject = screen.getByLabelText(/제목/) as HTMLInputElement;
    expect(subject.value).toContain('새로운 작품');
  });

  it('받는 사람 중심 문구와 발송 버튼을 표시한다', async () => {
    await act(async () => {
      render(<BroadcastForm />);
    });

    expect(screen.getByText('받는 사람')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '발송하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '나에게 테스트 보내기' })).toBeInTheDocument();
    expect(screen.queryByText('검색 발송')).not.toBeInTheDocument();
    expect(screen.queryByText('세그먼트 발송')).not.toBeInTheDocument();
    expect(screen.queryByText('발송 예약')).not.toBeInTheDocument();
    expect(screen.queryByText(/대기열/)).not.toBeInTheDocument();
  });

  it('명단에 없는 이메일을 직접 추가할 수 있다', async () => {
    await act(async () => {
      render(<BroadcastForm />);
    });

    fireEvent.click(screen.getByRole('button', { name: '개별로 추가' }));
    fireEvent.change(screen.getByLabelText('이메일 직접 추가'), {
      target: { value: 'OUTSIDE@Example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '입력한 이메일 추가' }));

    expect(screen.getByText('outside@example.com')).toBeInTheDocument();
  });
});
