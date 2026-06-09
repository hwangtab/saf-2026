import { render, screen, fireEvent, act } from '@testing-library/react';
import { BroadcastComposer } from '@/app/(portal)/admin/email/_components/BroadcastComposer';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));
jest.mock('@/app/actions/admin-broadcast', () => ({
  enqueueBroadcast: jest.fn(),
  enqueueIndividualBroadcast: jest.fn(),
  sendTestEmail: jest.fn(),
  uploadEmailBroadcastImage: jest.fn(),
  previewAudience: jest.fn(async () => ({ total: 0, breakdown: {} })),
  getPetitionOptions: jest.fn(async () => [
    { slug: 'oh-yoon', title: '오윤 청원', isActive: true },
  ]),
  searchBroadcastArtworks: jest.fn(async () => ({ results: [], total: 0 })),
}));
jest.mock('@/app/actions/admin-contact-search', () => ({
  searchContacts: jest.fn(async () => ({ results: [], truncated: false })),
}));
jest.mock('@/app/(portal)/admin/email/_components/RichEmailEditor', () => ({
  RichEmailEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (next: { html: string; text: string }) => void;
  }) => (
    <textarea
      aria-label="본문"
      value={value}
      onChange={(event) =>
        onChange({ html: event.currentTarget.value, text: event.currentTarget.value })
      }
    />
  ),
}));

async function renderComposer() {
  await act(async () => {
    render(<BroadcastComposer />);
  });
}

describe('BroadcastComposer', () => {
  it('받는 사람 유형·발송/테스트 버튼·요약을 표시한다', async () => {
    await renderComposer();

    expect(screen.getByRole('heading', { name: '받는 사람' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /작가·출품자/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /고객 마케팅/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '발송하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /나에게 테스트 보내기/ })).toBeInTheDocument();
    // 폐기된 옛 문구가 남지 않음
    expect(screen.queryByText('세그먼트 발송')).not.toBeInTheDocument();
    expect(screen.queryByText('검색 발송')).not.toBeInTheDocument();
  });

  it('기본은 정보성, 고객 마케팅 선택 시 (광고)로 표시된다', async () => {
    await renderComposer();

    // 기본 member → 정보성 (카드 + 요약 모두 표기)
    expect(screen.getAllByText('정보성').length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /고객 마케팅/ }));
    });
    // 요약 카드에 (광고) 배지 노출
    expect(screen.getAllByText(/\(광고\)/).length).toBeGreaterThan(0);
  });

  it('템플릿을 선택하면 제목이 채워진다', async () => {
    await renderComposer();

    const select = screen.getByLabelText(/템플릿으로 시작/);
    await act(async () => {
      fireEvent.change(select, { target: { value: 'member-exhibition-schedule' } });
    });
    const subject = screen.getByLabelText('제목') as HTMLInputElement;
    expect(subject.value).toContain('전시 일정');
  });

  it('미리보기에서 작성하지 않은 가짜 수신자 인사말을 넣지 않는다', async () => {
    await renderComposer();

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '테스트 해봐요' } });
    fireEvent.change(screen.getByLabelText('본문'), { target: { value: '<p>보내봅니다</p>' } });

    expect(screen.getByText('보내봅니다')).toBeInTheDocument();
    expect(screen.queryByText('○○○님,')).not.toBeInTheDocument();
  });

  it('직접 지정에서 명단에 없는 이메일을 추가할 수 있다', async () => {
    await renderComposer();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /직접 지정·검색/ }));
    });
    fireEvent.change(screen.getByLabelText('이메일 직접 추가'), {
      target: { value: 'OUTSIDE@Example.com' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '입력한 이메일 추가' }));
    });

    expect(screen.getByText('outside@example.com')).toBeInTheDocument();
    expect(screen.getByText('선택된 받는 사람 1명')).toBeInTheDocument();
  });
});
