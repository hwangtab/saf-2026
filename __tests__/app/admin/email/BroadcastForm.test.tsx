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
});
